import assert from "node:assert/strict"
import test from "node:test"

import {
  appendAttachments,
  createAttachment,
  resetAttachmentIdCounterForTests,
} from "./prompt-attachments"
import {
  addComposerDraftFiles,
  emptyComposerDraft,
  removeComposerDraftAttachment,
  setComposerDraftPrimary,
} from "./composer-draft"
import {
  persistableUserMessage,
} from "./builder-attachments"
import { reconstructLayoutFromReference } from "./reference-layout"
import {
  attachmentStripPreferPrimary,
  fileForPrimaryAnalysis,
  primaryAfterAppend,
  primaryAfterRemove,
  primaryReferenceFromSubmitted,
  primaryReferencePreviewUrl,
  resolvePrimaryReferenceId,
  setPrimaryReferenceId,
  submittedTurnPreservesPrimary,
} from "./reference-roles"
import { documentVersionSnapshotOmitsEphemeral } from "./document-versions"

function png(name: string) {
  return new File([name], name, { type: "image/png" })
}

function pdf(name: string) {
  return new File([name], name, { type: "application/pdf" })
}

test("first eligible image becomes Primary", () => {
  resetAttachmentIdCounterForTests()
  const next = appendAttachments([], [png("A.png")]).next
  assert.equal(resolvePrimaryReferenceId(next, null), "att-1")
})

test("later images do not steal Primary", () => {
  resetAttachmentIdCounterForTests()
  let attachments = appendAttachments([], [png("A.png")]).next
  let primary = resolvePrimaryReferenceId(attachments, null)
  attachments = appendAttachments(attachments, [png("B.png")]).next
  primary = primaryAfterAppend(primary, attachments)
  assert.equal(primary, "att-1")
  assert.equal(attachments[1]?.id, "att-2")
})

test("explicit Primary change is not encoded by array position", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [png("A.png"), png("B.png")]).next
  const primary = setPrimaryReferenceId(attachments, "att-2")
  assert.equal(primary, "att-2")
  assert.equal(attachments[0]?.id, "att-1")
  assert.equal(fileForPrimaryAnalysis(attachments, primary)?.name, "B.png")
})

test("Primary removal promotes the earliest remaining image", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [
    png("A.png"),
    png("B.png"),
    png("C.png"),
  ]).next
  const withoutB = attachments.filter((attachment) => attachment.id !== "att-2")
  assert.equal(primaryAfterRemove("att-2", withoutB), "att-1")
})

test("PDF cannot become visual Primary", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [pdf("brief.pdf")]).next
  assert.equal(resolvePrimaryReferenceId(attachments, attachments[0]?.id), null)
  assert.equal(attachments[0]?.usedForGeneration, false)
})

test("PDF before image: the image becomes Primary", () => {
  resetAttachmentIdCounterForTests()
  let attachments = appendAttachments([], [pdf("brief.pdf")]).next
  let primary = resolvePrimaryReferenceId(attachments, null)
  assert.equal(primary, null)
  attachments = appendAttachments(attachments, [png("shot.png")]).next
  primary = primaryAfterAppend(primary, attachments)
  assert.equal(primary, "att-2")
  assert.equal(attachments[0]?.name, "brief.pdf")
})

test("submitted request preserves primaryReferenceId after composer clear", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [png("A.png"), png("B.png")]).next
  const primary = setPrimaryReferenceId(attachments, "att-2")
  const message = {
    id: "u1",
    role: "user" as const,
    text: "Recreate this.",
    references: attachments
      .filter((attachment) => attachment.usedForGeneration)
      .map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        previewUrl: `data:${attachment.id}`,
      })),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      kind: attachment.usedForGeneration ? ("image" as const) : ("file" as const),
      previewUrl: "",
    })),
    primaryReferenceId: primary,
  }
  const cleared = emptyComposerDraft()
  assert.equal(cleared.primaryReferenceId, null)
  assert.equal(submittedTurnPreservesPrimary(message, "att-2"), true)
  const persisted = persistableUserMessage(message)
  assert.equal(persisted.primaryReferenceId, "att-2")
})

test("reconstruction input follows Primary rather than the first array item", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [png("A.png"), png("B.png")]).next
  const primary = setPrimaryReferenceId(attachments, "att-2")
  assert.equal(fileForPrimaryAnalysis(attachments, primary)?.name, "B.png")
  assert.notEqual(fileForPrimaryAnalysis(attachments, primary)?.name, "A.png")
  const fromA = reconstructLayoutFromReference("Recreate this.", "Standard invoice", {
    dominantHex: "#1a4cff",
    suggestedFamily: "studio",
  })
  const fromB = reconstructLayoutFromReference("Recreate this.", "Standard invoice", {
    dominantHex: "#c2410c",
    suggestedFamily: "statement",
  })
  assert.equal(fromA.style, "studio")
  assert.equal(fromB.style, "statement")
})

test("source/Reference preview URL uses Primary", () => {
  const message = {
    id: "u1",
    role: "user" as const,
    text: "Recreate this.",
    references: [
      { id: "att-1", name: "A.png", previewUrl: "data:a" },
      { id: "att-2", name: "B.png", previewUrl: "data:b" },
    ],
    primaryReferenceId: "att-2",
  }
  assert.equal(primaryReferencePreviewUrl(message), "data:b")
})

test("supporting images are not required for reconstruction", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [png("A.png"), png("B.png")]).next
  const submitted = attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    kind: "image" as const,
    previewUrl: "",
  }))
  const primary = primaryReferenceFromSubmitted(submitted, "att-1")
  assert.equal(primary?.id, "att-1")
  assert.equal(submitted.length, 2)
})

test("attachment-only generation still keys off having a visual Primary", () => {
  resetAttachmentIdCounterForTests()
  const images = appendAttachments([], [png("A.png"), png("B.png")]).next
  assert.equal(resolvePrimaryReferenceId(images, "att-2"), "att-2")
  const pdfOnly = appendAttachments([], [pdf("brief.pdf")]).next
  assert.equal(resolvePrimaryReferenceId(pdfOnly, null), null)
})

test("overflow prefers keeping Primary visible without reordering storage", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [
    png("A.png"),
    png("B.png"),
    png("C.png"),
    png("D.png"),
  ]).next
  const ids = attachments.map((attachment) => attachment.id)
  const strip = attachmentStripPreferPrimary(attachments, 2, "att-4")
  assert.equal(strip.visible.some((attachment) => attachment.id === "att-4"), true)
  assert.deepEqual(
    attachments.map((attachment) => attachment.id),
    ids
  )
})

test("cap does not move Primary off an earlier image", () => {
  resetAttachmentIdCounterForTests()
  const files = Array.from({ length: 22 }, (_, index) => png(`n-${index}.png`))
  const result = appendAttachments([], files)
  assert.equal(result.next.length, 20)
  assert.equal(resolvePrimaryReferenceId(result.next, null), "att-1")
})

test("duplicate files keep independent Primary roles", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [png("same.png"), png("same.png")]).next
  assert.equal(attachments[0]?.id, "att-1")
  assert.equal(attachments[1]?.id, "att-2")
  assert.equal(setPrimaryReferenceId(attachments, "att-2"), "att-2")
  assert.equal(resolvePrimaryReferenceId(attachments, "att-2"), "att-2")
})

test("composer draft auto-primary and fallback live outside version snapshots", () => {
  resetAttachmentIdCounterForTests()
  let draft = addComposerDraftFiles(emptyComposerDraft(), [png("A.png")]).next
  assert.equal(draft.primaryReferenceId, "att-1")
  draft = addComposerDraftFiles(draft, [png("B.png")]).next
  assert.equal(draft.primaryReferenceId, "att-1")
  draft = setComposerDraftPrimary(draft, "att-2")
  assert.equal(draft.primaryReferenceId, "att-2")
  draft = removeComposerDraftAttachment(draft, "att-2")
  assert.equal(draft.primaryReferenceId, "att-1")
  assert.equal(
    documentVersionSnapshotOmitsEphemeral({
      layoutEdits: {},
      layerText: {},
      layerStyles: {},
      hiddenLayers: [],
      layerDuplicates: {},
      placedElements: [],
      codeOverride: null,
      baseLayout: null,
      generatedLayout: reconstructLayoutFromReference("", "Standard invoice"),
    }),
    true
  )
})

test("follow-up submitted attachments do not carry a creation Primary role", () => {
  const persisted = persistableUserMessage({
    id: "u-follow",
    role: "user",
    text: "Make the notes shorter.",
    references: [{ id: "att-1", name: "A.png", previewUrl: "data:image/png;base64,xx" }],
    attachments: [
      {
        id: "att-1",
        name: "A.png",
        mimeType: "image/png",
        kind: "image",
        previewUrl: "data:image/png;base64,xx",
      },
    ],
  })
  assert.equal(persisted.primaryReferenceId, null)
})

test("all files remain on the request while analysis picks Primary", () => {
  resetAttachmentIdCounterForTests()
  const attachments = appendAttachments([], [
    png("A.png"),
    pdf("brief.pdf"),
    png("B.png"),
  ]).next
  assert.equal(attachments.length, 3)
  assert.equal(fileForPrimaryAnalysis(attachments, "att-3")?.name, "B.png")
  assert.equal(fileForPrimaryAnalysis(attachments, "att-1")?.name, "A.png")
})
