import assert from "node:assert/strict"
import test from "node:test"

import {
  applyLeftPanelAction,
  blankCanvasDropCopy,
  LEFT_PANEL_PRESERVES_SELECTION,
  LEFT_PANEL_SEARCH_WRAP,
  leftPanelMode,
  type LeftPanelFlags,
} from "./builder-left-panel"
import {
  REPLACE_INCOMPATIBLE,
  REPLACE_NO_SELECTION,
  SAVED_ITEMS_EMPTY_BODY,
  SAVED_ITEMS_EMPTY_TITLE,
  SAVED_ITEMS_KEY,
  SAVED_ITEMS_NO_RESULTS_BODY,
  SAVED_ITEMS_NO_RESULTS_TITLE,
  SAVED_ITEMS_SURFACES,
  canReplaceTarget,
  createSavedDefinition,
  deleteSavedDefinition,
  duplicateSavedDefinition,
  insertSavedIntoDocument,
  renameSavedDefinition,
  replaceAvailabilityFor,
  replaceSelectedWithSaved,
  savedItemGlyphKind,
  savedItemMatchesQuery,
  type DocumentSlice,
  type SavedItemNode,
} from "./saved-items"
import type { PlacedElement } from "./layout-builder-types"
import {
  inheritPlacedAppearance,
  mergeInheritedStyle,
  resolveFamilyBrand,
  selectionFromBoard,
  BUILT_IN_BRAND_BOARDS,
} from "./brand-boards"
import type { BuilderLayerStyle } from "./layout-builder-types"

const AI: LeftPanelFlags = {
  panelOpen: true,
  addingElement: false,
  browsingSavedItems: false,
  browsingBrand: false,
  browsingVersionHistory: false,
}

function billingNode(): SavedItemNode {
  return {
    kind: "columns-2",
    labelHint: "Billing details",
    content: "Column content",
    children: [
      { kind: "paragraph", labelHint: "Bill to", content: "Bill to", slot: 0 },
      { kind: "paragraph", labelHint: "Client name", content: "Northwind", slot: 0 },
    ],
  }
}

function placed(
  partial: Partial<PlacedElement> & Pick<PlacedElement, "id" | "kind" | "label">
): PlacedElement {
  return { zone: "end", content: "Hello", ...partial }
}

function counter(start = 0) {
  let n = start
  return () => {
    n += 1
    return `placed-${n}`
  }
}

function doc(elements: PlacedElement[]): DocumentSlice {
  return {
    placedElements: elements,
    layerStyles: {},
    layerText: Object.fromEntries(elements.map((element) => [element.id, element.content])),
  }
}

test("Saved items header action opens Saved items panel, not Add elements", () => {
  const next = applyLeftPanelAction(AI, { type: "open", tool: "saved-items" })
  assert.equal(leftPanelMode(next), "saved-items")
  assert.equal(next.addingElement, false)
  assert.equal(next.browsingSavedItems, true)
})

test("Add elements header action still opens Add elements", () => {
  const next = applyLeftPanelAction(AI, { type: "open", tool: "add-elements" })
  assert.equal(leftPanelMode(next), "add-elements")
  assert.equal(next.browsingSavedItems, false)
})

test("Add elements and Saved items share title-to-search spacing", () => {
  assert.equal(LEFT_PANEL_SEARCH_WRAP, "shrink-0 px-4 pt-3 pb-4")
})

test("Saved items subsection still exists in Add elements", () => {
  assert.ok(SAVED_ITEMS_SURFACES.includes("add-elements-shortcut"))
})

test("both surfaces use the same saved-item collection", () => {
  assert.deepEqual(SAVED_ITEMS_SURFACES, ["dedicated-panel", "add-elements-shortcut"])
  assert.equal(SAVED_ITEMS_KEY, "layouts-ai-saved-items-v1")
})

test("search works in dedicated panel", () => {
  const item = createSavedDefinition("Billing details", billingNode())
  assert.equal(savedItemMatchesQuery(item, "billing"), true)
  assert.equal(savedItemMatchesQuery(item, "2-column"), true)
})

test("click insertion works", () => {
  const result = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: Number.MAX_SAFE_INTEGER },
    counter()
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.root.label, "Billing details")
  assert.ok(result.doc.placedElements.length > 1)
})

test("drag/drop insertion works", () => {
  const existing = [placed({ id: "placed-9", kind: "heading", label: "Heading", zone: "end" })]
  const result = insertSavedIntoDocument(
    doc(existing),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.doc.placedElements[0]?.label, "Billing details")
  assert.equal(result.doc.placedElements.at(-1)?.id, "placed-9")
})

test("fresh IDs on insertion", () => {
  const first = insertSavedIntoDocument(doc([]), billingNode(), { kind: "root", zone: "end", index: 0 }, counter())
  assert.equal(first.ok, true)
  if (!first.ok) return
  const second = insertSavedIntoDocument(
    first.doc,
    billingNode(),
    { kind: "root", zone: "end", index: 1 },
    counter(first.doc.placedElements.length)
  )
  assert.equal(second.ok, true)
  if (!second.ok) return
  const ids = new Set(first.doc.placedElements.map((element) => element.id))
  assert.ok(second.doc.placedElements.every((element) => !ids.has(element.id) || first.doc.placedElements.some((prior) => prior.id === element.id)))
  assert.ok(second.root.id !== first.root.id)
})

test("destination Brand Board inheritance remains correct", () => {
  const harbor = resolveFamilyBrand("studio", selectionFromBoard(BUILT_IN_BRAND_BOARDS[0]))
  const folio = resolveFamilyBrand("swiss", selectionFromBoard(BUILT_IN_BRAND_BOARDS[1]))
  const inherited = inheritPlacedAppearance("paragraph", harbor)
  const inserted = insertSavedIntoDocument(
    doc([]),
    {
      kind: "paragraph",
      labelHint: "Client name",
      content: "Northwind",
      style: { fontSize: 18 },
    },
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const destination = mergeInheritedStyle(
    inheritPlacedAppearance("paragraph", folio) as BuilderLayerStyle,
    inserted.doc.layerStyles[inserted.root.id]
  )
  assert.equal(destination.color, inheritPlacedAppearance("paragraph", folio).color)
  assert.notEqual(destination.color, inherited.color)
  assert.equal(destination.fontSize, 18)
})

test("rename updates both surfaces", () => {
  const created = createSavedDefinition("Billing details", billingNode())
  const next = renameSavedDefinition([created], created.id, "Client block")
  assert.equal(next[0]?.name, "Client block")
  assert.equal(next[0]?.id, created.id)
})

test("duplicate updates both surfaces", () => {
  const created = createSavedDefinition("Billing details", billingNode())
  const next = duplicateSavedDefinition([created], created.id)
  assert.equal(next.length, 2)
  assert.notEqual(next[1]?.id, created.id)
})

test("delete updates both surfaces", () => {
  const created = createSavedDefinition("Billing details", billingNode())
  assert.equal(deleteSavedDefinition([created], created.id).length, 0)
})

test("Replace selected works for compatible structure", () => {
  const target = placed({ id: "placed-1", kind: "columns-2", label: "2-column section" })
  assert.equal(canReplaceTarget(billingNode(), target, [target]).ok, true)
  const replaced = replaceSelectedWithSaved(doc([target]), billingNode(), "placed-1", counter())
  assert.equal(replaced.ok, true)
})

test("Replace selected is disabled for incompatible structure", () => {
  const target = placed({ id: "placed-1", kind: "image", label: "Image", content: "" })
  assert.equal(canReplaceTarget(billingNode(), target, [target]).ok, false)
})

test("switching Add elements → Saved items closes the previous panel", () => {
  const add = applyLeftPanelAction(AI, { type: "open", tool: "add-elements" })
  const next = applyLeftPanelAction(add, { type: "open", tool: "saved-items" })
  assert.equal(leftPanelMode(next), "saved-items")
  assert.equal(next.addingElement, false)
})

test("switching Saved items → Brand boards behaves correctly", () => {
  const saved = applyLeftPanelAction(AI, { type: "open", tool: "saved-items" })
  const next = applyLeftPanelAction(saved, { type: "open", tool: "brand-boards" })
  assert.equal(leftPanelMode(next), "brand-boards")
  assert.equal(next.browsingSavedItems, false)
  assert.equal(next.panelOpen, true)
})

test("closing Saved items preserves document state", () => {
  const saved = applyLeftPanelAction(AI, { type: "open", tool: "saved-items" })
  const next = applyLeftPanelAction(saved, { type: "close-tool", tool: "saved-items" })
  assert.equal(leftPanelMode(next), "closed")
  const start = doc([placed({ id: "placed-1", kind: "heading", label: "Heading" })])
  assert.equal(start.placedElements[0]?.id, "placed-1")
})

test("empty-library state", () => {
  assert.equal(SAVED_ITEMS_EMPTY_TITLE, "No saved items yet")
  assert.match(SAVED_ITEMS_EMPTY_BODY, /Save a reusable section/)
})

test("no-match search state", () => {
  assert.equal(SAVED_ITEMS_NO_RESULTS_TITLE, "No saved items found")
  assert.equal(SAVED_ITEMS_NO_RESULTS_BODY, "Try a different search.")
  const item = createSavedDefinition("Billing details", billingNode())
  assert.equal(savedItemMatchesQuery(item, "zzzz"), false)
})

test("undo/redo for document insert/replace remains correct", () => {
  const start = doc([])
  const history = [structuredClone(start)]
  const inserted = insertSavedIntoDocument(start, billingNode(), { kind: "root", zone: "end", index: 0 }, counter())
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  let present = inserted.doc
  present = history.pop()!
  assert.equal(present.placedElements.length, 0)
  present = inserted.doc
  const replaceHistory = [structuredClone(present)]
  const replaced = replaceSelectedWithSaved(present, billingNode(), inserted.root.id, counter(20))
  assert.equal(replaced.ok, true)
  if (!replaced.ok) return
  present = replaceHistory.pop()!
  assert.equal(present.placedElements[0]?.id, inserted.root.id)
})

test("library CRUD itself remains outside document undo", () => {
  const created = createSavedDefinition("Billing details", billingNode())
  const document = doc([])
  const renamed = renameSavedDefinition([created], created.id, "Renamed")
  assert.equal(document.placedElements.length, 0)
  assert.equal(renamed[0]?.name, "Renamed")
})

test("Saved items active → Saved-items-specific empty-canvas copy", () => {
  const copy = blankCanvasDropCopy("saved-items")
  assert.equal(copy.title, "Drop a saved item here to start building")
  assert.match(copy.body, /Saved items/)
  assert.equal(/Add elements/.test(copy.body), false)
})

test("Add elements active → existing Add-elements empty copy", () => {
  const copy = blankCanvasDropCopy("add-elements")
  assert.equal(copy.title, "Drop elements here to start building")
  assert.match(copy.body, /Add elements/)
})

test("opening Saved items preserves current canvas selection", () => {
  assert.equal(LEFT_PANEL_PRESERVES_SELECTION["saved-items"], true)
  const inspectingLayer = "placed-4"
  const next = applyLeftPanelAction(AI, { type: "open", tool: "saved-items" })
  assert.equal(leftPanelMode(next), "saved-items")
  assert.equal(inspectingLayer, "placed-4")
})

test("no selection → Replace selected disabled", () => {
  const check = replaceAvailabilityFor(billingNode(), {
    inspectingKey: null,
    target: undefined,
    all: [],
  })
  assert.equal(check.ok, false)
  if (check.ok) return
  assert.equal(check.reason, REPLACE_NO_SELECTION)
})

test("incompatible selection → disabled + reason", () => {
  const image = placed({ id: "placed-1", kind: "image", label: "Image", content: "" })
  const check = replaceAvailabilityFor(billingNode(), {
    inspectingKey: image.id,
    target: image,
    all: [image],
  })
  assert.equal(check.ok, false)
  if (check.ok) return
  assert.match(check.reason, /can’t replace/i)
})

test("native non-placed selection is treated as incompatible", () => {
  const check = replaceAvailabilityFor(billingNode(), {
    inspectingKey: "Billing details",
    target: undefined,
    all: [],
  })
  assert.equal(check.ok, false)
  if (check.ok) return
  assert.equal(check.reason, REPLACE_INCOMPATIBLE)
})

test("compatible selection → enabled", () => {
  const target = placed({
    id: "placed-1",
    kind: "columns-2",
    label: "2-column section",
  })
  const check = replaceAvailabilityFor(billingNode(), {
    inspectingKey: target.id,
    target,
    all: [target],
  })
  assert.equal(check.ok, true)
})

test("row click inserts even while another element is selected", () => {
  const selected = placed({
    id: "placed-1",
    kind: "heading",
    label: "Heading",
  })
  const inserted = insertSavedIntoDocument(
    doc([selected]),
    billingNode(),
    { kind: "root", zone: "end", index: 1 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  assert.ok(inserted.doc.placedElements.some((element) => element.id === "placed-1"))
  assert.equal(inserted.root.label, "Billing details")
  assert.notEqual(inserted.root.id, "placed-1")
})

test("explicit Replace selected replaces instead", () => {
  const selected = placed({
    id: "placed-1",
    kind: "columns-2",
    label: "2-column section",
    content: "Old",
  })
  const replaced = replaceSelectedWithSaved(
    doc([selected]),
    billingNode(),
    "placed-1",
    counter()
  )
  assert.equal(replaced.ok, true)
  if (!replaced.ok) return
  assert.equal(replaced.doc.placedElements[0]?.label, "Billing details")
  assert.notEqual(replaced.root.id, "placed-1")
})

test("structural glyph derives correctly for representative saved kinds", () => {
  assert.equal(savedItemGlyphKind(billingNode()), "columns-2")
  assert.equal(
    savedItemGlyphKind({ kind: "button", labelHint: "Pay", content: "Pay" }),
    "button"
  )
  assert.equal(
    savedItemGlyphKind({ kind: "image", labelHint: "Image", content: "" }),
    "image"
  )
  assert.equal(
    savedItemGlyphKind({
      kind: "container",
      labelHint: "Notes",
      content: "",
      children: [{ kind: "paragraph", labelHint: "Paragraph", content: "Hello" }],
    }),
    "text"
  )
  assert.equal(
    savedItemGlyphKind({
      kind: "container",
      labelHint: "Block",
      content: "",
      children: [
        { kind: "image", labelHint: "Image", content: "" },
        { kind: "paragraph", labelHint: "Paragraph", content: "Hello" },
      ],
    }),
    "section"
  )
})

test("long-library scrolling does not break drag initiation", () => {
  const library = Array.from({ length: 20 }, (_, index) =>
    createSavedDefinition(`Block ${index + 1}`, {
      kind: "paragraph",
      labelHint: "Paragraph",
      content: `Copy ${index + 1}`,
    })
  )
  assert.equal(library.length, 20)
  const last = library[19]!
  const result = insertSavedIntoDocument(
    doc([]),
    last.root,
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.root.content, "Copy 20")
  assert.match(result.root.id, /^placed-/)
})

test("History toolbar occupancy opens Version history as a left-panel mode", () => {
  const next = applyLeftPanelAction(AI, { type: "open", tool: "version-history" })
  assert.equal(leftPanelMode(next), "version-history")
  assert.equal(next.browsingVersionHistory, true)
  assert.equal(next.addingElement, false)
  assert.equal(next.browsingSavedItems, false)
  assert.equal(next.browsingBrand, false)
  assert.equal(next.panelOpen, true)
})

test("Version history replaces other builder tools instead of stacking", () => {
  const add = applyLeftPanelAction(AI, { type: "open", tool: "add-elements" })
  const next = applyLeftPanelAction(add, { type: "open", tool: "version-history" })
  assert.equal(leftPanelMode(next), "version-history")
  assert.equal(next.addingElement, false)
})

test("toggling Version history while it is open returns to Invoice AI", () => {
  const history = applyLeftPanelAction(AI, { type: "toggle", tool: "version-history" })
  assert.equal(leftPanelMode(history), "version-history")
  const next = applyLeftPanelAction(history, { type: "toggle", tool: "version-history" })
  assert.equal(leftPanelMode(next), "ai")
  assert.equal(next.panelOpen, true)
})

test("closing Version history uses Brand-like return-to-AI semantics", () => {
  const history = applyLeftPanelAction(AI, { type: "open", tool: "version-history" })
  const next = applyLeftPanelAction(history, { type: "close-tool", tool: "version-history" })
  assert.equal(leftPanelMode(next), "ai")
  assert.equal(next.panelOpen, true)
})

test("Version history preserves canvas selection like other tools", () => {
  assert.equal(LEFT_PANEL_PRESERVES_SELECTION["version-history"], true)
})

test("Invoice AI → Saved items → Invoice AI occupancy does not require stacking", () => {
  const saved = applyLeftPanelAction(AI, { type: "open", tool: "saved-items" })
  assert.equal(leftPanelMode(saved), "saved-items")
  const back = applyLeftPanelAction(saved, { type: "open", tool: "ai" })
  assert.equal(leftPanelMode(back), "ai")
})

test("Add elements and Brand boards also replace Version history", () => {
  const history = applyLeftPanelAction(AI, { type: "open", tool: "version-history" })
  const add = applyLeftPanelAction(history, { type: "open", tool: "add-elements" })
  assert.equal(leftPanelMode(add), "add-elements")
  const brand = applyLeftPanelAction(history, { type: "open", tool: "brand-boards" })
  assert.equal(leftPanelMode(brand), "brand-boards")
})
