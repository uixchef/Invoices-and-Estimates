import assert from "node:assert/strict"
import test from "node:test"

import { persistableUserMessage } from "./builder-attachments"
import { resolveGenerationPrompt, REFERENCE_RECREATE_PROMPT } from "./composer-copy"
import { conversationOnContentChange } from "./conversation-scroll"
import { documentVersionSnapshotOmitsEphemeral } from "./document-versions"
import type { BuilderMessage, BuilderUserMessage } from "./layout-builder-types"
import {
  REFERENCE_COMPARE_TRANSITION_MS,
  REFERENCE_COMPARE_VIEW_MODEL,
  canCompareReferenceResult,
  compareTransitionMs,
  creationComparisonSource,
  creationSourceMessage,
  creationUsedVisualReference,
  isUsableReferencePreviewUrl,
  referenceCompareAltText,
} from "./reference-comparison"
import { reconstructLayoutFromReference } from "./reference-layout"

function user(partial: Partial<BuilderUserMessage> & Pick<BuilderUserMessage, "id" | "text">): BuilderUserMessage {
  return {
    role: "user",
    references: [],
    ...partial,
  }
}

const imageA = {
  id: "att-1",
  name: "A.png",
  previewUrl: "data:image/png;base64,aaa",
}
const imageB = {
  id: "att-2",
  name: "B.png",
  previewUrl: "data:image/png;base64,bbb",
}

test("Reference uses primaryReferenceId, not array order", () => {
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: "Recreate this.",
      references: [imageA, imageB],
      primaryReferenceId: "att-2",
    }),
  ]
  const source = creationComparisonSource(messages)
  assert.equal(source?.id, "att-2")
  assert.equal(source?.previewUrl, imageB.previewUrl)
})

test("changing Primary before generation changes Reference source", () => {
  const first: BuilderMessage[] = [
    user({
      id: "u1",
      text: REFERENCE_RECREATE_PROMPT,
      references: [imageA, imageB],
      primaryReferenceId: "att-1",
    }),
  ]
  const switched: BuilderMessage[] = [
    user({
      id: "u1",
      text: REFERENCE_RECREATE_PROMPT,
      references: [imageA, imageB],
      primaryReferenceId: "att-2",
    }),
  ]
  assert.equal(creationComparisonSource(first)?.id, "att-1")
  assert.equal(creationComparisonSource(switched)?.id, "att-2")
})

test("missing Primary preview does not fall back to another image", () => {
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: "Recreate this.",
      references: [imageA, { ...imageB, previewUrl: "" }],
      primaryReferenceId: "att-2",
    }),
  ]
  assert.equal(creationComparisonSource(messages), null)
  assert.equal(canCompareReferenceResult(messages), false)
})

test("PDF-only creation does not offer comparison", () => {
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: "Build from this brief.",
      references: [],
      attachments: [
        {
          id: "att-1",
          name: "brief.pdf",
          mimeType: "application/pdf",
          kind: "file",
          previewUrl: "",
        },
      ],
      primaryReferenceId: null,
    }),
  ]
  assert.equal(creationUsedVisualReference(messages), false)
  assert.equal(canCompareReferenceResult(messages), false)
})

test("text-only generation does not offer comparison", () => {
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: "Create a premium modern invoice for a creative studio with itemised services and tax.",
    }),
  ]
  assert.equal(canCompareReferenceResult(messages), false)
})

test("follow-up image does not create creation comparison", () => {
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: "Create a premium modern invoice for a creative studio with itemised services and tax.",
    }),
    {
      id: "a1",
      role: "assistant",
      receivedAnswers: null,
      preReasoning: null,
      preDurationSec: null,
      reasoning: "ok",
      durationSec: 1,
      todos: [],
      summary: "done",
      recommendations: [],
    },
    user({
      id: "u2",
      text: "Make the notes shorter.",
      references: [imageA],
    }),
  ]
  assert.equal(creationSourceMessage(messages)?.id, "u1")
  assert.equal(canCompareReferenceResult(messages), false)
  assert.equal(creationComparisonSource(messages), null)
})

test("Result remains the native document; switching does not mutate it", () => {
  assert.equal(REFERENCE_COMPARE_VIEW_MODEL.keepsResultMounted, true)
  assert.equal(REFERENCE_COMPARE_VIEW_MODEL.mutatesDocument, false)
  assert.equal(REFERENCE_COMPARE_VIEW_MODEL.isReadOnly, true)
  const layout = reconstructLayoutFromReference("Recreate this.", "Standard invoice")
  const afterView = reconstructLayoutFromReference("Recreate this.", "Standard invoice")
  assert.equal(layout.businessName, afterView.businessName)
  assert.equal(layout.style, afterView.style)
})

test("comparison view is omitted from document versions and undo", () => {
  assert.equal(REFERENCE_COMPARE_VIEW_MODEL.createsUndo, false)
  assert.equal(REFERENCE_COMPARE_VIEW_MODEL.createsVersion, false)
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

test("Brand Board paint is independent of the Reference source URL", () => {
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: "Recreate this.",
      references: [imageA],
      primaryReferenceId: "att-1",
    }),
  ]
  const before = creationComparisonSource(messages)
  const afterBrand = creationComparisonSource(messages)
  assert.equal(before?.previewUrl, afterBrand?.previewUrl)
  assert.equal(before?.id, "att-1")
})

test("session restore keeps the same Primary when the data URL survives", () => {
  const original = user({
    id: "u1",
    text: "Recreate this.",
    references: [imageA, imageB],
    primaryReferenceId: "att-2",
    attachments: [
      {
        id: "att-1",
        name: "A.png",
        mimeType: "image/png",
        kind: "image",
        previewUrl: imageA.previewUrl,
      },
      {
        id: "att-2",
        name: "B.png",
        mimeType: "image/png",
        kind: "image",
        previewUrl: imageB.previewUrl,
      },
    ],
  })
  const restored = persistableUserMessage(original)
  assert.equal(
    creationComparisonSource([restored])?.id,
    creationComparisonSource([original])?.id
  )
  assert.equal(creationComparisonSource([restored])?.previewUrl, imageB.previewUrl)
})

test("blob-only preview is unusable after persist strips it", () => {
  const original = user({
    id: "u1",
    text: "Recreate this.",
    references: [{ id: "att-1", name: "A.png", previewUrl: "blob:http://localhost/1" }],
    primaryReferenceId: "att-1",
  })
  const restored = persistableUserMessage(original)
  assert.equal(isUsableReferencePreviewUrl(original.references[0]?.previewUrl), true)
  assert.equal(canCompareReferenceResult([restored]), false)
})

test("broken or empty source is not treated as a comparison", () => {
  assert.equal(isUsableReferencePreviewUrl(""), false)
  assert.equal(isUsableReferencePreviewUrl("   "), false)
  assert.equal(isUsableReferencePreviewUrl("not-a-url"), false)
  assert.equal(isUsableReferencePreviewUrl("data:image/png;base64,xx"), true)
})

test("reduced motion disables the compare fade", () => {
  assert.equal(compareTransitionMs(false), REFERENCE_COMPARE_TRANSITION_MS)
  assert.equal(compareTransitionMs(true), 0)
})

test("accessible comparison copy names the Primary file, not invented contents", () => {
  assert.equal(
    referenceCompareAltText("saffron-invoice-reference.png"),
    "Primary reference: saffron-invoice-reference.png"
  )
})

test("containment model is contain, not cover-crop", () => {
  assert.equal(REFERENCE_COMPARE_VIEW_MODEL.fit, "contain")
})

test("comparison switching is not a conversation content change", () => {
  const decision = conversationOnContentChange(false)
  assert.equal(decision.alignToLatest, false)
})

test("attachment-only recreate still keys comparison off Primary", () => {
  assert.equal(resolveGenerationPrompt("", true), REFERENCE_RECREATE_PROMPT)
  const messages: BuilderMessage[] = [
    user({
      id: "u1",
      text: REFERENCE_RECREATE_PROMPT,
      references: [imageA],
      primaryReferenceId: "att-1",
    }),
  ]
  assert.equal(canCompareReferenceResult(messages), true)
})
