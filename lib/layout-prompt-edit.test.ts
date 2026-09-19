import assert from "node:assert/strict"
import test from "node:test"

import { demoPaymentDetails } from "./demo-payment"
import { invoiceTotals } from "./invoice-totals"
import type { GeneratedLayout } from "./layout-builder-types"
import {
  applyPromptEdit,
  BOLD_BRAND_ACCENT,
  hasBoldBrandedAccent,
  mergeLayoutContent,
} from "./layout-prompt-edit"
import { FAMILY_ACCENT } from "./layout-family"
import {
  buildEditSummary,
  buildRecommendations,
} from "./builder-narrative"

function baseLayout(overrides: Partial<GeneratedLayout> = {}): GeneratedLayout {
  const documentNumber = "INV-2026-0142"
  const businessName = "Northwind Studio"
  return {
    documentType: "Standard invoice",
    businessName,
    clientName: "Atelier Mär",
    emphasis: null,
    style: "studio",
    accent: FAMILY_ACCENT.studio,
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
    lineItems: [
      { description: "Brand identity & art direction", qty: 1, rate: 4800 },
      { description: "Campaign layout system", qty: 1, rate: 3200 },
      { description: "Design implementation", qty: 12, rate: 140 },
    ],
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber,
    issueDate: "Sep 17, 2026",
    dueDate: "Oct 1, 2026",
    payment: demoPaymentDetails({ businessName, documentNumber }),
    ...overrides,
  }
}

test("discount row mutates document data and recomputes totals", () => {
  const before = invoiceTotals(baseLayout())
  assert.equal(before.discount, 0)
  assert.equal(before.subtotal, 9680)
  assert.equal(before.tax, 968)
  assert.equal(before.total, 10648)

  const after = applyPromptEdit(baseLayout(), "Add a discount row")
  assert.equal(after.sections.discount, true)
  assert.equal(after.style, "studio")
  assert.equal(after.discountRate, 0.1)

  const totals = invoiceTotals(after)
  assert.equal(totals.discount, 968)
  assert.equal(totals.tax, 871.2)
  assert.equal(totals.total, 9583.2)
  assert.equal(after.lineItems.length, 3)
})

test("pay online adds a placed button with demo payment URL", () => {
  const after = applyPromptEdit(baseLayout(), "Add a 'Pay online' button")
  assert.equal(after.sections.onlinePayment, true)
  assert.equal(after.style, "studio")
  assert.equal(after.payment.payLabel, "Pay online")
  assert.match(after.payment.payUrl, /^https:\/\/pay\.layouts-ai\.demo\/invoice\//)
  assert.equal(after.sections.paymentDetails, false)
  const button = after.blocks?.find((block) => block.kind === "button")
  assert.equal(button?.content, "Pay online")
  assert.equal(button?.zone, "after-totals")
  assert.equal(button?.href, after.payment.payUrl)
  assert.match(button?.id ?? "", /^placed-\d+$/)
})

test("bank details add structured payment fields", () => {
  const after = applyPromptEdit(baseLayout(), "Add bank and payment details")
  assert.equal(after.sections.paymentDetails, true)
  assert.equal(after.payment.bankName, "First National Bank")
  assert.equal(after.payment.accountName, "Northwind Studio")
  assert.equal(after.payment.accountNumber, "4829 1103 7741")
  assert.equal(after.payment.routingNumber, "021000021")
  const section = after.blocks?.find((block) => block.label === "Payment details")
  assert.equal(section?.kind, "columns-2")
  assert.equal(section?.zone, "after-notes")
  const children = after.blocks?.filter((block) => block.parentId === section?.id)
  assert.equal(children?.length, 4)
})

test("bold branded color scheme keeps the family and changes accent tokens", () => {
  const after = applyPromptEdit(
    baseLayout(),
    "Switch to a bold, branded color scheme"
  )
  assert.equal(after.style, "studio")
  assert.equal(after.accent, BOLD_BRAND_ACCENT.studio)
  assert.notEqual(after.accent, FAMILY_ACCENT.studio)
  assert.equal(hasBoldBrandedAccent(after), true)
  assert.equal(after.brandTheme?.primary, BOLD_BRAND_ACCENT.studio)
  assert.equal(after.brand, undefined)

  const editorial = applyPromptEdit(
    baseLayout({ style: "editorial", accent: FAMILY_ACCENT.editorial }),
    "Switch to a bold, branded color scheme"
  )
  assert.equal(editorial.style, "editorial")
  assert.equal(editorial.accent, BOLD_BRAND_ACCENT.editorial)
})

test("another line item is real data and recomputes dependent totals", () => {
  const start = applyPromptEdit(baseLayout(), "Add a discount row")
  const after = applyPromptEdit(start, "Add another line item")
  assert.equal(after.lineItems.length, 4)
  assert.equal(after.style, "studio")

  const beforeTotals = invoiceTotals(start)
  const afterTotals = invoiceTotals(after)
  assert.ok(afterTotals.subtotal > beforeTotals.subtotal)
  const extra = after.lineItems[3]
  const extraAmount = extra.qty * extra.rate
  assert.equal(afterTotals.subtotal, beforeTotals.subtotal + extraAmount)
  assert.equal(afterTotals.discount, afterTotals.subtotal * 0.1)
  assert.equal(
    afterTotals.tax,
    (afterTotals.subtotal - afterTotals.discount) * 0.1
  )
  assert.equal(
    afterTotals.total,
    afterTotals.subtotal - afterTotals.discount + afterTotals.tax
  )
})

test("supported suggestions stay on the current family when applied in sequence", () => {
  const prompts = [
    "Add a discount row",
    "Add a 'Pay online' button",
    "Add bank and payment details",
    "Switch to a bold, branded color scheme",
    "Add another line item",
  ]
  let layout = baseLayout()
  for (const prompt of prompts) {
    layout = applyPromptEdit(layout, prompt)
  }
  assert.equal(layout.style, "studio")
  assert.equal(layout.sections.discount, true)
  assert.equal(layout.sections.onlinePayment, true)
  assert.equal(layout.sections.paymentDetails, true)
  assert.equal(layout.accent, BOLD_BRAND_ACCENT.studio)
  assert.equal(layout.lineItems.length, 4)
})

test("recommendations omit actions already satisfied", () => {
  const initial = buildRecommendations(baseLayout())
  assert.deepEqual(initial.slice(0, 4), [
    "Add a discount row",
    "Add a 'Pay online' button",
    "Add bank and payment details",
    "Switch to a bold, branded color scheme",
  ])

  const afterPay = applyPromptEdit(baseLayout(), "Add a 'Pay online' button")
  const recs = buildRecommendations(afterPay)
  assert.equal(recs.includes("Add a 'Pay online' button"), false)
  assert.equal(recs[0], "Add a discount row")

  const afterBold = applyPromptEdit(
    afterPay,
    "Switch to a bold, branded color scheme"
  )
  const recsAfterBold = buildRecommendations(afterBold)
  assert.equal(
    recsAfterBold.includes("Switch to a bold, branded color scheme"),
    false
  )
  assert.equal(recsAfterBold.includes("Add another line item"), true)
})

test("edit summary is a short confirmation of the mutation", () => {
  const before = baseLayout()
  const after = applyPromptEdit(before, "Add a discount row")
  const summary = buildEditSummary(before, after)
  assert.match(summary, /Discount added/i)
  assert.equal(summary.includes("I've built a"), false)
})

test("satisfied suggestions return after the mutation is reversed", () => {
  const withDiscount = applyPromptEdit(baseLayout(), "Add a discount row")
  assert.equal(
    buildRecommendations(withDiscount).includes("Add a discount row"),
    false
  )
  const removed = applyPromptEdit(withDiscount, "Remove the discount row")
  assert.equal(removed.sections.discount, false)
  assert.equal(buildRecommendations(removed)[0], "Add a discount row")
  assert.equal(invoiceTotals(removed).discount, 0)
})

test("repeated line items remain valid and recompute totals", () => {
  const once = applyPromptEdit(baseLayout(), "Add another line item")
  const twice = applyPromptEdit(once, "Add another line item")
  assert.equal(once.lineItems.length, 4)
  assert.equal(twice.lineItems.length, 5)
  assert.ok(invoiceTotals(twice).total > invoiceTotals(once).total)
})

test("pay online stays on if requested again and is not re-suggested", () => {
  const once = applyPromptEdit(baseLayout(), "Add a 'Pay online' button")
  const twice = applyPromptEdit(once, "Add a 'Pay online' button")
  assert.equal(twice.sections.onlinePayment, true)
  assert.equal(
    twice.blocks?.filter((block) => block.kind === "button").length,
    1
  )
  assert.equal(twice.blocks?.[0]?.id, once.blocks?.[0]?.id)
  assert.equal(
    buildRecommendations(twice).includes("Add a 'Pay online' button"),
    false
  )
})

test("prompt edits keep manually added blocks on GeneratedLayout", () => {
  const withBlocks = {
    ...baseLayout(),
    blocks: [
      {
        id: "placed-1",
        kind: "heading",
        label: "Heading",
        zone: "end" as const,
        content: "Studio title",
      },
    ],
  }
  const after = applyPromptEdit(withBlocks, "Add a discount row")
  assert.equal(after.blocks?.[0].id, "placed-1")
  const merged = mergeLayoutContent(after, { clientName: "New client" })
  assert.equal(merged.blocks?.[0].kind, "heading")
  assert.equal(merged.clientName, "New client")
})

test("AI add heading below line items is a native placed heading", () => {
  const after = applyPromptEdit(
    baseLayout(),
    "Add a heading called Payment terms below the line items."
  )
  const heading = after.blocks?.find((block) => block.kind === "heading")
  assert.equal(heading?.content, "Payment terms")
  assert.equal(heading?.zone, "after-items")
  assert.equal(after.lineItems.length, baseLayout().lineItems.length)
})

test("mergeLayoutContent can clear a brandTheme overlay", () => {
  const branded = baseLayout({
    brand: {
      boardId: "folio-editorial",
      themeId: "folio-editorial",
      typeId: "editorial-serif",
    },
    brandTheme: {
      id: "folio-editorial-bold",
      name: "Folio editorial bold",
      primary: "#0418c7",
      accent: "#1c1410",
      surface: "#f7f1ea",
      strongSurface: "#0418c7",
      text: "#1c1410",
      mutedText: "#6b625c",
      border: "#e4d9d0",
    },
  })
  const cleared = mergeLayoutContent(branded, {
    brand: branded.brand,
    accent: "#7a2832",
    brandTheme: undefined,
  })
  assert.equal(cleared.brand?.boardId, "folio-editorial")
  assert.equal(cleared.brandTheme, undefined)
  assert.equal(cleared.accent, "#7a2832")
})

test("structural AI edits preserve an applied Brand Board", () => {
  const branded = baseLayout({
    brand: {
      boardId: "folio-editorial",
      themeId: "folio-editorial",
      typeId: "editorial-serif",
    },
    accent: "#7a2832",
  })
  const after = applyPromptEdit(branded, "Add bank and payment details")
  assert.equal(after.style, "studio")
  assert.equal(after.brand?.boardId, "folio-editorial")
  assert.equal(after.accent, "#7a2832")
  assert.equal(after.sections.paymentDetails, true)
})

test("bold branded scheme intensifies the active Brand Board instead of swapping family", () => {
  const branded = baseLayout({
    brand: {
      boardId: "harbor-studio",
      themeId: "harbor-studio",
      typeId: "studio-sans",
    },
    accent: "#1a4cff",
  })
  const after = applyPromptEdit(
    branded,
    "Switch to a bold, branded color scheme"
  )
  assert.equal(after.style, "studio")
  assert.equal(after.brand?.boardId, "harbor-studio")
  assert.equal(after.brand?.themeId, "harbor-studio")
  assert.equal(after.brandTheme?.primary, BOLD_BRAND_ACCENT.studio)
  assert.equal(after.accent, BOLD_BRAND_ACCENT.studio)
})

test("AI heading add keeps the active Brand Board", () => {
  const branded = baseLayout({
    brand: {
      boardId: "harbor-studio",
      themeId: "harbor-studio",
      typeId: "studio-sans",
    },
  })
  const after = applyPromptEdit(branded, "Add a heading called Payment terms")
  assert.equal(after.brand?.boardId, "harbor-studio")
  assert.equal(after.blocks?.some((block) => block.kind === "heading"), true)
})
