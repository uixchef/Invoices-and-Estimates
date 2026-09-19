import assert from "node:assert/strict"
import test from "node:test"

import {
  applyStyleOverride,
  parseScopedStylePrompt,
  resolveElementProperties,
} from "./element-properties"
import {
  BOLD_BRAND_ACCENT,
  canExecuteDocumentAction,
  documentActionCopyIsIsolated,
  documentActionUnderstanding,
  endDocumentAction,
  executeDocumentAction,
  findPayOnlineButton,
  findPaymentDetailsRoot,
  hasBoldBrandedAccent,
  isStyleOnlyDocumentAction,
  matchDocumentAction,
  payOnlineZone,
  paymentDetailsZone,
  tryBeginDocumentAction,
  type DocumentActionGate,
  type DocumentActionId,
} from "./document-actions"
import { demoPaymentDetails } from "./demo-payment"
import { invoiceTotals } from "./invoice-totals"
import { FAMILY_ACCENT } from "./layout-family"
import type { GeneratedLayout, PlacedElement } from "./layout-builder-types"
import { applyPromptEdit } from "./layout-prompt-edit"
import { resolveFamilyBrand } from "./brand-boards"
import { boundValue } from "./placed-element-prompt"

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

function ctx(layout: GeneratedLayout, placed: PlacedElement[] = []) {
  return { layout, placed: placed.length ? placed : layout.blocks ?? [] }
}

test("document action applicability matches suggestion copy", () => {
  assert.equal(matchDocumentAction("Add a discount row"), "add-discount-row")
  assert.equal(
    matchDocumentAction("Add a 'Pay online' button"),
    "add-pay-online"
  )
  assert.equal(
    matchDocumentAction("Add bank and payment details"),
    "add-payment-details"
  )
  assert.equal(
    matchDocumentAction("Switch to a bold, branded color scheme"),
    "switch-bold-brand"
  )
  assert.equal(matchDocumentAction("Remove the discount row"), null)
  const empty = ctx(baseLayout())
  assert.equal(canExecuteDocumentAction("add-discount-row", empty), true)
  const discounted = executeDocumentAction("add-discount-row", empty)
  assert.equal(
    canExecuteDocumentAction("add-discount-row", ctx(discounted.layout)),
    false
  )
})

test("discount is a totals mutation with one undo snapshot", () => {
  const before = baseLayout()
  const snapshot = structuredClone(before)
  const result = executeDocumentAction("add-discount-row", ctx(before))
  assert.equal(result.changed, true)
  assert.equal(result.layout.sections.discount, true)
  assert.equal(result.layout.clientName, before.clientName)
  assert.equal(result.layout.lineItems.length, 3)
  const totals = invoiceTotals(result.layout)
  assert.equal(totals.discount, 968)
  assert.equal(totals.tax, 871.2)
  assert.equal(totals.total, 9583.2)
  const undone = snapshot
  assert.equal(undone.sections.discount, false)
  assert.equal(invoiceTotals(undone).discount, 0)
  const redone = executeDocumentAction("add-discount-row", ctx(undone))
  assert.equal(redone.layout.sections.discount, true)
  assert.equal(invoiceTotals(redone.layout).total, totals.total)
})

test("pay online inserts a fresh stable placed button in a family zone", () => {
  const studio = executeDocumentAction("add-pay-online", ctx(baseLayout()))
  const button = findPayOnlineButton(studio.placed)
  assert.ok(button)
  assert.match(button!.id, /^placed-\d+$/)
  assert.equal(button!.zone, payOnlineZone("studio"))
  assert.equal(studio.layout.businessName, "Northwind Studio")

  const statement = executeDocumentAction(
    "add-pay-online",
    ctx(baseLayout({ style: "statement", accent: FAMILY_ACCENT.statement }))
  )
  assert.equal(findPayOnlineButton(statement.placed)?.zone, "after-notes")

  const swiss = executeDocumentAction(
    "add-pay-online",
    ctx(baseLayout({ style: "swiss", accent: FAMILY_ACCENT.swiss }))
  )
  assert.equal(findPayOnlineButton(swiss.placed)?.zone, "after-totals")
  assert.equal(swiss.layout.style, "swiss")
})

test("payment details is a placed subtree with demo bindings", () => {
  const result = executeDocumentAction("add-payment-details", ctx(baseLayout()))
  const root = findPaymentDetailsRoot(result.placed)
  assert.equal(root?.kind, "columns-2")
  assert.equal(root?.zone, paymentDetailsZone("studio"))
  const children = result.placed.filter((element) => element.parentId === root?.id)
  assert.equal(children.length, 4)
  const bank = children.find((child) => child.bindField === "payment.bankName")
  assert.equal(boundValue(result.layout, bank?.bindField), "First National Bank")
  const swiss = executeDocumentAction(
    "add-payment-details",
    ctx(baseLayout({ style: "swiss", accent: FAMILY_ACCENT.swiss }))
  )
  assert.equal(findPaymentDetailsRoot(swiss.placed)?.zone, "after-totals")
})

test("repeated execution is idempotent and keeps ids", () => {
  const first = executeDocumentAction("add-pay-online", ctx(baseLayout()))
  const second = executeDocumentAction(
    "add-pay-online",
    ctx(first.layout, first.placed)
  )
  assert.equal(second.alreadyPresent, true)
  assert.equal(second.changed, false)
  assert.equal(second.inspect?.id, first.inspect?.id)
  assert.equal(second.placed.filter((element) => element.kind === "button").length, 1)

  const discountOnce = executeDocumentAction("add-discount-row", ctx(baseLayout()))
  const discountTwice = executeDocumentAction(
    "add-discount-row",
    ctx(discountOnce.layout)
  )
  assert.equal(discountTwice.alreadyPresent, true)
  assert.equal(invoiceTotals(discountTwice.layout).discount, 968)

  const payDetails = executeDocumentAction("add-payment-details", ctx(baseLayout()))
  const payDetailsAgain = executeDocumentAction(
    "add-payment-details",
    ctx(payDetails.layout, payDetails.placed)
  )
  assert.equal(payDetailsAgain.alreadyPresent, true)
  assert.equal(
    payDetailsAgain.placed.filter((element) => element.label === "Payment details")
      .length,
    1
  )
})

test("bold brand uses family tokens or the active board without swapping family", () => {
  const plain = executeDocumentAction("switch-bold-brand", ctx(baseLayout()))
  assert.equal(plain.layout.style, "studio")
  assert.equal(plain.layout.accent, BOLD_BRAND_ACCENT.studio)
  assert.equal(plain.layout.brand, undefined)
  const tokens = resolveFamilyBrand(
    "studio",
    null,
    [],
    plain.layout.brandTheme
  )
  assert.equal(tokens.primary, BOLD_BRAND_ACCENT.studio)

  const branded = executeDocumentAction(
    "switch-bold-brand",
    ctx(
      baseLayout({
        brand: {
          boardId: "harbor-studio",
          themeId: "harbor-studio",
          typeId: "studio-sans",
        },
      })
    )
  )
  assert.equal(branded.layout.brand?.boardId, "harbor-studio")
  assert.equal(branded.layout.brandTheme?.primary, BOLD_BRAND_ACCENT.studio)
  assert.equal(hasBoldBrandedAccent(branded.layout), true)
  const again = executeDocumentAction(
    "switch-bold-brand",
    ctx(branded.layout, branded.placed)
  )
  assert.equal(again.alreadyPresent, true)
  assert.equal(again.layout.brandTheme?.id, branded.layout.brandTheme?.id)

  const swiss = executeDocumentAction(
    "switch-bold-brand",
    ctx(baseLayout({ style: "swiss", accent: FAMILY_ACCENT.swiss }))
  )
  assert.equal(swiss.layout.style, "swiss")
  assert.equal(swiss.layout.accent, BOLD_BRAND_ACCENT.swiss)
})

test("inspector resolved values and manual edits work after an action", () => {
  const pay = executeDocumentAction("add-pay-online", ctx(baseLayout()))
  const button = findPayOnlineButton(pay.placed)!
  const tokens = resolveFamilyBrand("studio", pay.layout.brand ?? null)
  const resolved = resolveElementProperties({
    layerId: button.id,
    kind: "text",
    layout: pay.layout,
    tokens,
    layerStyles: {},
    layerText: {},
    placed: button,
  })
  assert.equal(resolved.content, "Pay online")
  assert.equal(resolved.style.backgroundColor, tokens.primary)

  const styles = applyStyleOverride({}, button.id, {
    backgroundColor: "#111111",
  })
  const afterEdit = resolveElementProperties({
    layerId: button.id,
    kind: "text",
    layout: pay.layout,
    tokens,
    layerStyles: styles,
    layerText: {},
    placed: button,
  })
  assert.equal(afterEdit.style.backgroundColor, "#111111")
  assert.equal(afterEdit.override.backgroundColor, "#111111")

  const bold = executeDocumentAction(
    "switch-bold-brand",
    ctx(baseLayout({ style: "statement", accent: FAMILY_ACCENT.statement }))
  )
  const boldTokens = resolveFamilyBrand(
    "statement",
    null,
    [],
    bold.layout.brandTheme
  )
  const header = resolveElementProperties({
    layerId: "Header",
    kind: "container",
    layout: bold.layout,
    tokens: boldTokens,
    layerStyles: {},
    layerText: {},
  })
  assert.equal(header.style.backgroundColor, boldTokens.primary)
})

test("scoped AI edit still hydrates after a quick action", () => {
  const pay = executeDocumentAction("add-pay-online", ctx(baseLayout()))
  const button = findPayOnlineButton(pay.placed)!
  const parsed = parseScopedStylePrompt(`${button.id}: make the background #000000`)
  assert.ok(parsed)
  const styles = applyStyleOverride({}, parsed!.layerId, parsed!.patch)
  assert.equal(styles[button.id]?.backgroundColor, "#000000")
})

test("document serialization after mutation stays structured", () => {
  const result = executeDocumentAction("add-discount-row", ctx(baseLayout()))
  const json = JSON.parse(JSON.stringify(result.layout)) as GeneratedLayout
  assert.equal(json.sections.discount, true)
  assert.equal(invoiceTotals(json).discount, 968)
})

test("concurrent execution is gated", () => {
  const gate: DocumentActionGate = { busy: false }
  assert.equal(tryBeginDocumentAction(gate), true)
  assert.equal(tryBeginDocumentAction(gate), false)
  endDocumentAction(gate)
  assert.equal(tryBeginDocumentAction(gate), true)
})

test("saved-item compatible placed subtree survives payment and pay actions", () => {
  const pay = executeDocumentAction("add-pay-online", ctx(baseLayout()))
  const button = findPayOnlineButton(pay.placed)!
  assert.equal(button.kind, "button")
  const details = executeDocumentAction(
    "add-payment-details",
    ctx(pay.layout, pay.placed)
  )
  const root = findPaymentDetailsRoot(details.placed)
  assert.ok(root)
  assert.equal(details.placed.some((element) => element.id === button.id), true)
})

test("applyPromptEdit and executeDocumentAction share the mutation", () => {
  const fromPrompt = applyPromptEdit(baseLayout(), "Add a discount row")
  const fromAction = executeDocumentAction("add-discount-row", ctx(baseLayout()))
  assert.equal(fromPrompt.sections.discount, fromAction.layout.sections.discount)
  assert.equal(
    invoiceTotals(fromPrompt).total,
    invoiceTotals(fromAction.layout).total
  )
})

test("style-only actions preserve family before and after", () => {
  for (const family of ["studio", "statement", "swiss"] as const) {
    const before = baseLayout({ style: family, accent: FAMILY_ACCENT[family] })
    const result = executeDocumentAction("switch-bold-brand", ctx(before))
    assert.equal(isStyleOnlyDocumentAction("switch-bold-brand"), true)
    assert.equal(result.layout.style, before.style)
    assert.equal(result.layout.businessName, before.businessName)
    assert.equal(result.layout.lineItems.length, before.lineItems.length)
    assert.notEqual(result.layout.accent, before.accent)
  }
})

test("action conversation copy never mentions another action", () => {
  const ids: DocumentActionId[] = [
    "add-discount-row",
    "add-pay-online",
    "add-payment-details",
    "switch-bold-brand",
  ]
  for (const actionId of ids) {
    const understanding = documentActionUnderstanding(actionId)
    assert.equal(documentActionCopyIsIsolated(actionId, understanding), true)
    const result = executeDocumentAction(actionId, ctx(baseLayout({ style: "statement" })))
    assert.equal(result.actionId, actionId)
    assert.equal(documentActionCopyIsIsolated(actionId, result.summary), true)
  }
  assert.doesNotMatch(documentActionUnderstanding("add-pay-online"), /discount/i)
  assert.doesNotMatch(
    documentActionUnderstanding("add-payment-details"),
    /discount|pay online/i
  )
})

test("discount percentage is chosen by extras, not assumed before an answer", () => {
  const pending = executeDocumentAction("add-discount-row", ctx(baseLayout()))
  assert.match(pending.summary, /10%/)
  const chosen = executeDocumentAction("add-discount-row", ctx(baseLayout()), {
    discountRate: 0.15,
  })
  assert.equal(chosen.layout.discountRate, 0.15)
  assert.match(chosen.summary, /15%/)
  assert.doesNotMatch(chosen.summary, /10%/)
  const judged = executeDocumentAction("add-discount-row", ctx(baseLayout()), {
    discountRate: 0.1,
  })
  assert.match(judged.summary, /10%/)
})

test("pay online keeps a stable placed id through inspect and style round-trip", () => {
  const pay = executeDocumentAction("add-pay-online", ctx(baseLayout()))
  const button = findPayOnlineButton(pay.placed)!
  const id = button.id
  const again = executeDocumentAction("add-pay-online", ctx(pay.layout, pay.placed))
  assert.equal(findPayOnlineButton(again.placed)?.id, id)
  const tokens = resolveFamilyBrand("studio", null)
  const edited = applyStyleOverride({}, id, { color: "#ffffff" })
  const resolved = resolveElementProperties({
    layerId: id,
    kind: "text",
    layout: pay.layout,
    tokens,
    layerStyles: edited,
    layerText: { [id]: "Pay instantly" },
    placed: button,
  })
  assert.equal(resolved.content, "Pay instantly")
  assert.equal(resolved.style.color, "#ffffff")
  assert.equal(button.id, id)
})

test("payment details child text remains editable", () => {
  const result = executeDocumentAction(
    "add-payment-details",
    ctx(baseLayout({ style: "statement", accent: FAMILY_ACCENT.statement }))
  )
  const root = findPaymentDetailsRoot(result.placed)!
  const child = result.placed.find(
    (element) => element.parentId === root.id && element.bindField === "payment.bankName"
  )!
  const tokens = resolveFamilyBrand("statement", null)
  const resolved = resolveElementProperties({
    layerId: child.id,
    kind: "text",
    layout: result.layout,
    tokens,
    layerStyles: {},
    layerText: {},
    placed: child,
  })
  assert.equal(resolved.content, "First National Bank")
  assert.equal(resolved.bindField, "payment.bankName")
  const editedLayout = {
    ...result.layout,
    payment: { ...result.layout.payment, bankName: "Demo Settlement Bank" },
  }
  const afterEdit = resolveElementProperties({
    layerId: child.id,
    kind: "text",
    layout: editedLayout,
    tokens,
    layerStyles: {},
    layerText: {},
    placed: child,
  })
  assert.equal(afterEdit.content, "Demo Settlement Bank")
  assert.equal(boundValue(result.layout, child.bindField), "First National Bank")
})

test("discount does not insert a second totals block", () => {
  const result = executeDocumentAction("add-discount-row", ctx(baseLayout()))
  assert.equal(
    result.placed.filter((element) => /totals|amount due/i.test(element.label)).length,
    0
  )
  assert.equal(result.layout.sections.discount, true)
  assert.equal(invoiceTotals(result.layout).discount > 0, true)
})

test("action sequences stay isolated and preserve earlier mutations", () => {
  const sequenceA = [
    "add-discount-row",
    "add-payment-details",
    "switch-bold-brand",
    "add-pay-online",
  ] as const
  let state = ctx(baseLayout({ style: "statement", accent: FAMILY_ACCENT.statement }))
  const family = state.layout.style
  for (const actionId of sequenceA) {
    const result = executeDocumentAction(actionId, state)
    assert.equal(result.actionId, actionId)
    assert.equal(documentActionCopyIsIsolated(actionId, result.summary), true)
    assert.equal(result.layout.style, family)
    state = ctx(result.layout, result.placed)
  }
  assert.equal(state.layout.sections.discount, true)
  assert.equal(state.layout.sections.paymentDetails, true)
  assert.equal(state.layout.sections.onlinePayment, true)
  assert.ok(findPayOnlineButton(state.placed))
  assert.ok(findPaymentDetailsRoot(state.placed))

  const sequenceB = [
    "add-pay-online",
    "switch-bold-brand",
    "add-discount-row",
    "add-payment-details",
  ] as const
  let reverse = ctx(baseLayout())
  const overrides = applyStyleOverride({}, "Header", { color: "#111111" })
  for (const actionId of sequenceB) {
    const result = executeDocumentAction(actionId, reverse)
    assert.equal(result.layout.style, "studio")
    reverse = ctx(result.layout, result.placed)
  }
  assert.equal(overrides.Header?.color, "#111111")
  assert.equal(reverse.layout.sections.discount, true)
  assert.ok(findPayOnlineButton(reverse.placed))
  assert.ok(findPaymentDetailsRoot(reverse.placed))
})
