import assert from "node:assert/strict"
import test from "node:test"

import {
  REFERENCE_COMPOSER_PLACEHOLDER,
  REFERENCE_RECREATE_PROMPT,
} from "./composer-copy"
import {
  ATTACHMENT_CAP_MESSAGE,
  ATTACHMENT_UNSUPPORTED_MESSAGE,
  ATTACHMENT_GAP_PX,
  ATTACHMENT_TILE_PX,
  appendAttachments,
  attachmentFeedbackMessages,
  attachmentStrip,
  attachmentVisibleCapacity,
  composerActionOrderIntact,
  composerPlaceholderForAttachments,
  createAttachment,
  generationPromptForAttachments,
  hasReferenceAttachment,
  imageAttachmentsForSubmission,
  MAX_ATTACHMENTS,
  removeAttachmentById,
  resetAttachmentIdCounterForTests,
  resetFileInputValue,
  tilesThatFit,
} from "./prompt-attachments"

function png(name: string) {
  return new File([name], name, { type: "image/png" })
}

function pdf(name: string) {
  return new File([name], name, { type: "application/pdf" })
}

function txt(name: string) {
  return new File([name], name, { type: "text/plain" })
}

function add(current: ReturnType<typeof createAttachment>[], files: File[]) {
  return appendAttachments(current, files)
}

test("A. First picker selection creates collection", () => {
  resetAttachmentIdCounterForTests()
  const result = add([], [png("A.png")])
  assert.equal(result.next.length, 1)
  assert.equal(result.next[0]?.name, "A.png")
  assert.equal(result.next[0]?.id, "att-1")
  assert.equal(result.next[0]?.usedForGeneration, true)
})

test("B. Second picker selection APPENDS rather than replaces", () => {
  resetAttachmentIdCounterForTests()
  const first = add([], [png("A.png")]).next
  const second = add(first, [png("B.png")])
  assert.deepEqual(
    second.next.map((item) => item.name),
    ["A.png", "B.png"]
  )
  assert.equal(first[0]?.id, second.next[0]?.id)
})

test("C. Multiple files selected at once preserve order", () => {
  resetAttachmentIdCounterForTests()
  const result = add([], [png("A.png"), png("B.png"), png("C.png")])
  assert.deepEqual(
    result.next.map((item) => item.name),
    ["A.png", "B.png", "C.png"]
  )
})

test("D. Picker + drop append", () => {
  resetAttachmentIdCounterForTests()
  const picked = add([], [png("A.png")]).next
  const dropped = add(picked, [png("C.png"), png("D.png")])
  assert.deepEqual(
    dropped.next.map((item) => item.name),
    ["A.png", "C.png", "D.png"]
  )
})

test("E. Picker + paste append", () => {
  resetAttachmentIdCounterForTests()
  const picked = add([], [png("A.png"), png("B.png")]).next
  const pasted = add(picked, [png("E.png")])
  assert.deepEqual(
    pasted.next.map((item) => item.name),
    ["A.png", "B.png", "E.png"]
  )
})

test("F. Removing the middle attachment preserves the rest", () => {
  resetAttachmentIdCounterForTests()
  const all = add([], [png("A.png"), png("B.png"), png("C.png"), png("D.png")]).next
  const removed = removeAttachmentById(all, all[1]!.id)
  assert.deepEqual(
    removed.next.map((item) => item.name),
    ["A.png", "C.png", "D.png"]
  )
  assert.equal(removed.removed?.name, "B.png")
})

test("G. Adding after removal appends correctly", () => {
  resetAttachmentIdCounterForTests()
  const all = add([], [png("A.png"), png("B.png"), png("C.png")]).next
  const withoutB = removeAttachmentById(all, all[1]!.id).next
  const after = add(withoutB, [png("F.png")])
  assert.deepEqual(
    after.next.map((item) => item.name),
    ["A.png", "C.png", "F.png"]
  )
})

test("H. 1–4 files render without overflow when they all fit", () => {
  resetAttachmentIdCounterForTests()
  for (let count = 1; count <= 4; count += 1) {
    const files = Array.from({ length: count }, (_, index) => png(`${index}.png`))
    const items = add([], files).next
    const strip = attachmentStrip(items, attachmentVisibleCapacity(400, count))
    assert.equal(strip.visible.length, count)
    assert.equal(strip.overflowCount, 0)
    assert.equal(strip.overflowPreview, null)
  }
})

test("I. 5 files render overflow count correctly", () => {
  resetAttachmentIdCounterForTests()
  const files = ["A", "B", "C", "D", "E"].map((name) => png(`${name}.png`))
  const items = add([], files).next
  const fourSlots = 4 * ATTACHMENT_TILE_PX + 3 * ATTACHMENT_GAP_PX
  const strip = attachmentStrip(items, attachmentVisibleCapacity(fourSlots, items.length))
  assert.deepEqual(
    strip.visible.map((item) => item.name),
    ["A.png", "B.png", "C.png"]
  )
  assert.equal(strip.overflowCount, 2)
  assert.equal(strip.overflowPreview?.name, "D.png")
})

test("J. 8 files render correct overflow count", () => {
  resetAttachmentIdCounterForTests()
  const files = Array.from({ length: 8 }, (_, index) => png(`${index + 1}.png`))
  const items = add([], files).next
  const fiveSlots = 5 * ATTACHMENT_TILE_PX + 4 * ATTACHMENT_GAP_PX
  const strip = attachmentStrip(items, attachmentVisibleCapacity(fiveSlots, items.length))
  assert.equal(strip.visible.length, 4)
  assert.equal(strip.overflowCount, 4)
  assert.equal(strip.overflowPreview?.name, "5.png")
})

test("K. Overflow updates after removal", () => {
  resetAttachmentIdCounterForTests()
  const all = add(
    [],
    ["A", "B", "C", "D", "E", "F"].map((name) => png(`${name}.png`))
  ).next
  const withoutB = removeAttachmentById(all, all[1]!.id).next
  const fourSlots = 4 * ATTACHMENT_TILE_PX + 3 * ATTACHMENT_GAP_PX
  const strip = attachmentStrip(
    withoutB,
    attachmentVisibleCapacity(fourSlots, withoutB.length)
  )
  assert.deepEqual(
    strip.visible.map((item) => item.name),
    ["A.png", "C.png", "D.png"]
  )
  assert.equal(strip.overflowCount, 2)
  assert.equal(strip.overflowPreview?.name, "E.png")
})

test("L. Expanded view exposes all attachments", () => {
  resetAttachmentIdCounterForTests()
  const all = add(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index + 1}.png`))
  ).next
  const strip = attachmentStrip(all, 3)
  assert.equal(all.length, 8)
  assert.equal(strip.visible.length + strip.overflow.length, 8)
})

test("M. Removing hidden attachment updates collection", () => {
  resetAttachmentIdCounterForTests()
  const all = add(
    [],
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((name) => png(`${name}.png`))
  ).next
  const hidden = all[5]
  const next = removeAttachmentById(all, hidden!.id).next
  assert.equal(next.length, 7)
  assert.equal(next.some((item) => item.id === hidden!.id), false)
  assert.equal(attachmentStrip(next, 4).overflowCount, 3)
})

test("N. Submission receives ALL attachments, not just visible ones", () => {
  resetAttachmentIdCounterForTests()
  const all = add(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index + 1}.png`))
  ).next
  const submitted = imageAttachmentsForSubmission(all)
  const strip = attachmentStrip(all, 4)
  assert.equal(submitted.length, 8)
  assert.equal(strip.visible.length, 4)
})

test("O. Reference-aware placeholder remains correct", () => {
  resetAttachmentIdCounterForTests()
  const none = add([], []).next
  const one = add([], [png("A.png")]).next
  const many = add(
    [],
    Array.from({ length: 6 }, (_, index) => png(`${index}.png`))
  ).next
  assert.equal(composerPlaceholderForAttachments(none), null)
  assert.equal(composerPlaceholderForAttachments(one), REFERENCE_COMPOSER_PLACEHOLDER)
  assert.equal(composerPlaceholderForAttachments(many), REFERENCE_COMPOSER_PLACEHOLDER)
})

test("P. Existing empty-reference Recreate this. behavior remains correct", () => {
  resetAttachmentIdCounterForTests()
  const one = add([], [png("A.png")]).next
  const many = add([], [png("A.png"), png("B.png")]).next
  assert.equal(generationPromptForAttachments("", one), REFERENCE_RECREATE_PROMPT)
  assert.equal(generationPromptForAttachments("   ", many), REFERENCE_RECREATE_PROMPT)
  assert.equal(
    generationPromptForAttachments("Keep the structure, change the color", one),
    "Keep the structure, change the color"
  )
  assert.equal(generationPromptForAttachments("", []), "")
})

test("Q. No attachment state reset when reopening the file picker", () => {
  resetAttachmentIdCounterForTests()
  const existing = add([], [png("A.png")]).next
  const afterOpenPicker = existing
  const afterSecondPick = add(afterOpenPicker, [png("B.png"), png("C.png")])
  assert.deepEqual(
    afterSecondPick.next.map((item) => item.name),
    ["A.png", "B.png", "C.png"]
  )
})

test("R. File-input reset does not clear collection", () => {
  resetAttachmentIdCounterForTests()
  const existing = add([], [png("A.png")]).next
  const input = { value: "C:\\fakepath\\B.png" }
  resetFileInputValue(input)
  assert.equal(input.value, "")
  assert.equal(existing.length, 1)
  assert.equal(existing[0]?.name, "A.png")
})

test("S. Stable unique IDs after several additions/removals", () => {
  resetAttachmentIdCounterForTests()
  let current = add([], [png("A.png"), png("B.png"), png("C.png")]).next
  const idA = current[0]!.id
  const idC = current[2]!.id
  current = removeAttachmentById(current, current[1]!.id).next
  current = add(current, [png("D.png")]).next
  assert.equal(current[0]?.id, idA)
  assert.equal(current[1]?.id, idC)
  assert.equal(current[2]?.id, "att-4")
  assert.equal(new Set(current.map((item) => item.id)).size, 3)
})

test("T. Existing composer action order remains intact", () => {
  assert.equal(composerActionOrderIntact(), true)
})

test("0 attachments produce an empty strip", () => {
  const strip = attachmentStrip([], attachmentVisibleCapacity(400, 0))
  assert.equal(strip.visible.length, 0)
  assert.equal(strip.overflowCount, 0)
})

test("all attachments fit → no +N", () => {
  resetAttachmentIdCounterForTests()
  const items = add(
    [],
    Array.from({ length: 6 }, (_, index) => png(`${index}.png`))
  ).next
  const width =
    6 * ATTACHMENT_TILE_PX + 5 * ATTACHMENT_GAP_PX
  const visible = attachmentVisibleCapacity(width, items.length)
  const strip = attachmentStrip(items, visible)
  assert.equal(visible, 6)
  assert.equal(strip.overflowCount, 0)
  assert.equal(strip.visible.length, 6)
})

test("overflow appears when capacity is exceeded and +N is hidden count", () => {
  resetAttachmentIdCounterForTests()
  const items = add(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index + 1}.png`))
  ).next
  const fourTiles = 4 * ATTACHMENT_TILE_PX + 3 * ATTACHMENT_GAP_PX
  const visible = attachmentVisibleCapacity(fourTiles, items.length)
  const strip = attachmentStrip(items, visible)
  assert.equal(tilesThatFit(fourTiles), 4)
  assert.equal(visible, 3)
  assert.equal(strip.visible.length, 3)
  assert.equal(strip.overflowCount, 5)
})

test("capacity shrinking updates visible count", () => {
  resetAttachmentIdCounterForTests()
  const items = add(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index}.png`))
  ).next
  const wide = attachmentVisibleCapacity(8 * 42, items.length)
  const narrow = attachmentVisibleCapacity(2 * ATTACHMENT_TILE_PX + ATTACHMENT_GAP_PX, items.length)
  assert.ok(wide > narrow)
  assert.equal(attachmentStrip(items, wide).overflowCount, 8 - wide)
  assert.equal(attachmentStrip(items, narrow).overflowCount, 8 - narrow)
  assert.deepEqual(
    items.map((item) => item.id),
    attachmentStrip(items, narrow).visible.concat(attachmentStrip(items, narrow).overflow).map((item) => item.id)
  )
})

test("capacity growing reveals more attachments", () => {
  resetAttachmentIdCounterForTests()
  const items = add(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index}.png`))
  ).next
  const small = attachmentStrip(items, 2)
  const large = attachmentStrip(items, 6)
  assert.equal(small.visible.length, 2)
  assert.equal(large.visible.length, 6)
  assert.equal(small.overflowCount, 6)
  assert.equal(large.overflowCount, 2)
})

test("removing visible or hidden attachments recalculates overflow", () => {
  resetAttachmentIdCounterForTests()
  const all = add(
    [],
    ["A", "B", "C", "D", "E", "F"].map((name) => png(`${name}.png`))
  ).next
  const afterVisible = removeAttachmentById(all, all[1]!.id).next
  const afterHidden = removeAttachmentById(all, all[5]!.id).next
  const capacity = 3
  assert.equal(attachmentStrip(afterVisible, capacity).overflowCount, 2)
  assert.equal(attachmentStrip(afterHidden, capacity).overflowCount, 2)
  assert.equal(afterVisible[0]?.id, all[0]?.id)
})

test("18 attached plus 5 selected keeps 18, accepts 2, truncates 3", () => {
  resetAttachmentIdCounterForTests()
  const existing = add(
    [],
    Array.from({ length: 18 }, (_, index) => png(`keep-${index}.png`))
  ).next
  const result = add(
    existing,
    Array.from({ length: 5 }, (_, index) => png(`extra-${index}.png`))
  )
  assert.equal(result.next.length, MAX_ATTACHMENTS)
  assert.equal(result.added.length, 2)
  assert.equal(result.truncated.length, 3)
  assert.equal(result.next[0]?.name, "keep-0.png")
  assert.match(ATTACHMENT_CAP_MESSAGE, /20/)
})

test("capacity of two tiles with extras shows one thumbnail plus overflow", () => {
  resetAttachmentIdCounterForTests()
  const all = add(
    [],
    Array.from({ length: 8 }, (_, index) => png(`${index + 1}.png`))
  ).next
  const visible = attachmentVisibleCapacity(
    2 * ATTACHMENT_TILE_PX + ATTACHMENT_GAP_PX,
    all.length
  )
  const strip = attachmentStrip(all, visible)
  assert.equal(strip.visible.length, 1)
  assert.equal(strip.overflowCount, 7)
})

test("mixed valid/invalid batch does not destroy the existing collection", () => {
  resetAttachmentIdCounterForTests()
  const existing = add([], [png("A.png")]).next
  const result = add(existing, [txt("notes.txt"), png("B.png"), pdf("spec.pdf")])
  assert.deepEqual(
    result.next.map((item) => item.name),
    ["A.png", "B.png", "spec.pdf"]
  )
  assert.equal(result.rejected.length, 1)
  assert.equal(result.rejected[0]?.name, "notes.txt")
  assert.equal(result.next[2]?.usedForGeneration, false)
})

test("cap truncates extra files without wiping accepted attachments", () => {
  resetAttachmentIdCounterForTests()
  const files = Array.from({ length: MAX_ATTACHMENTS + 3 }, (_, index) =>
    png(`${index}.png`)
  )
  const result = add([], files)
  assert.equal(result.next.length, MAX_ATTACHMENTS)
  assert.equal(result.truncated.length, 3)
  assert.equal(result.next[0]?.name, "0.png")
})

test("rejected files report unsupported-type feedback without wiping accepted files", () => {
  resetAttachmentIdCounterForTests()
  const existing = add([], [png("A.png")]).next
  const result = add(existing, [txt("notes.txt"), png("B.png")])
  assert.deepEqual(attachmentFeedbackMessages(result), [
    ATTACHMENT_UNSUPPORTED_MESSAGE,
  ])
  assert.deepEqual(
    result.next.map((item) => item.name),
    ["A.png", "B.png"]
  )
})

test("hasReferenceAttachment is true for any image in a mixed collection", () => {
  resetAttachmentIdCounterForTests()
  const mixed = add([], [pdf("a.pdf"), png("b.png")]).next
  assert.equal(hasReferenceAttachment(mixed), true)
  assert.equal(hasReferenceAttachment(add([], [pdf("a.pdf")]).next), false)
})
