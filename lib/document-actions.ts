import {
  familyDefaultSelection,
  findTheme,
  intensifyBrandTheme,
  type BrandTheme,
} from "@/lib/brand-boards"
import { demoPaymentDetails } from "@/lib/demo-payment"
import type {
  GeneratedLayout,
  PlacedElement,
  PlacedElementZone,
} from "@/lib/layout-builder-types"
import { normalizeLayoutStyle, type LayoutFamilyId } from "@/lib/layout-family"
import { nextPlacedId, nextPlacedLabel } from "@/lib/placed-elements"
import { insertChildAt, insertRootAt } from "@/lib/placed-tree"

export type DocumentActionId =
  | "add-discount-row"
  | "add-pay-online"
  | "add-payment-details"
  | "switch-bold-brand"

export const DOCUMENT_ACTION_IDS: DocumentActionId[] = [
  "add-discount-row",
  "add-pay-online",
  "add-payment-details",
  "switch-bold-brand",
]

export const BOLD_BRAND_ACCENT: Record<LayoutFamilyId, string> = {
  studio: "#0418c7",
  editorial: "#4a0d14",
  swiss: "#b10000",
  atelier: "#0c241c",
  statement: "#9a1f00",
  ledger: "#14f0c0",
}

export type DocumentActionContext = {
  layout: GeneratedLayout
  placed: PlacedElement[]
}

export type DocumentActionExtras = {
  discountRate?: number | null
}

export const DOCUMENT_ACTION_UNDERSTANDING: Record<DocumentActionId, string> = {
  "add-discount-row":
    "I'll add a discount and recalculate the dependent totals.",
  "add-pay-online": "I'll add a Pay online button.",
  "add-payment-details": "I'll add bank and payment details.",
  "switch-bold-brand": "I'll strengthen the current brand treatment.",
}

const ACTION_FOREIGN_TERMS: Record<DocumentActionId, RegExp> = {
  "add-discount-row": /\bpay online\b|\bbank\b|\bpayment details\b|\bbranded color scheme\b/i,
  "add-pay-online": /\bdiscount\b|\bbank\b|\bpayment details\b|\bbranded color scheme\b/i,
  "add-payment-details": /\bdiscount\b|\bpay online\b|\bbranded color scheme\b/i,
  "switch-bold-brand": /\bdiscount\b|\bpay online\b|\bbank\b|\bpayment details\b/i,
}

export function documentActionUnderstanding(actionId: DocumentActionId): string {
  return DOCUMENT_ACTION_UNDERSTANDING[actionId]
}

export function documentActionCopyIsIsolated(
  actionId: DocumentActionId,
  text: string
): boolean {
  return !ACTION_FOREIGN_TERMS[actionId].test(text)
}

export function isStyleOnlyDocumentAction(
  actionId: DocumentActionId | null
): boolean {
  return actionId === "switch-bold-brand"
}

export type DocumentActionResult = {
  actionId: DocumentActionId
  layout: GeneratedLayout
  placed: PlacedElement[]
  changed: boolean
  alreadyPresent: boolean
  inspect?: PlacedElement
  affectedIds: string[]
  summary: string
  reason?: "already-present" | "not-applicable"
}

export type DocumentActionGate = {
  busy: boolean
}

export function tryBeginDocumentAction(gate: DocumentActionGate): boolean {
  if (gate.busy) {
    return false
  }
  gate.busy = true
  return true
}

export function endDocumentAction(gate: DocumentActionGate): void {
  gate.busy = false
}

function isRemovalPrompt(prompt: string): boolean {
  return /\b(remove|hide|delete|drop|without|no longer|take out|get rid of)\b/i.test(
    prompt
  )
}

export function isBoldBrandedColorSchemePrompt(prompt: string): boolean {
  return /bold[,\s]+branded color scheme|switch to a bold|bold branded (color|colour)/i.test(
    prompt
  )
}

export function hasBoldBrandedAccent(layout: GeneratedLayout): boolean {
  const family = normalizeLayoutStyle(layout.style)
  const accent = BOLD_BRAND_ACCENT[family].toLowerCase()
  if (layout.brandTheme?.primary.toLowerCase() === accent) {
    return true
  }
  return layout.accent.toLowerCase() === accent
}

export function matchDocumentAction(prompt: string): DocumentActionId | null {
  const text = prompt.toLowerCase().replace(/^[^:]{0,40}:\s*/, "")
  if (!text.trim() || isRemovalPrompt(text)) {
    return null
  }
  if (isBoldBrandedColorSchemePrompt(prompt) || isBoldBrandedColorSchemePrompt(text)) {
    return "switch-bold-brand"
  }
  if (/\b(discount|coupon|promo|markdown|rebate)\b/.test(text)) {
    return "add-discount-row"
  }
  if (
    /\b(pay online|pay now|online payment|payment button|pay link|payment link|checkout button)\b/.test(
      text
    )
  ) {
    return "add-pay-online"
  }
  if (/\b(bank|payment details|account number|wire|iban|swift|remittance|ach)\b/.test(text)) {
    return "add-payment-details"
  }
  return null
}

export function findPayOnlineButton(
  placed: PlacedElement[]
): PlacedElement | undefined {
  return placed.find(
    (element) =>
      !element.parentId &&
      element.kind === "button" &&
      /pay online/i.test(element.content.trim())
  )
}

export function findPaymentDetailsRoot(
  placed: PlacedElement[]
): PlacedElement | undefined {
  return placed.find(
    (element) =>
      !element.parentId &&
      (element.kind === "columns-2" || element.kind === "container") &&
      element.label === "Payment details"
  )
}

export function payOnlineZone(family: LayoutFamilyId): PlacedElementZone {
  if (family === "statement" || family === "editorial") {
    return "after-notes"
  }
  return "after-totals"
}

export function paymentDetailsZone(family: LayoutFamilyId): PlacedElementZone {
  if (family === "swiss" || family === "ledger") {
    return "after-totals"
  }
  return "after-notes"
}

export function canExecuteDocumentAction(
  actionId: DocumentActionId,
  ctx: DocumentActionContext
): boolean {
  if (actionId === "add-discount-row") {
    return !ctx.layout.sections.discount
  }
  if (actionId === "add-pay-online") {
    return !findPayOnlineButton(ctx.placed)
  }
  if (actionId === "add-payment-details") {
    return !ctx.layout.sections.paymentDetails && !findPaymentDetailsRoot(ctx.placed)
  }
  return !hasBoldBrandedAccent(ctx.layout)
}

function cloneLayout(layout: GeneratedLayout): GeneratedLayout {
  return {
    ...layout,
    sections: { ...layout.sections },
    lineItems: [...layout.lineItems],
    payment: { ...(layout.payment ?? demoPaymentDetails(layout)) },
    blocks: layout.blocks ? [...layout.blocks] : undefined,
    brand: layout.brand ? { ...layout.brand } : undefined,
    brandTheme: layout.brandTheme ? { ...layout.brandTheme } : undefined,
  }
}

function currentTheme(layout: GeneratedLayout): BrandTheme {
  if (layout.brandTheme) {
    return layout.brandTheme
  }
  const family = normalizeLayoutStyle(layout.style)
  const selection = layout.brand ?? familyDefaultSelection(family)
  return findTheme(selection.themeId, [])
}

function resolvedDiscountRate(
  layout: GeneratedLayout,
  extras?: DocumentActionExtras
): number {
  if (typeof extras?.discountRate === "number" && extras.discountRate > 0) {
    return extras.discountRate
  }
  if (layout.discountRate > 0) {
    return layout.discountRate
  }
  return 0.1
}

function discountResultSummary(rate: number): string {
  const percent = Math.round(rate * 100)
  return `Discount row added. Subtotal, tax and amount due now include a ${percent}% discount.`
}

function applyDiscount(
  ctx: DocumentActionContext,
  extras?: DocumentActionExtras
): DocumentActionResult {
  const layout = cloneLayout(ctx.layout)
  if (layout.sections.discount) {
    return {
      actionId: "add-discount-row",
      layout,
      placed: ctx.placed,
      changed: false,
      alreadyPresent: true,
      affectedIds: [],
      summary: "A discount row is already on this invoice.",
      reason: "already-present",
    }
  }
  layout.sections.discount = true
  layout.discountRate = resolvedDiscountRate(layout, extras)
  layout.blocks = ctx.placed
  return {
    actionId: "add-discount-row",
    layout,
    placed: ctx.placed,
    changed: true,
    alreadyPresent: false,
    affectedIds: ["Totals"],
    summary: discountResultSummary(layout.discountRate),
  }
}

function applyPayOnline(ctx: DocumentActionContext): DocumentActionResult {
  const layout = cloneLayout(ctx.layout)
  const payment = layout.payment
  const existing = findPayOnlineButton(ctx.placed)
  layout.sections.onlinePayment = true
  layout.blocks = ctx.placed
  if (existing) {
    return {
      actionId: "add-pay-online",
      layout,
      placed: ctx.placed,
      changed: false,
      alreadyPresent: true,
      inspect: existing,
      affectedIds: [existing.id],
      summary: "Pay online is already on this invoice.",
      reason: "already-present",
    }
  }
  const family = normalizeLayoutStyle(layout.style)
  const zone = payOnlineZone(family)
  const created: PlacedElement = {
    id: nextPlacedId(ctx.placed),
    kind: "button",
    label: nextPlacedLabel(ctx.placed, "button", "Button"),
    zone,
    content: payment.payLabel || "Pay online",
    href: payment.payUrl,
  }
  const placed = insertRootAt(ctx.placed, created, {
    kind: "root",
    zone,
    index: Number.MAX_SAFE_INTEGER,
  })
  layout.blocks = placed
  return {
    actionId: "add-pay-online",
    layout,
    placed,
    changed: true,
    alreadyPresent: false,
    inspect: created,
    affectedIds: [created.id],
    summary:
      "Pay online button added. It is selectable, inspectable, and uses the demo payment link.",
  }
}

function applyPaymentDetails(ctx: DocumentActionContext): DocumentActionResult {
  const layout = cloneLayout(ctx.layout)
  const existing = findPaymentDetailsRoot(ctx.placed)
  if (layout.sections.paymentDetails && existing) {
    return {
      actionId: "add-payment-details",
      layout,
      placed: ctx.placed,
      changed: false,
      alreadyPresent: true,
      inspect: existing,
      affectedIds: [existing.id],
      summary: "Bank and payment details are already on this invoice.",
      reason: "already-present",
    }
  }

  layout.sections.paymentDetails = true
  layout.payment = layout.payment ?? demoPaymentDetails(layout)
  if (existing) {
    layout.blocks = ctx.placed
    return {
      actionId: "add-payment-details",
      layout,
      placed: ctx.placed,
      changed: true,
      alreadyPresent: false,
      inspect: existing,
      affectedIds: [existing.id],
      summary:
        "Bank and payment details added as structured, editable fields using demo fixture values.",
    }
  }

  const family = normalizeLayoutStyle(layout.style)
  const zone = paymentDetailsZone(family)
  const root: PlacedElement = {
    id: nextPlacedId(ctx.placed),
    kind: "columns-2",
    label: "Payment details",
    zone,
    content: "",
    columns: ["", ""],
  }
  let placed = insertRootAt(ctx.placed, root, {
    kind: "root",
    zone,
    index: Number.MAX_SAFE_INTEGER,
  })
  const fields: { content: string; bindField: string; slot: number }[] = [
    { content: layout.payment.bankName, bindField: "payment.bankName", slot: 0 },
    {
      content: layout.payment.accountName,
      bindField: "payment.accountName",
      slot: 0,
    },
    {
      content: `Account ${layout.payment.accountNumber}`,
      bindField: "payment.accountNumber",
      slot: 1,
    },
    {
      content: `Routing ${layout.payment.routingNumber}`,
      bindField: "payment.routingNumber",
      slot: 1,
    },
  ]
  const childIds: string[] = []
  for (const field of fields) {
    const child: PlacedElement = {
      id: nextPlacedId(placed),
      kind: "paragraph",
      label: nextPlacedLabel(placed, "paragraph", "Paragraph"),
      zone,
      content: field.content,
      bindField: field.bindField,
      parentId: root.id,
      slot: field.slot,
    }
    childIds.push(child.id)
    placed = insertChildAt(placed, child, {
      kind: "child",
      parentId: root.id,
      parentKind: "columns-2",
      slot: field.slot,
      index: Number.MAX_SAFE_INTEGER,
    })
  }
  layout.blocks = placed
  return {
    actionId: "add-payment-details",
    layout,
    placed,
    changed: true,
    alreadyPresent: false,
    inspect: root,
    affectedIds: [root.id, ...childIds],
    summary:
      "Bank and payment details added as a structured section with demo fixture values.",
  }
}

function applyBoldBrand(ctx: DocumentActionContext): DocumentActionResult {
  const layout = cloneLayout(ctx.layout)
  if (hasBoldBrandedAccent(layout)) {
    return {
      actionId: "switch-bold-brand",
      layout,
      placed: ctx.placed,
      changed: false,
      alreadyPresent: true,
      affectedIds: ["Header"],
      summary: "This document already uses the bold branded palette.",
      reason: "already-present",
    }
  }
  const family = normalizeLayoutStyle(layout.style)
  const nextTheme = intensifyBrandTheme(currentTheme(layout), family)
  layout.brandTheme = nextTheme
  layout.accent = nextTheme.primary
  layout.blocks = ctx.placed
  return {
    actionId: "switch-bold-brand",
    layout,
    placed: ctx.placed,
    changed: true,
    alreadyPresent: false,
    affectedIds: ["Header", "Totals"],
    summary: `Switched to a bolder branded palette. This ${family} composition is unchanged.`,
  }
}

export function executeDocumentAction(
  actionId: DocumentActionId,
  ctx: DocumentActionContext,
  extras?: DocumentActionExtras
): DocumentActionResult {
  if (actionId === "add-discount-row") {
    return applyDiscount(ctx, extras)
  }
  if (actionId === "add-pay-online") {
    return applyPayOnline(ctx)
  }
  if (actionId === "add-payment-details") {
    return applyPaymentDetails(ctx)
  }
  return applyBoldBrand(ctx)
}

export function layoutEditsFromAction(
  current: Partial<GeneratedLayout>,
  result: DocumentActionResult
): Partial<GeneratedLayout> {
  return {
    ...current,
    sections: {
      ...(current.sections ?? {}),
      ...result.layout.sections,
    },
    discountRate: result.layout.discountRate,
    payment: result.layout.payment,
    accent: result.layout.accent,
    brand: result.layout.brand,
    brandTheme: result.layout.brandTheme,
    lineItems: result.layout.lineItems,
  }
}
