import { identityForFamily, lineItemsForFamily } from "@/lib/document-identities"
import { demoPaymentDetails } from "@/lib/demo-payment"
import {
  executeDocumentAction,
  matchDocumentAction,
  type DocumentActionExtras,
} from "@/lib/document-actions"
import { applyBlockPrompt } from "@/lib/placed-element-prompt"
import { resolveFamilyBrand } from "@/lib/brand-boards"
import type {
  GeneratedLayout,
  GeneratedLineItem,
} from "@/lib/layout-builder-types"
import {
  hasVisualStyleIntent,
  normalizeLayoutStyle,
  resolveAccentColor,
  resolveLayoutFamily,
} from "@/lib/layout-family"

export {
  BOLD_BRAND_ACCENT,
  hasBoldBrandedAccent,
  isBoldBrandedColorSchemePrompt,
} from "@/lib/document-actions"

const FALLBACK_LINE_ITEMS: GeneratedLineItem[] = [
  { description: "Brand & layout design", qty: 1, rate: 1200 },
  { description: "Implementation & setup", qty: 8, rate: 95 },
  { description: "Content & copywriting", qty: 4, rate: 120 },
  { description: "Revisions & QA", qty: 3, rate: 85 },
  { description: "Support retainer (monthly)", qty: 1, rate: 300 },
]

const CURRENCY_BY_WORD: Record<string, { code: string; symbol: string }> = {
  dollar: { code: "USD", symbol: "$" },
  dollars: { code: "USD", symbol: "$" },
  usd: { code: "USD", symbol: "$" },
  euro: { code: "EUR", symbol: "€" },
  euros: { code: "EUR", symbol: "€" },
  eur: { code: "EUR", symbol: "€" },
  pound: { code: "GBP", symbol: "£" },
  pounds: { code: "GBP", symbol: "£" },
  sterling: { code: "GBP", symbol: "£" },
  gbp: { code: "GBP", symbol: "£" },
  rupee: { code: "INR", symbol: "₹" },
  rupees: { code: "INR", symbol: "₹" },
  inr: { code: "INR", symbol: "₹" },
}

const ADDABLE_SECTIONS: (keyof GeneratedLayout["sections"])[] = [
  "logo",
  "taxes",
  "notes",
  "terms",
  "discount",
  "onlinePayment",
  "paymentDetails",
]

const MAX_LINE_ITEMS = 6

export function nextLineItem(layout: GeneratedLayout): GeneratedLineItem {
  const family = normalizeLayoutStyle(layout.style)
  const catalog = [
    ...lineItemsForFamily(family, identityForFamily(family).lineItems.length),
    ...FALLBACK_LINE_ITEMS,
  ]
  const existing = new Set(
    layout.lineItems.map((item) => item.description.toLowerCase())
  )
  const unused = catalog.find(
    (item) => !existing.has(item.description.toLowerCase())
  )
  if (unused) {
    return { ...unused }
  }
  return {
    description: `Additional service ${layout.lineItems.length + 1}`,
    qty: 1,
    rate: 420,
  }
}

export function withDocumentPayment(layout: GeneratedLayout): GeneratedLayout {
  return {
    ...layout,
    payment: layout.payment ?? demoPaymentDetails(layout),
  }
}

export function mergeLayoutContent(
  base: GeneratedLayout,
  ...overlays: Partial<GeneratedLayout>[]
): GeneratedLayout {
  return overlays.reduce<GeneratedLayout>((acc, overlay) => {
    return {
      ...acc,
      ...overlay,
      sections: { ...acc.sections, ...overlay.sections },
      payment: {
        ...(acc.payment ?? demoPaymentDetails(acc)),
        ...overlay.payment,
      },
      lineItems: overlay.lineItems ?? acc.lineItems,
      blocks: overlay.blocks ?? acc.blocks,
      brand: "brand" in overlay ? overlay.brand : acc.brand,
      brandTheme: "brandTheme" in overlay ? overlay.brandTheme : acc.brandTheme,
    }
  }, withDocumentPayment(base))
}

/**
 * Interprets a follow-up prompt as a concrete edit to the layout — the stand-in
 * for the editing API. Maps recommendation chips and typed instructions onto
 * the same GeneratedLayout the builder renders.
 */
export function applyPromptEdit(
  layout: GeneratedLayout,
  rawPrompt: string,
  extras?: DocumentActionExtras
): GeneratedLayout {
  const text = rawPrompt.toLowerCase().replace(/^[^:]{0,40}:\s*/, "")
  if (!text.trim()) {
    return layout
  }

  const remove =
    /\b(remove|hide|delete|drop|without|no longer|take out|get rid of)\b/.test(
      text
    )
  const on = !remove

  const actionId = matchDocumentAction(rawPrompt)
  if (actionId) {
    const result = executeDocumentAction(
      actionId,
      {
        layout,
        placed: layout.blocks ?? [],
      },
      extras
    )
    return result.layout
  }

  const next: GeneratedLayout = {
    ...withDocumentPayment(layout),
    sections: { ...layout.sections },
    lineItems: [...layout.lineItems],
    payment: { ...(layout.payment ?? demoPaymentDetails(layout)) },
    blocks: layout.blocks ? [...layout.blocks] : undefined,
    brand: layout.brand,
    brandTheme: layout.brandTheme,
  }
  let changed = false

  const blockEdit = applyBlockPrompt(next.blocks ?? [], next, rawPrompt)
  if (blockEdit.handled) {
    next.blocks = blockEdit.placed
    changed = true
  }

  const setSection = (
    key: keyof GeneratedLayout["sections"],
    matcher: RegExp
  ) => {
    if (matcher.test(text)) {
      next.sections[key] = on
      changed = true
    }
  }

  setSection("logo", /\b(logo|brand mark|branding|brand header)\b/)
  setSection("taxes", /\b(tax|taxes|vat|gst|sales tax)\b/)
  setSection("notes", /\b(notes?|thank[\s-]?you|memo|message)\b/)
  setSection("terms", /\b(terms|conditions|policy)\b/)
  if (/\b(discount|coupon|promo|markdown|rebate)\b/.test(text) && !on) {
    next.sections.discount = false
    changed = true
  }

  if (hasVisualStyleIntent(text)) {
    const nextStyle = resolveLayoutFamily(text)
    next.style = nextStyle
    if (!next.brand) {
      next.accent = resolveAccentColor(text, nextStyle)
    } else {
      const tokens = resolveFamilyBrand(nextStyle, next.brand)
      next.accent = tokens.primary
    }
    changed = true
  } else if (!next.brand) {
    const named = resolveAccentColor(text, normalizeLayoutStyle(next.style))
    const familyDefault =
      resolveAccentColor("", normalizeLayoutStyle(next.style))
    if (named !== familyDefault) {
      next.accent = named
      changed = true
    }
  }

  const mentionsLineItem =
    /\b(line items?|another item|extra item|add an item|add a item|add item)\b/.test(
      text
    ) || /\banother line item\b/.test(text)
  if (
    mentionsLineItem &&
    !blockEdit.handled &&
    !remove &&
    !/\bdiscount\b/.test(text) &&
    next.lineItems.length < MAX_LINE_ITEMS
  ) {
    next.lineItems = [...next.lineItems, nextLineItem(next)]
    changed = true
  } else if (
    mentionsLineItem &&
    !blockEdit.handled &&
    remove &&
    next.lineItems.length > 1
  ) {
    next.lineItems = next.lineItems.slice(0, -1)
    changed = true
  }

  for (const [word, currency] of Object.entries(CURRENCY_BY_WORD)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      next.currencyCode = currency.code
      next.currencySymbol = currency.symbol
      changed = true
      break
    }
  }

  if (!changed && /\b(add|include|insert|create|put|show|with)\b/.test(text)) {
    const missing = ADDABLE_SECTIONS.find((key) => !next.sections[key])
    if (missing) {
      next.sections[missing] = true
      changed = true
    }
  }

  return changed ? next : layout
}
