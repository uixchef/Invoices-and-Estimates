import assert from "node:assert/strict"
import test from "node:test"

import { REFERENCE_RECREATE_PROMPT } from "./composer-copy"
import {
  builderComposerCanSend,
  clarificationAnswerMessage,
  imageReferencesFromSubmitted,
  nextTurnDoesNotInheritAttachments,
  persistableUserMessage,
  planBuilderComposerSend,
  resolveBuilderGenerationPrompt,
  submittedAttachmentsForTurn,
  submittedKindForAttachment,
} from "./builder-attachments"
import { matchDocumentAction } from "./document-actions"
import {
  ATTACHMENT_UNSUPPORTED_MESSAGE,
  appendAttachments,
  attachmentFeedbackMessages,
  attachmentStrip,
  attachmentVisibleCapacity,
  createAttachment,
  resetAttachmentIdCounterForTests,
  resetFileInputValue,
  revokeAttachmentUrls,
  revokePreviewUrl,
} from "./prompt-attachments"
import {
  applyConversationScroll,
  conversationOnContentChange,
  conversationOnSubmit,
  latestScrollTop,
} from "./conversation-scroll"

function png(name: string) {
  return new File([name], name, { type: "image/png" })
}

function pdf(name: string) {
  return new File([name], name, { type: "application/pdf" })
}

function txt(name: string) {
  return new File([name], name, { type: "text/plain" })
}

test("builder picker appends a batch instead of replacing", () => {
  resetAttachmentIdCounterForTests()
  const first = appendAttachments([], [png("one.png")]).next
  const second = appendAttachments(first, [png("two.png"), pdf("spec.pdf")])
  assert.deepEqual(
    second.next.map((item) => item.id),
    ["att-1", "att-2", "att-3"]
  )
  assert.equal(first[0]?.id, second.next[0]?.id)
})

test("builder attachment ids stay stable after individual remove", () => {
  resetAttachmentIdCounterForTests()
  const all = appendAttachments([], [png("a.png"), png("b.png"), png("c.png")]).next
  const next = appendAttachments(
    all.filter((item) => item.id !== "att-2"),
    []
  ).next
  assert.deepEqual(
    next.map((item) => item.id),
    ["att-1", "att-3"]
  )
})

test("same filename can be reselected after input reset", () => {
  resetAttachmentIdCounterForTests()
  const existing = appendAttachments([], [png("repeat.png")]).next
  const input = { value: "C:\\fakepath\\repeat.png" }
  resetFileInputValue(input)
  assert.equal(input.value, "")
  const again = appendAttachments(existing, [png("repeat.png")])
  assert.equal(again.next.length, 2)
  assert.equal(again.next[0]?.id, "att-1")
  assert.equal(again.next[1]?.id, "att-2")
})

test("mixed valid/invalid builder batch keeps accepted files", () => {
  resetAttachmentIdCounterForTests()
  const existing = appendAttachments([], [png("keep.png")]).next
  const result = appendAttachments(existing, [txt("notes.txt"), pdf("brief.pdf")])
  assert.deepEqual(
    result.next.map((item) => item.name),
    ["keep.png", "brief.pdf"]
  )
  assert.equal(result.rejected[0]?.name, "notes.txt")
  assert.deepEqual(attachmentFeedbackMessages(result), [
    ATTACHMENT_UNSUPPORTED_MESSAGE,
  ])
})

test("safety cap truncates without wiping the builder collection", () => {
  resetAttachmentIdCounterForTests()
  const existing = Array.from({ length: 18 }, (_, index) =>
    png(`keep-${index}.png`)
  )
  const held = appendAttachments([], existing).next
  const result = appendAttachments(held, [png("a.png"), png("b.png"), png("c.png")])
  assert.equal(result.next.length, 20)
  assert.equal(result.truncated.length, 1)
})

test("image vs PDF submitted kinds stay honest", () => {
  const image = createAttachment(png("mood.png"), "blob:preview")
  const file = createAttachment(pdf("scope.pdf"))
  assert.equal(submittedKindForAttachment(image), "image")
  assert.equal(submittedKindForAttachment(file), "file")
  assert.equal(image.usedForGeneration, true)
  assert.equal(file.usedForGeneration, false)
})

test("blob URL cleanup only revokes blob previews", () => {
  const revoked: string[] = []
  const original = URL.revokeObjectURL
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url)
  }
  try {
    revokePreviewUrl("https://example.com/x.png")
    revokePreviewUrl("data:image/png;base64,abc")
    revokePreviewUrl("blob:http://localhost/1")
    revokeAttachmentUrls([
      createAttachment(png("a.png"), "blob:http://localhost/2"),
      createAttachment(pdf("a.pdf"), ""),
    ])
    assert.deepEqual(revoked, [
      "blob:http://localhost/1",
      "blob:http://localhost/2",
    ])
  } finally {
    URL.revokeObjectURL = original
  }
})

test("attachment-only first generation uses Recreate this.", () => {
  assert.equal(
    resolveBuilderGenerationPrompt("", {
      generatedOnce: false,
      hasImageReference: true,
    }),
    REFERENCE_RECREATE_PROMPT
  )
})

test("attachment-only follow-up does not reconstruct the live layout", () => {
  assert.equal(
    resolveBuilderGenerationPrompt("", {
      generatedOnce: true,
      hasImageReference: true,
    }),
    ""
  )
  assert.equal(
    resolveBuilderGenerationPrompt("Warm this up", {
      generatedOnce: true,
      hasImageReference: true,
    }),
    "Warm this up"
  )
})

test("attachment + text keeps the typed instruction", () => {
  assert.equal(
    resolveBuilderGenerationPrompt("Use this palette on the totals", {
      generatedOnce: true,
      hasImageReference: true,
    }),
    "Use this palette on the totals"
  )
})

test("submitted turn receives all attachments, composer draft can then clear", () => {
  const submitted = [
    {
      id: "att-1",
      name: "one.png",
      mimeType: "image/png",
      kind: "image" as const,
      previewUrl: "data:image/png;base64,aaa",
    },
    {
      id: "att-2",
      name: "notes.pdf",
      mimeType: "application/pdf",
      kind: "file" as const,
      previewUrl: "",
    },
  ]
  const turn = {
    id: "u1",
    role: "user" as const,
    text: "Use this reference for colour",
    references: imageReferencesFromSubmitted(submitted),
    attachments: submitted,
  }
  assert.equal(submittedAttachmentsForTurn(turn).length, 2)
  assert.equal(turn.references.length, 1)
  const clearedDraft: ReturnType<typeof createAttachment>[] = []
  assert.equal(nextTurnDoesNotInheritAttachments(submitted, clearedDraft), true)
})

test("pending clarification preserves original request attachments", () => {
  const original = {
    id: "u1",
    role: "user" as const,
    text: "make it more like this",
    references: [
      { id: "att-1", name: "ref.png", previewUrl: "data:image/png;base64,aaa" },
    ],
    attachments: [
      {
        id: "att-1",
        name: "ref.png",
        mimeType: "image/png",
        kind: "image" as const,
        previewUrl: "data:image/png;base64,aaa",
      },
    ],
  }
  const answer = clarificationAnswerMessage("u2", "Use your judgment")
  assert.equal(original.attachments?.length, 1)
  assert.equal(answer.attachments?.length, 0)
  assert.equal(answer.kind, "clarification-answer")
})

test("next message does not inherit previous attachment ids", () => {
  const previous = [
    {
      id: "att-1",
      name: "old.png",
      mimeType: "image/png",
      kind: "image" as const,
      previewUrl: "data:image/png;base64,aaa",
    },
  ]
  assert.equal(nextTurnDoesNotInheritAttachments(previous, []), true)
  const nextDraft = [
    createAttachment(png("fresh.png")),
  ]
  nextDraft[0]!.id = "att-9"
  assert.equal(nextTurnDoesNotInheritAttachments(previous, nextDraft), true)
})

test("smart-scroll still aligns to latest when the new turn is taller", () => {
  const before = {
    scrollTop: 1600,
    clientHeight: 400,
    scrollHeight: 2000,
  }
  const afterAttachments = {
    scrollTop: 1600,
    clientHeight: 400,
    scrollHeight: 2148,
  }
  const submit = conversationOnSubmit()
  assert.equal(
    applyConversationScroll(before, submit),
    latestScrollTop(before)
  )
  const follow = conversationOnContentChange(true)
  assert.equal(
    applyConversationScroll(afterAttachments, follow),
    latestScrollTop(afterAttachments)
  )
})

test("document actions still match from text even when an attachment exists", () => {
  assert.equal(matchDocumentAction("Add a discount row"), "add-discount-row")
  assert.equal(matchDocumentAction("Add Pay online"), "add-pay-online")
  assert.equal(
    planBuilderComposerSend({
      text: "Add a discount row",
      attachmentCount: 1,
      status: "ready",
    }),
    "queue"
  )
  assert.notEqual(
    resolveBuilderGenerationPrompt("Add a discount row", {
      generatedOnce: true,
      hasImageReference: true,
    }),
    REFERENCE_RECREATE_PROMPT
  )
})

test("clarification answers do not queue a new attachment-backed turn", () => {
  assert.equal(
    planBuilderComposerSend({
      text: "Professional",
      attachmentCount: 1,
      status: "asking",
    }),
    "clarify"
  )
  assert.equal(
    builderComposerCanSend({
      text: "",
      attachmentCount: 2,
      status: "asking",
      scopedQuestionLocksComposer: false,
    }),
    false
  )
})

test("builder composer can send attachment-only follow-ups", () => {
  assert.equal(
    builderComposerCanSend({
      text: "",
      attachmentCount: 1,
      status: "ready",
      scopedQuestionLocksComposer: false,
    }),
    true
  )
  assert.equal(
    planBuilderComposerSend({
      text: "",
      attachmentCount: 1,
      status: "ready",
    }),
    "queue"
  )
})

test("narrow builder strip overflows instead of squeezing", () => {
  resetAttachmentIdCounterForTests()
  const items = appendAttachments(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index}.png`))
  ).next
  const visible = attachmentVisibleCapacity(96, items.length, 32, 6)
  const strip = attachmentStrip(items, visible)
  assert.ok(visible <= 2)
  assert.ok(strip.overflowCount >= 6)
  assert.equal(strip.visible.length + strip.overflowCount, 8)
})

test("persistable transcript drops blob URLs but keeps data URLs and metadata", () => {
  const persisted = persistableUserMessage({
    id: "u1",
    role: "user",
    text: "Use this",
    references: [
      { id: "att-1", name: "live.png", previewUrl: "blob:http://localhost/x" },
    ],
    attachments: [
      {
        id: "att-1",
        name: "live.png",
        mimeType: "image/png",
        kind: "image",
        previewUrl: "blob:http://localhost/x",
      },
      {
        id: "att-2",
        name: "kept.png",
        mimeType: "image/png",
        kind: "image",
        previewUrl: "data:image/png;base64,abc",
      },
      {
        id: "att-3",
        name: "brief.pdf",
        mimeType: "application/pdf",
        kind: "file",
        previewUrl: "",
      },
    ],
  })
  assert.equal(persisted.references[0]?.previewUrl, "")
  assert.equal(persisted.attachments?.[0]?.previewUrl, "")
  assert.equal(persisted.attachments?.[1]?.previewUrl.startsWith("data:"), true)
  assert.equal(persisted.attachments?.[2]?.name, "brief.pdf")
})

test("rejected files never enter the collection or create previews", () => {
  resetAttachmentIdCounterForTests()
  let previewCalls = 0
  const result = appendAttachments([], [txt("bad.txt")], () => {
    previewCalls += 1
    return "blob:should-not-exist"
  })
  assert.equal(result.next.length, 0)
  assert.equal(previewCalls, 0)
  assert.equal(result.rejected.length, 1)
})
