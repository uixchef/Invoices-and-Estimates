import assert from "node:assert/strict"
import test from "node:test"

import { getDefaultPlacedContent, getPlacedElementLayerKind } from "./placed-element-defaults"
import {
  ADD_ELEMENT_KINDS,
  insertIndexForZone,
  insertPlacedElement,
  inspectorTabForKind,
  nextPlacedLabel,
  parseElementDrag,
  resolveTableAdd,
  withLayoutBlocks,
} from "./placed-elements"
import { invoiceTotals, lineAmount } from "./invoice-totals"
import { applyBlockPrompt } from "./placed-element-prompt"
import { pickDropSlot, relocatePlacedElement } from "./placed-tree"
import { ELEMENT_DRAG_MIME, type GeneratedLayout, type PlacedElement } from "./layout-builder-types"

function block(partial: Partial<PlacedElement> & Pick<PlacedElement, "id" | "kind" | "label">): PlacedElement {
  return {
    zone: "end",
    content: "Hello",
    ...partial,
  }
}

test("click-to-add and indexed drop insert the same placed-element shape", () => {
  const created = block({ id: "placed-1", kind: "heading", label: "Heading" })
  const appended = insertPlacedElement([], created)
  const indexed = insertPlacedElement(
    [block({ id: "placed-0", kind: "paragraph", label: "Paragraph" })],
    created,
    0
  )
  assert.equal(appended[0].kind, "heading")
  assert.equal(indexed[0].id, "placed-1")
  assert.equal(indexed[1].kind, "paragraph")
})

test("visible labels stay human-readable without automatic counters", () => {
  const existing = [
    block({ id: "a", kind: "heading", label: "Heading" }),
    block({ id: "b", kind: "paragraph", label: "Paragraph" }),
    block({ id: "c", kind: "columns-2", label: "2-column section" }),
  ]
  assert.equal(nextPlacedLabel(existing, "heading", "Heading"), "Heading")
  assert.equal(nextPlacedLabel(existing, "quote", "Quote"), "Quote")
  assert.equal(nextPlacedLabel(existing, "columns-2", "2"), "2-column section")
})

test("table add is a singleton against a visible items table", () => {
  assert.deepEqual(resolveTableAdd({ isBlankSession: true, itemsVisible: false }), {
    action: "place-bound",
  })
  assert.equal(
    resolveTableAdd({ isBlankSession: false, itemsVisible: true }).action,
    "select-existing"
  )
  assert.equal(
    resolveTableAdd({ isBlankSession: false, itemsVisible: false }).action,
    "enable-items"
  )
})

test("parseElementDrag reads the palette MIME payload", () => {
  const payload = JSON.stringify({ kind: "quote", label: "Quote" })
  assert.deepEqual(
    parseElementDrag({ getData: (type) => (type === ELEMENT_DRAG_MIME ? payload : "") }),
    { kind: "quote", label: "Quote" }
  )
  assert.equal(
    parseElementDrag({ getData: () => "" }),
    null
  )
})

test("inspector opens on content for copy, style for structural media", () => {
  assert.equal(inspectorTabForKind("heading"), "content")
  assert.equal(inspectorTabForKind("button"), "content")
  assert.equal(inspectorTabForKind("image"), "style")
  assert.equal(inspectorTabForKind("divider"), "style")
  assert.equal(inspectorTabForKind("container"), "style")
})

test("every Add elements catalogue kind has native defaults", () => {
  for (const kind of ADD_ELEMENT_KINDS) {
    assert.equal(typeof getDefaultPlacedContent(kind), "string")
    assert.ok(getPlacedElementLayerKind(kind))
    assert.match(inspectorTabForKind(kind), /content|style|advanced/)
  }
})

test("insertIndexForZone drops between existing elements in a zone", () => {
  const existing = [
    block({ id: "a", kind: "heading", label: "Heading", zone: "after-billing" }),
    block({ id: "b", kind: "quote", label: "Quote", zone: "after-billing" }),
    block({ id: "c", kind: "divider", label: "Divider", zone: "after-notes" }),
  ]
  assert.equal(insertIndexForZone(existing, "after-billing", 0), 0)
  assert.equal(insertIndexForZone(existing, "after-billing", 1), 1)
  assert.equal(insertIndexForZone(existing, "after-billing", 2), 2)
  assert.equal(insertIndexForZone(existing, "after-items", 0), 2)
  assert.equal(insertIndexForZone(existing, "end", 0), 3)
})

test("bound line-item edits feed canonical invoice totals", () => {
  const layout = {
    documentType: "Standard invoice",
    businessName: "Studio",
    clientName: "Client",
    emphasis: null,
    style: "studio",
    accent: "#1a4cff",
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Work", qty: 2, rate: 50 }],
    taxRate: 0.1,
    discountRate: 0,
    documentNumber: "INV-1",
    issueDate: "Sep 18, 2026",
    dueDate: "Oct 1, 2026",
    payment: {
      bankName: "Bank",
      accountName: "Studio",
      accountNumber: "1",
      routingNumber: "2",
      payUrl: "https://pay.example",
      payLabel: "Pay online",
    },
  } as GeneratedLayout
  assert.equal(lineAmount(layout.lineItems[0]), 100)
  assert.equal(invoiceTotals(layout).subtotal, 100)
  assert.equal(invoiceTotals(layout).tax, 10)
  assert.equal(invoiceTotals(layout).total, 110)
})

test("blocks live on GeneratedLayout so AI merges keep manual additions", () => {
  const layout = {
    documentType: "Standard invoice",
    businessName: "Studio",
    clientName: "Client",
    emphasis: null,
    style: "studio",
    accent: "#1a4cff",
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Work", qty: 1, rate: 100 }],
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber: "INV-1",
    issueDate: "Sep 18, 2026",
    dueDate: "Oct 1, 2026",
    payment: {
      bankName: "Bank",
      accountName: "Studio",
      accountNumber: "1",
      routingNumber: "2",
      payUrl: "https://pay.example",
      payLabel: "Pay online",
    },
  } as GeneratedLayout
  const blocks = [block({ id: "placed-1", kind: "heading", label: "Heading" })]
  const next = withLayoutBlocks(layout, blocks)
  assert.equal(next.blocks?.[0].kind, "heading")
  assert.equal(layout.blocks, undefined)
})

test("relocate moves a block without duplicating it", () => {
  const existing = [
    block({ id: "placed-1", kind: "heading", label: "Heading", zone: "end" }),
    block({ id: "placed-2", kind: "quote", label: "Quote", zone: "end" }),
    block({ id: "placed-3", kind: "button", label: "Button", zone: "end" }),
  ]
  const moved = relocatePlacedElement(existing, "placed-2", {
    kind: "root",
    zone: "end",
    index: 0,
  })
  assert.equal(moved.map((element) => element.id).join(","), "placed-2,placed-1,placed-3")
  const down = relocatePlacedElement(existing, "placed-1", {
    kind: "root",
    zone: "end",
    index: 2,
  })
  assert.equal(down.map((element) => element.id).join(","), "placed-2,placed-1,placed-3")
})

test("nearest drop slot follows the pointer on the paper", () => {
  const picked = pickDropSlot(
    50,
    80,
    [
      { key: "a", dest: { kind: "root", zone: "end", index: 0 }, rect: { top: 0, bottom: 20, left: 0, right: 100 } },
      { key: "b", dest: { kind: "root", zone: "end", index: 1 }, rect: { top: 90, bottom: 110, left: 0, right: 100 } },
    ],
    { top: 0, bottom: 200, left: 0, right: 100 }
  )
  assert.equal(picked?.key, "b")
})

test("AI heading add is a native placed heading", () => {
  const layout = {
    documentType: "Standard invoice",
    businessName: "Studio",
    clientName: "Client",
    emphasis: null,
    style: "studio",
    accent: "#1a4cff",
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Work", qty: 1, rate: 100 }],
    taxRate: 0.1,
    discountRate: 0,
    documentNumber: "INV-1",
    issueDate: "Sep 18, 2026",
    dueDate: "Oct 1, 2026",
    payment: {
      bankName: "Bank",
      accountName: "Studio",
      accountNumber: "1",
      routingNumber: "2",
      payUrl: "https://pay.example",
      payLabel: "Pay online",
    },
  } as GeneratedLayout
  const result = applyBlockPrompt(
    [],
    layout,
    "Add a heading called Payment terms below the line items."
  )
  assert.equal(result.handled, true)
  assert.equal(result.placed[0].kind, "heading")
  assert.equal(result.placed[0].content, "Payment terms")
  assert.equal(result.placed[0].zone, "after-items")
  const again = applyBlockPrompt(
    result.placed,
    layout,
    "Add a heading called Payment terms below the line items."
  )
  assert.equal(again.placed.length, 1)
})
