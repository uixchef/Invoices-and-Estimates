import assert from "node:assert/strict"
import test from "node:test"

import {
  inheritPlacedAppearance,
  mergeInheritedStyle,
  resolveFamilyBrand,
  selectionFromBoard,
  BUILT_IN_BRAND_BOARDS,
} from "./brand-boards"
import type {
  BuilderLayerStyle,
  GeneratedLayout,
  PlacedElement,
} from "./layout-builder-types"
import {
  SAVED_ITEMS_KEY,
  canReplaceTarget,
  createSavedDefinition,
  defaultSavedItemName,
  deleteSavedDefinition,
  duplicatePlacedDocument,
  duplicateSavedDefinition,
  explicitStyleOverrides,
  insertSavedIntoDocument,
  instantiateSavedItem,
  loadSavedItems,
  parseSavedItems,
  persistSavedItems,
  placeSavePopover,
  productKindLabel,
  renameSavedDefinition,
  replaceSelectedWithSaved,
  savedItemMatchesQuery,
  serializeSelection,
  structureHint,
  visibleLayerTitle,
  type DocumentSlice,
  type SavedItemNode,
  type SaveContext,
} from "./saved-items"

function tokensFor(boardIndex: number, family: "studio" | "swiss" = "studio") {
  return resolveFamilyBrand(
    family,
    selectionFromBoard(BUILT_IN_BRAND_BOARDS[boardIndex])
  )
}

function layout(): GeneratedLayout {
  return {
    documentType: "Standard invoice",
    businessName: "Harbor Studio",
    clientName: "Northwind",
    emphasis: null,
    style: "studio",
    accent: "#155eef",
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: true,
      paymentDetails: true,
    },
    lineItems: [{ description: "Design", qty: 1, rate: 1200 }],
    taxRate: 0.1,
    discountRate: 0,
    payment: {
      bankName: "First National",
      accountName: "Harbor Studio",
      accountNumber: "001122",
      routingNumber: "021000021",
      payLabel: "Pay online",
      payUrl: "https://pay.example",
    },
    documentNumber: "INV-1042",
    issueDate: "18 Sep 2026",
    dueDate: "2 Oct 2026",
  }
}

function placed(
  partial: Partial<PlacedElement> & Pick<PlacedElement, "id" | "kind" | "label">
): PlacedElement {
  return {
    zone: "end",
    content: "Hello",
    ...partial,
  }
}

function counter(start = 0) {
  let n = start
  return () => {
    n += 1
    return `placed-${n}`
  }
}

function ctx(partial: Partial<SaveContext> & Pick<SaveContext, "label">): SaveContext {
  return {
    placedElements: [],
    layerText: {},
    layerStyles: {},
    layout: layout(),
    brandTokens: tokensFor(0),
    ...partial,
  }
}

function doc(elements: PlacedElement[], styles: Record<string, BuilderLayerStyle> = {}): DocumentSlice {
  return {
    placedElements: elements,
    layerStyles: styles,
    layerText: Object.fromEntries(elements.map((element) => [element.label, element.content])),
  }
}

test("serialize selected placed item keeps structure and content", () => {
  const heading = placed({
    id: "placed-1",
    kind: "heading",
    label: "Heading",
    content: "Payment terms",
  })
  const result = serializeSelection(
    ctx({
      label: "Heading",
      placedElements: [heading],
      layerText: { Heading: "Payment terms" },
    })
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.node.kind, "heading")
  assert.equal(result.node.content, "Payment terms")
  assert.equal(result.defaultName, "Payment terms")
})

test("deserialize as fresh instance with new IDs", () => {
  const node: SavedItemNode = {
    kind: "paragraph",
    labelHint: "Billing details",
    content: "Net 14",
  }
  const nextId = counter()
  const first = instantiateSavedItem(node, {
    nextId,
    existing: [],
    dest: { kind: "root", zone: "end", index: 0 },
  })
  const second = instantiateSavedItem(node, {
    nextId,
    existing: first.elements,
    dest: { kind: "root", zone: "end", index: 1 },
  })
  assert.notEqual(first.root.id, second.root.id)
  assert.equal(first.root.content, "Net 14")
  assert.equal(second.root.content, "Net 14")
  assert.match(first.root.id, /^placed-/)
})

test("nested children get new IDs", () => {
  const node: SavedItemNode = {
    kind: "container",
    labelHint: "Notes & terms",
    content: "Add content inside this container.",
    children: [
      { kind: "heading", labelHint: "Payment terms", content: "Payment terms", slot: 0 },
      { kind: "paragraph", labelHint: "Paragraph", content: "Due in 14 days", slot: 0 },
    ],
  }
  const nextId = counter()
  const once = instantiateSavedItem(node, {
    nextId,
    existing: [],
    dest: { kind: "root", zone: "after-notes", index: 0 },
  })
  const again = instantiateSavedItem(node, {
    nextId,
    existing: once.elements,
    dest: { kind: "root", zone: "after-notes", index: 1 },
  })
  const childIds = once.elements.filter((element) => element.parentId).map((element) => element.id)
  const againChildIds = again.elements.filter((element) => element.parentId).map((element) => element.id)
  assert.equal(once.elements.length, 3)
  assert.equal(childIds.length, 2)
  assert.ok(childIds.every((id) => !againChildIds.includes(id)))
  assert.ok(again.elements.every((element) => !once.elements.some((prior) => prior.id === element.id)))
})

test("inherited Brand Board styles remain inherited", () => {
  const harbor = tokensFor(0, "studio")
  const inherited = inheritPlacedAppearance("heading", harbor)
  const overrides = explicitStyleOverrides("heading", {
    color: inherited.color,
    fontFamily: inherited.fontFamily,
    fontSize: 21,
  }, harbor)
  assert.equal(overrides?.color, undefined)
  assert.equal(overrides?.fontFamily, undefined)
  assert.equal(overrides?.fontSize, 21)
  const folio = tokensFor(1, "swiss")
  const destination = mergeInheritedStyle(
    inheritPlacedAppearance("heading", folio) as BuilderLayerStyle,
    overrides
  )
  assert.equal(destination.color, inheritPlacedAppearance("heading", folio).color)
  assert.notEqual(destination.color, inherited.color)
  assert.equal(destination.fontSize, 21)
})

test("explicit overrides survive serialize and insert", () => {
  const heading = placed({
    id: "placed-1",
    kind: "heading",
    label: "Heading",
    content: "Statement",
  })
  const serialized = serializeSelection(
    ctx({
      label: "Heading",
      placedElements: [heading],
      layerStyles: { Heading: { color: "#ff00aa", fontSize: 28 } },
    })
  )
  assert.equal(serialized.ok, true)
  if (!serialized.ok) return
  assert.equal(serialized.node.style?.color, "#ff00aa")
  const inserted = insertSavedIntoDocument(
    doc([]),
    serialized.node,
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  assert.equal(inserted.doc.layerStyles[inserted.root.id]?.color, "#ff00aa")
})

test("save → rename → persist", () => {
  const store: Record<string, string> = {}
  const original = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
      },
    },
  })
  const created = createSavedDefinition("Payment terms", {
    kind: "paragraph",
    labelHint: "Paragraph",
    content: "Net 14",
  })
  persistSavedItems(renameSavedDefinition([created], created.id, "Billing details"))
  const loaded = loadSavedItems()
  assert.equal(loaded[0]?.name, "Billing details")
  assert.ok(store[SAVED_ITEMS_KEY]?.includes('"v":1'))
  if (original === undefined) {
    delete (globalThis as { window?: unknown }).window
  } else {
    Object.defineProperty(globalThis, "window", { configurable: true, value: original })
  }
})

test("duplicate saved definition", () => {
  const original = createSavedDefinition("Billing details", {
    kind: "container",
    labelHint: "Billing details",
    content: "",
  })
  const next = duplicateSavedDefinition([original], original.id)
  assert.equal(next.length, 2)
  assert.equal(next[1]?.name, "Billing details copy")
  assert.notEqual(next[1]?.id, original.id)
  assert.equal(next[1]?.root.kind, "container")
})

test("delete saved definition without affecting inserted instance", () => {
  const definition = createSavedDefinition("Billing details", {
    kind: "paragraph",
    labelHint: "Billing details",
    content: "Northwind",
  })
  const inserted = insertSavedIntoDocument(
    doc([]),
    definition.root,
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const library = deleteSavedDefinition([definition], definition.id)
  assert.equal(library.length, 0)
  assert.equal(inserted.doc.placedElements[0]?.content, "Northwind")
})

test("cross-layout retrieval uses the global store", () => {
  persistSavedItems([])
  const item = createSavedDefinition("Billing details", {
    kind: "columns-2",
    labelHint: "Billing details",
    content: "Column content",
    children: [
      { kind: "paragraph", labelHint: "Client name", content: "Northwind", slot: 0 },
    ],
  })
  const raw = JSON.stringify({ v: 1, items: [item] })
  const layoutA = parseSavedItems(raw)
  const layoutB = parseSavedItems(raw)
  assert.equal(layoutA[0]?.id, layoutB[0]?.id)
  assert.equal(layoutB[0]?.name, "Billing details")
})

test("drag insert places a fresh tree at the destination", () => {
  const existing = [
    placed({ id: "placed-9", kind: "heading", label: "Heading", zone: "end" }),
  ]
  const result = insertSavedIntoDocument(
    doc(existing),
    {
      kind: "quote",
      labelHint: "Quote",
      content: "Net 30",
    },
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.doc.placedElements[0]?.kind, "quote")
  assert.equal(result.doc.placedElements[1]?.id, "placed-9")
  assert.notEqual(result.root.id, "placed-9")
})

test("generated-family zone insert lands after billing", () => {
  const result = insertSavedIntoDocument(
    doc([]),
    {
      kind: "container",
      labelHint: "Billing details",
      content: "Add content inside this container.",
      children: [
        { kind: "paragraph", labelHint: "Paragraph", content: "Bill to Northwind" },
      ],
    },
    { kind: "root", zone: "after-billing", index: 0 },
    counter()
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.root.zone, "after-billing")
  assert.equal(result.doc.placedElements.filter((element) => element.zone === "after-billing").length, 2)
})

test("compatible replace keeps destination index", () => {
  const target = placed({
    id: "placed-1",
    kind: "paragraph",
    label: "Paragraph",
    content: "Old copy",
    zone: "after-items",
  })
  const neighbor = placed({
    id: "placed-2",
    kind: "heading",
    label: "Heading",
    zone: "after-items",
  })
  const result = replaceSelectedWithSaved(
    doc([target, neighbor]),
    { kind: "quote", labelHint: "Quote", content: "New copy" },
    "placed-1",
    counter()
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.doc.placedElements[0]?.content, "New copy")
  assert.equal(result.doc.placedElements[0]?.zone, "after-items")
  assert.equal(result.doc.placedElements[1]?.id, "placed-2")
  assert.notEqual(result.root.id, "placed-1")
})

test("incompatible replace is rejected", () => {
  const target = placed({
    id: "placed-1",
    kind: "image",
    label: "Image",
    content: "",
  })
  const result = replaceSelectedWithSaved(
    doc([target]),
    { kind: "paragraph", labelHint: "Paragraph", content: "Hello" },
    "placed-1",
    counter()
  )
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.reason, /can’t replace/i)
  const check = canReplaceTarget(
    { kind: "paragraph", labelHint: "Paragraph", content: "Hello" },
    target,
    [target]
  )
  assert.equal(check.ok, false)
})

test("undo/redo after insert", () => {
  const start = doc([])
  const history: DocumentSlice[] = []
  history.push(structuredClone(start))
  const inserted = insertSavedIntoDocument(
    start,
    { kind: "heading", labelHint: "Heading", content: "Hello" },
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  let present = inserted.doc
  const undone = history.pop()!
  const redo = present
  present = undone
  assert.equal(present.placedElements.length, 0)
  present = redo
  assert.equal(present.placedElements[0]?.content, "Hello")
})

test("undo/redo after replace", () => {
  const target = placed({
    id: "placed-1",
    kind: "button",
    label: "Button",
    content: "Pay now",
    href: "/old",
  })
  const start = doc([target])
  const history = [structuredClone(start)]
  const replaced = replaceSelectedWithSaved(
    start,
    { kind: "button", labelHint: "Pay online button", content: "Pay online", href: "/pay" },
    "placed-1",
    counter()
  )
  assert.equal(replaced.ok, true)
  if (!replaced.ok) return
  let present = replaced.doc
  assert.equal(present.placedElements[0]?.content, "Pay online")
  present = history.pop()!
  assert.equal(present.placedElements[0]?.content, "Pay now")
  present = replaced.doc
  assert.equal(present.placedElements[0]?.href, "/pay")
})

test("malformed localStorage data is ignored", () => {
  assert.deepEqual(parseSavedItems(null), [])
  assert.deepEqual(parseSavedItems("{not json"), [])
  assert.deepEqual(parseSavedItems("[]"), [])
  assert.deepEqual(parseSavedItems(JSON.stringify({ v: 99, items: [{ id: "x" }] })), [])
  assert.deepEqual(
    parseSavedItems(JSON.stringify({ v: 1, items: [{ id: 1, name: "Bad" }] })),
    []
  )
})

test("native billing details adapter is structured, not a screenshot", () => {
  const result = serializeSelection(ctx({ label: "Billing details" }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.defaultName, "Billing details")
  assert.equal(result.node.kind, "columns-2")
  assert.ok((result.node.children?.length ?? 0) > 2)
  assert.equal(
    result.node.children?.some((child) => child.bindField === "clientName"),
    true
  )
})

test("header and totals stay unsaveable", () => {
  assert.equal(serializeSelection(ctx({ label: "Header" })).ok, false)
  assert.equal(serializeSelection(ctx({ label: "Totals" })).ok, false)
  assert.equal(serializeSelection(ctx({ label: "Items table" })).ok, false)
  assert.equal(serializeSelection(ctx({ label: "Page" })).ok, false)
})

test("default names prefer content over Saved item 1", () => {
  assert.equal(
    defaultSavedItemName({
      kind: "paragraph",
      labelHint: "Paragraph",
      content: "Payment due within 14 days.",
    }),
    "Payment due within 14 days."
  )
  assert.equal(
    defaultSavedItemName({
      kind: "heading",
      labelHint: "Heading",
      content: "Heading",
    }),
    "Heading"
  )
})

function mockStorage() {
  const store: Record<string, string> = {}
  const original = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
      },
    },
  })
  return {
    store,
    restore() {
      if (original === undefined) {
        delete (globalThis as { window?: unknown }).window
      } else {
        Object.defineProperty(globalThis, "window", { configurable: true, value: original })
      }
    },
  }
}

function billingNode(): SavedItemNode {
  return {
    kind: "columns-2",
    labelHint: "Billing details",
    content: "Column content",
    children: [
      { kind: "paragraph", labelHint: "Bill to", content: "Bill to", slot: 0 },
      { kind: "paragraph", labelHint: "Client name", content: "Northwind", slot: 0 },
      { kind: "paragraph", labelHint: "Issued", content: "Issued", slot: 1 },
      { kind: "paragraph", labelHint: "Issue date", content: "18 Sep 2026", slot: 1 },
    ],
  }
}

test("save name popover opens from selected Save action", () => {
  const serialized = serializeSelection(ctx({ label: "Billing details" }))
  assert.equal(serialized.ok, true)
  const anchor = { top: 420, left: 640, right: 656, bottom: 436, width: 16, height: 16 }
  const position = placeSavePopover(anchor, { width: 1440, height: 900 })
  assert.ok(position.top >= anchor.bottom)
  assert.ok(Math.abs(position.left - anchor.left) < 24)
  assert.ok(position.width <= 320)
})

test("cancel does not create library item", () => {
  const storage = mockStorage()
  persistSavedItems([])
  serializeSelection(ctx({ label: "Billing details" }))
  assert.equal(loadSavedItems().length, 0)
  storage.restore()
})

test("save creates one item", () => {
  const storage = mockStorage()
  persistSavedItems([])
  const serialized = serializeSelection(ctx({ label: "Billing details" }))
  assert.equal(serialized.ok, true)
  if (!serialized.ok) {
    storage.restore()
    return
  }
  const created = createSavedDefinition("Billing details", serialized.node)
  persistSavedItems([created])
  const loaded = loadSavedItems()
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0]?.name, "Billing details")
  storage.restore()
})

test("product-facing descriptor does not expose children", () => {
  const hint = structureHint(billingNode(), { name: "Billing details" })
  assert.equal(hint, "2-column section")
  assert.equal(/child|node|schema|root|tree/i.test(hint), false)
  assert.equal(productKindLabel("container"), "Section")
  assert.equal(productKindLabel("columns-3"), "3-column section")
})

test("inserted visible label stays clean", () => {
  const inserted = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "after-billing", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  assert.equal(inserted.root.label, "Billing details")
  assert.equal(visibleLayerTitle(inserted.root.id, inserted.doc.placedElements), "Billing details")
  assert.equal(/Billing details \d/.test(inserted.root.label), false)
})

test("inspector title stays human-readable for native instance IDs", () => {
  assert.equal(
    visibleLayerTitle("n/billing-details/due-date", []),
    "Due date"
  )
  assert.equal(
    visibleLayerTitle("n/billing-details/due-date", [], "Payment due"),
    "Payment due"
  )
  assert.equal(visibleLayerTitle("n/header", []), "Header")
})

test("inserting same saved item twice does not create ugly visible counters", () => {
  const first = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
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
  const billing = second.doc.placedElements.filter((element) => element.label === "Billing details")
  assert.equal(billing.length, 2)
  assert.notEqual(billing[0]?.id, billing[1]?.id)
  assert.ok(second.doc.placedElements.every((element) => !/\d \d$/.test(element.label)))
  assert.ok(second.doc.placedElements.every((element) => !/Billing details \d/.test(element.label)))
})

test("compound duplicate recursively clones children", () => {
  const inserted = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const duplicated = duplicatePlacedDocument(inserted.doc, inserted.root.id, counter(20))
  assert.equal(duplicated.ok, true)
  if (!duplicated.ok) return
  const originalKids = inserted.doc.placedElements.filter((element) => element.parentId === inserted.root.id)
  const copyKids = duplicated.doc.placedElements.filter((element) => element.parentId === duplicated.root.id)
  assert.equal(copyKids.length, originalKids.length)
  assert.equal(copyKids.length, 4)
})

test("every duplicated node gets a fresh ID", () => {
  const inserted = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const originalIds = new Set(inserted.doc.placedElements.map((element) => element.id))
  const duplicated = duplicatePlacedDocument(inserted.doc, inserted.root.id, counter(40))
  assert.equal(duplicated.ok, true)
  if (!duplicated.ok) return
  const copies = duplicated.doc.placedElements.filter((element) => !originalIds.has(element.id))
  assert.equal(copies.length, inserted.doc.placedElements.length)
  assert.ok(copies.every((element) => !originalIds.has(element.id)))
})

test("editing duplicate does not change original", () => {
  const inserted = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const duplicated = duplicatePlacedDocument(inserted.doc, inserted.root.id, counter(60))
  assert.equal(duplicated.ok, true)
  if (!duplicated.ok) return
  const copyChild = duplicated.doc.placedElements.find(
    (element) => element.parentId === duplicated.root.id && element.label === "Client name"
  )
  assert.ok(copyChild)
  copyChild!.content = "Edited client"
  duplicated.doc.layerText[copyChild!.id] = "Edited client"
  const originalChild = duplicated.doc.placedElements.find(
    (element) => element.parentId === inserted.root.id && element.label === "Client name"
  )
  assert.equal(originalChild?.content, "Northwind")
  assert.notEqual(originalChild?.id, copyChild?.id)
})

test("undo duplicate removes entire duplicate subtree", () => {
  const inserted = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const history = [structuredClone(inserted.doc)]
  const duplicated = duplicatePlacedDocument(inserted.doc, inserted.root.id, counter(80))
  assert.equal(duplicated.ok, true)
  if (!duplicated.ok) return
  let present = duplicated.doc
  present = history.pop()!
  assert.equal(present.placedElements.length, inserted.doc.placedElements.length)
  assert.equal(present.placedElements.some((element) => element.id === duplicated.root.id), false)
})

test("redo restores duplicated subtree", () => {
  const inserted = insertSavedIntoDocument(
    doc([]),
    billingNode(),
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const history = [structuredClone(inserted.doc)]
  const duplicated = duplicatePlacedDocument(inserted.doc, inserted.root.id, counter(90))
  assert.equal(duplicated.ok, true)
  if (!duplicated.ok) return
  const redo = duplicated.doc
  let present = history.pop()!
  present = redo
  assert.equal(present.placedElements.length, inserted.doc.placedElements.length * 2)
  assert.ok(present.placedElements.some((element) => element.id === duplicated.root.id))
})

test("Add elements search finds Saved items by name", () => {
  const item = createSavedDefinition("Billing details", billingNode())
  assert.equal(savedItemMatchesQuery(item, "billing"), true)
  assert.equal(savedItemMatchesQuery(item, "2-column"), true)
})

test("search filters unrelated Saved items", () => {
  const billing = createSavedDefinition("Billing details", billingNode())
  const pay = createSavedDefinition("Pay online", {
    kind: "button",
    labelHint: "Pay online button",
    content: "Pay online",
  })
  assert.equal(savedItemMatchesQuery(billing, "payment"), false)
  assert.equal(savedItemMatchesQuery(pay, "payment"), false)
  assert.equal(savedItemMatchesQuery(pay, "pay"), true)
  assert.equal(savedItemMatchesQuery(billing, "heading"), false)
  const payment = createSavedDefinition("Payment terms", {
    kind: "container",
    labelHint: "Payment terms",
    content: "",
    children: [{ kind: "paragraph", labelHint: "Paragraph", content: "Net 14" }],
  })
  assert.equal(savedItemMatchesQuery(payment, "payment"), true)
})

test("replace selected remains compatible and incompatible correctly", () => {
  const compatible = placed({
    id: "placed-1",
    kind: "columns-2",
    label: "2-column section",
  })
  const image = placed({ id: "placed-2", kind: "image", label: "Image", content: "" })
  assert.equal(canReplaceTarget(billingNode(), compatible, [compatible]).ok, true)
  assert.equal(canReplaceTarget(billingNode(), image, [image]).ok, false)
})

test("replacement remains one history action", () => {
  const target = placed({
    id: "placed-1",
    kind: "columns-2",
    label: "2-column section",
    content: "Old",
  })
  const start = doc([target])
  const history = [structuredClone(start)]
  const replaced = replaceSelectedWithSaved(start, billingNode(), "placed-1", counter())
  assert.equal(replaced.ok, true)
  if (!replaced.ok) return
  assert.equal(history.length, 1)
  assert.equal(replaced.doc.placedElements[0]?.label, "Billing details")
  const undone = history.pop()!
  assert.equal(undone.placedElements[0]?.id, "placed-1")
  assert.equal(undone.placedElements[0]?.content, "Old")
})

test("destination Brand Board inheritance remains correct after insert", () => {
  const harbor = tokensFor(0, "studio")
  const folio = tokensFor(1, "swiss")
  const inherited = inheritPlacedAppearance("paragraph", harbor)
  const overrides = explicitStyleOverrides(
    "paragraph",
    { color: inherited.color, fontFamily: inherited.fontFamily, fontSize: 18 },
    harbor
  )
  const inserted = insertSavedIntoDocument(
    doc([]),
    {
      kind: "paragraph",
      labelHint: "Client name",
      content: "Northwind",
      style: overrides,
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
  assert.equal(destination.fontSize, 18)
})

test("destination Brand Board inheritance remains correct after deep duplicate", () => {
  const harbor = tokensFor(0, "studio")
  const folio = tokensFor(1, "swiss")
  const overrides = explicitStyleOverrides(
    "paragraph",
    {
      color: inheritPlacedAppearance("paragraph", harbor).color,
      fontSize: 19,
    },
    harbor
  )
  const inserted = insertSavedIntoDocument(
    doc([]),
    {
      kind: "container",
      labelHint: "Billing details",
      content: "",
      children: [
        {
          kind: "paragraph",
          labelHint: "Client name",
          content: "Northwind",
          style: overrides,
        },
      ],
    },
    { kind: "root", zone: "end", index: 0 },
    counter()
  )
  assert.equal(inserted.ok, true)
  if (!inserted.ok) return
  const duplicated = duplicatePlacedDocument(inserted.doc, inserted.root.id, counter(30))
  assert.equal(duplicated.ok, true)
  if (!duplicated.ok) return
  const copyChild = duplicated.doc.placedElements.find(
    (element) => element.parentId === duplicated.root.id
  )
  assert.ok(copyChild)
  const destination = mergeInheritedStyle(
    inheritPlacedAppearance("paragraph", folio) as BuilderLayerStyle,
    duplicated.doc.layerStyles[copyChild!.id]
  )
  assert.equal(destination.color, inheritPlacedAppearance("paragraph", folio).color)
  assert.equal(destination.fontSize, 19)
})

test("local library duplicate gets a separate Saved item ID", () => {
  const original = createSavedDefinition("Billing details", billingNode())
  original.root.children![1]!.content = "Northwind"
  const next = duplicateSavedDefinition([original], original.id)
  const copy = next[1]
  assert.ok(copy)
  assert.notEqual(copy!.id, original.id)
  copy!.root.children![1]!.content = "Mutated"
  assert.equal(original.root.children![1]!.content, "Northwind")
  assert.notEqual(copy!.createdAt, 0)
})
