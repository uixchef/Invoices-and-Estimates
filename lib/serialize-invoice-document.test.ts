import assert from "node:assert/strict"
import test from "node:test"

import {
  createCustomBoard,
  resolveFamilyBrand,
  selectionFromBoard,
} from "./brand-boards"
import { reconstructLayoutFromReference } from "./reference-layout"
import { getDocumentPageProfile } from "./mediums-data"
import {
  serializeInvoiceDocument,
  serializedHtmlContainsEditorChrome,
} from "./serialize-invoice-document"
import type { GeneratedLayout, PlacedElement } from "./layout-builder-types"
import { LAYOUT_FAMILY_IDS } from "./layout-family"
import { invoiceTotals } from "./invoice-totals"
import { withCopySuffix } from "./native-instance-id"

const page = getDocumentPageProfile(null)

function layout(patch: Partial<GeneratedLayout> = {}): GeneratedLayout {
  const base = reconstructLayoutFromReference("Recreate this.", "Standard invoice")
  return {
    ...base,
    ...patch,
    sections: { ...base.sections, ...patch.sections },
  }
}

function htmlFor(
  doc: GeneratedLayout,
  extras: Partial<Parameters<typeof serializeInvoiceDocument>[0]> = {}
) {
  return serializeInvoiceDocument({
    layout: doc,
    pageProfile: page,
    brandTokens: resolveFamilyBrand(doc.style, doc.brand ?? null, [], doc.brandTheme),
    ...extras,
  })
}

function highCoverage(): GeneratedLayout {
  return layout({
    style: "statement",
    businessName: "Vale Atelier",
    clientName: "Harbor Index",
    documentNumber: "INV-2026-0901",
    brand: {
      boardId: "folio-editorial",
      themeId: "folio-editorial",
      typeId: "editorial-serif",
    },
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: true,
      onlinePayment: true,
      paymentDetails: true,
    },
    discountRate: 0.1,
    taxRate: 0.1,
    lineItems: [
      { description: "Strategy sprint", qty: 1, rate: 2400 },
      { description: "Layout system", qty: 2, rate: 1800 },
      { description: "Print extras", qty: 4, rate: 120 },
    ],
  })
}

test("all six families serialize with family-specific markers", () => {
  for (const family of LAYOUT_FAMILY_IDS) {
    const result = htmlFor(layout({ style: family }))
    assert.equal(result.family, family)
    assert.match(result.html, new RegExp(`data-family="${family}"`))
    assert.match(result.html, /<!doctype html>/i)
  }
})

test("Studio keeps the accent rail; Statement keeps the color field", () => {
  const studio = htmlFor(layout({ style: "studio" }))
  const statement = htmlFor(layout({ style: "statement" }))
  assert.match(studio.html, /studio-rail/)
  assert.match(statement.html, /statement-field/)
  assert.match(statement.html, /Amount due/)
})

test("Swiss serializes the indexed meta grid", () => {
  const swiss = htmlFor(layout({ style: "swiss" }))
  assert.match(swiss.html, /swiss-meta/)
})

test("Editorial and Atelier keep distinct family chrome", () => {
  assert.match(htmlFor(layout({ style: "editorial" })).html, /editorial-rule/)
  assert.match(htmlFor(layout({ style: "atelier" })).html, /atelier-mark/)
  assert.match(htmlFor(layout({ style: "ledger" })).html, /ledger-shell/)
})

test("applied Brand Board tokens appear in synchronized CSS", () => {
  const tokens = resolveFamilyBrand("studio", {
    boardId: "folio-editorial",
    themeId: "folio-editorial",
    typeId: "editorial-serif",
  })
  const result = htmlFor(layout({ style: "studio" }), { brandTokens: tokens })
  assert.match(result.html, new RegExp(tokens.primary.replace("#", ""), "i"))
  assert.match(result.html, /--bb-primary/)
})

test("custom Brand Board tokens appear in synchronized CSS", () => {
  const board = createCustomBoard({
    name: "QA Board",
    theme: {
      primary: "#c45a12",
      accent: "#ea580c",
      surface: "#fff7ed",
      strongSurface: "#7c2d12",
      text: "#1c1917",
      mutedText: "#78716c",
      border: "#fed7aa",
    },
    type: {
      headingFont: "Georgia, serif",
      bodyFont: "Inter, sans-serif",
    },
  })
  const tokens = resolveFamilyBrand("studio", selectionFromBoard(board), [board])
  const result = htmlFor(layout({ style: "studio" }), { brandTokens: tokens })
  assert.match(result.html, /#c45a12/i)
})

test("local style and text overrides appear", () => {
  const result = htmlFor(layout(), {
    layerText: { "Business name": "Edited Co" },
    layerStyles: { "Business name": { color: "#ff00aa", fontSize: 42 } },
  })
  assert.match(result.html, /Edited Co/)
  assert.match(result.html, /#ff00aa/)
  assert.match(result.html, /42px/)
})

test("hidden native elements are omitted", () => {
  const result = htmlFor(
    layout({
      sections: {
        notes: true,
        terms: true,
        logo: true,
        items: true,
        taxes: true,
        discount: false,
        onlinePayment: false,
        paymentDetails: false,
      },
    }),
    {
      hiddenLayers: ["Notes"],
      layerText: { Notes: "SECRET NOTE" },
    }
  )
  assert.doesNotMatch(result.html, /SECRET NOTE/)
})

test("duplicated native fields serialize independently", () => {
  const copyId = withCopySuffix("Business name", 1)
  const result = htmlFor(layout(), {
    layerDuplicates: { "Business name": 1 },
    layerText: {
      "Business name": "Original",
      [copyId]: "Copy",
    },
  })
  assert.match(result.html, /Original/)
  assert.match(result.html, />Copy</)
})

test("placed heading, button, nested columns, and saved-item subtree serialize", () => {
  const columns: PlacedElement = {
    id: "cols-1",
    kind: "columns-2",
    label: "Columns",
    zone: "after-totals",
    content: "",
  }
  const heading: PlacedElement = {
    id: "h-1",
    kind: "heading",
    label: "Heading",
    zone: "after-totals",
    content: "Extra heading",
    parentId: "cols-1",
    slot: 0,
  }
  const paragraph: PlacedElement = {
    id: "p-1",
    kind: "paragraph",
    label: "Paragraph",
    zone: "after-totals",
    content: "Saved paragraph",
    parentId: "cols-1",
    slot: 1,
  }
  const button: PlacedElement = {
    id: "btn-1",
    kind: "button",
    label: "Button",
    zone: "end",
    content: "Pay now",
    href: "https://example.com/pay",
  }
  const result = htmlFor(layout(), {
    placedElements: [columns, heading, paragraph, button],
  })
  assert.match(result.html, /placed-columns/)
  assert.match(result.html, /Extra heading/)
  assert.match(result.html, /Saved paragraph/)
  assert.match(result.html, /Pay now/)
  assert.match(result.html, /https:\/\/example.com\/pay/)
})

test("canonical totals, discount, and Pay online match invoiceTotals", () => {
  const doc = highCoverage()
  const totals = invoiceTotals(doc)
  const result = htmlFor(doc)
  assert.match(result.html, new RegExp(totals.total.toFixed(2)))
  assert.match(result.html, /Discount/)
  assert.match(result.html, /Pay online/)
  assert.match(result.html, /Payment details/)
  assert.equal((result.html.match(/class="total"|statement-amount/g) ?? []).length > 0, true)
  const dueCount = result.html.split(totals.total.toFixed(2)).length - 1
  assert.ok(dueCount >= 1)
  assert.ok(dueCount <= 2, `expected totals once or twice in header+footer, got ${dueCount}`)
})

test("blob image sources are not exported as portable URLs", () => {
  const image: PlacedElement = {
    id: "img-1",
    kind: "image",
    label: "Photo",
    zone: "end",
    content: "",
  }
  const result = htmlFor(layout(), {
    placedElements: [image],
    layerStyles: {
      "img-1": { backgroundImage: "blob:http://localhost/1", imageAlt: "Studio still" },
    },
  })
  assert.doesNotMatch(result.html, /blob:/)
  assert.match(result.html, /session-local/)
  assert.match(result.html, /Studio still/)
})

test("stable data URLs are serialized with alt text", () => {
  const image: PlacedElement = {
    id: "img-2",
    kind: "image",
    label: "Logo",
    zone: "end",
    content: "",
  }
  const data = "data:image/gif;base64,R0lGODlhAQABAAAAACw="
  const result = htmlFor(layout(), {
    placedElements: [image],
    layerStyles: {
      "img-2": { backgroundImage: data, imageAlt: "Mark" },
    },
  })
  assert.match(result.html, /data:image\/gif/)
  assert.match(result.html, /alt="Mark"/)
})

test("reference reconstruction serializes the Result document, not a source image", () => {
  const result = htmlFor(layout({ businessName: "Saffron" }))
  assert.match(result.html, /Saffron/)
  assert.doesNotMatch(result.html, /saffron-invoice-reference/)
  assert.doesNotMatch(result.html, /<img src="reference/)
})

test("page properties contribute watermark and background", () => {
  const result = htmlFor(layout(), {
    layerStyles: {
      Page: { backgroundColor: "#fafafa", watermarkType: "text", watermarkText: "DRAFT" },
    },
  })
  assert.match(result.html, /#fafafa/)
  assert.match(result.html, /DRAFT/)
  assert.match(result.html, new RegExp(String(page.widthPx)))
})

test("dynamic text is escaped", () => {
  const result = htmlFor(layout({ businessName: `Acme <script>alert("x")</script>` }))
  assert.doesNotMatch(result.html, /<script>alert/)
  assert.match(result.html, /&lt;script&gt;/)
})

test("no editor chrome leaks into output", () => {
  const result = htmlFor(layout())
  assert.equal(serializedHtmlContainsEditorChrome(result.html), false)
  assert.doesNotMatch(result.html, /data-el=/)
  assert.match(result.html, /<table class="line-items">/)
  assert.match(result.html, /<(h1|h2|p class="masthead")/)
})

test("document mutation changes synchronized code; selection is not an input", () => {
  const before = htmlFor(layout({ businessName: "Northwind" })).html
  const after = htmlFor(layout({ businessName: "Edited Co" })).html
  assert.notEqual(before, after)
  const again = htmlFor(layout({ businessName: "Edited Co" })).html
  assert.equal(after, again)
})

test("opening Code does not imply a codeOverride", () => {
  const result = htmlFor(layout())
  assert.match(result.html, /invoice-/)
})

test("long invoices keep a single semantic document, not measurement clones", () => {
  const doc = layout({
    lineItems: Array.from({ length: 40 }, (_, index) => ({
      description: `Line ${index + 1}`,
      qty: 1,
      rate: 100,
    })),
  })
  const result = htmlFor(doc)
  assert.equal(result.html.split("<article").length - 1, 1)
  assert.match(result.html, /Line 40/)
})
