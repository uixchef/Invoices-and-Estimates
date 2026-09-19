import type { BuilderLayerStyle } from "@/lib/layout-builder-types"
import type { GeneratedLayout } from "@/lib/layout-builder-types"
import { PAGE_LAYER_LABEL } from "@/lib/layout-builder-types"
import { authoredLookupKey } from "@/lib/native-instance-id"
import {
  normalizeLayoutStyle,
  type LayoutFamilyId,
} from "@/lib/layout-family"
import type { ResolvedFamilyBrand } from "@/lib/brand-boards"
import { invoiceTotals } from "@/lib/invoice-totals"

const INSTRUMENT =
  'var(--font-instrument-serif), "Instrument Serif", Georgia, serif'
const NEWSREADER = 'var(--font-newsreader), "Newsreader", Georgia, serif'
const GEIST_MONO =
  "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace"
const INTER_STACK = "var(--font-inter), Inter, system-ui, sans-serif"
const WHITE = "#ffffff"

export type AuthoredContext = {
  layout: GeneratedLayout
  tokens: ResolvedFamilyBrand
}

function nativeKey(layerId: string): string {
  return authoredLookupKey(layerId.replace(/ copy \d+$/, ""))
}

function money(layout: GeneratedLayout): string {
  const { total } = invoiceTotals(layout)
  return `${layout.currencySymbol}${total.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Authored visual values for native family layers. Token-based so Brand Board
 * changes stay in the same path as the canvas (tokens.primary, not a hardcoded
 * orange).
 */
export function authoredNativeStyle(
  layerId: string,
  ctx: AuthoredContext
): BuilderLayerStyle {
  const family = normalizeLayoutStyle(ctx.layout.style)
  const key = nativeKey(layerId)
  const { tokens, layout } = ctx

  if (key === PAGE_LAYER_LABEL) {
    return {
      backgroundColor: tokens.page,
      color: tokens.text,
      fontFamily: tokens.bodyFont,
    }
  }

  const byFamily = FAMILY_LAYER_STYLE[family]?.[key]
  if (byFamily) {
    return byFamily(tokens, layout)
  }

  const shared = SHARED_LAYER_STYLE[key]
  if (shared) {
    return shared(family, tokens, layout)
  }

  return {}
}

export function authoredNativeContent(
  layerId: string,
  layout: GeneratedLayout
): string | undefined {
  const key = nativeKey(layerId)
  if (key === "Business name") return layout.businessName
  if (key === "Client name") return layout.clientName
  if (key === "Document type") return layout.documentType
  if (key === "Document number") return layout.documentNumber
  if (key === "Issue date") return layout.issueDate
  if (key === "Due date") return layout.dueDate
  if (key === "Currency code") return layout.currencyCode
  if (key === "Amount due") return money(layout)
  if (key === "Amount due label") return "Amount due"
  if (key === "Services heading") return "Services"
  if (key === "Prepared for") return "Prepared for"
  if (key === "Items heading") return "06 Items"
  if (key === "Description column") return "Description"
  if (key === "Qty column") return "Qty"
  if (key === "Rate column") return "Rate"
  if (key === "Sum column") return "Sum"
  if (key === "Identity heading") return "Identity"
  if (key === "Client name caption") return "02 Client"
  if (key === "Issue date caption") return "03 Issued"
  if (key === "Due date caption") return "04 Due"
  if (key === "Currency code caption") return "05 Ccy"
  if (key === "Issued label") return "Issued"
  if (key === "Due label") return "Due"
  if (key === "Notes body") {
    return `Thank you for the work this period — ${layout.businessName} will issue the next statement on the usual cycle.`
  }
  if (key === "Payment terms body") {
    return "Payment is due within 14 days. Please include the invoice number on the transfer."
  }
  const item = key.match(/^Item (\d+) (description|qty|rate|amount)$/)
  if (item) {
    const index = Number(item[1]) - 1
    const row = layout.lineItems[index]
    if (!row) return undefined
    if (item[2] === "description") return row.description
    if (item[2] === "qty") return String(row.qty)
    if (item[2] === "rate") {
      return `${layout.currencySymbol}${row.rate.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    }
    return `${layout.currencySymbol}${(row.qty * row.rate).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  return undefined
}

type StyleFn = (tokens: ResolvedFamilyBrand, layout: GeneratedLayout) => BuilderLayerStyle

const FAMILY_LAYER_STYLE: Record<
  LayoutFamilyId,
  Record<string, StyleFn>
> = {
  studio: {
    Header: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
    }),
    Totals: (tokens) => ({
      backgroundColor: tokens.strong,
      color: WHITE,
      fontFamily: tokens.bodyFont,
    }),
    "Business name": (tokens) => ({
      fontFamily: tokens.headingFont,
      fontSize: 52,
      fontWeight: 600,
      color: tokens.text,
      textAlign: "left",
    }),
    "Amount due": () => ({
      fontFamily: INSTRUMENT,
      fontSize: 44,
      fontStyle: "italic",
      fontWeight: 500,
      color: WHITE,
      textAlign: "right",
    }),
    "Client name": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 22,
      fontWeight: 600,
      color: tokens.text,
    }),
    "Document type": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 10,
      fontWeight: 600,
      color: tokens.primary,
      textAlign: "right",
    }),
  },
  editorial: {
    Header: (tokens) => ({
      backgroundColor: tokens.primary,
      color: tokens.page,
      fontFamily: tokens.bodyFont,
    }),
    "Document type": (tokens) => ({
      fontFamily: INSTRUMENT,
      fontSize: 52,
      fontStyle: "italic",
      fontWeight: 500,
      color: tokens.page,
    }),
    "Business name": () => ({
      fontFamily: NEWSREADER,
      fontSize: 14,
      color: WHITE,
    }),
    Totals: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
      textAlign: "right",
    }),
    "Amount due": (tokens) => ({
      fontFamily: INSTRUMENT,
      fontSize: 42,
      fontStyle: "italic",
      fontWeight: 500,
      color: tokens.primary,
    }),
    "Client name": () => ({
      fontFamily: NEWSREADER,
      fontSize: 26,
      fontWeight: 500,
    }),
  },
  swiss: {
    Header: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
    }),
    Totals: (tokens) => ({
      borderColor: tokens.primary,
      color: tokens.text,
      fontFamily: tokens.bodyFont,
      textAlign: "right",
    }),
    "Business name": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 22,
      fontWeight: 800,
      color: tokens.text,
    }),
    "Amount due": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 30,
      fontWeight: 800,
      color: tokens.primary,
      textAlign: "right",
    }),
    "Client name": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 11,
      fontWeight: 700,
      color: tokens.text,
    }),
  },
  atelier: {
    Header: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
    }),
    Totals: (tokens) => ({
      borderColor: tokens.primary,
      color: tokens.text,
      fontFamily: tokens.bodyFont,
    }),
    "Business name": () => ({
      fontFamily: INSTRUMENT,
      fontSize: 36,
      fontStyle: "italic",
      fontWeight: 500,
      textAlign: "right",
    }),
    "Amount due": (tokens) => ({
      fontFamily: INSTRUMENT,
      fontSize: 40,
      fontWeight: 500,
      color: tokens.primary,
      textAlign: "right",
    }),
    "Client name": () => ({
      fontFamily: NEWSREADER,
      fontSize: 18,
    }),
  },
  statement: {
    Header: (tokens) => ({
      backgroundColor: tokens.primary,
      color: WHITE,
      fontFamily: tokens.bodyFont,
    }),
    Totals: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
    }),
    "Business name": () => ({
      fontFamily: INTER_STACK,
      fontSize: 22,
      fontWeight: 600,
      color: WHITE,
    }),
    "Amount due": () => ({
      fontFamily: INTER_STACK,
      fontSize: 48,
      fontWeight: 800,
      color: WHITE,
    }),
    "Client name": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 18,
      fontWeight: 700,
      color: tokens.text,
    }),
    "Document type": () => ({
      fontSize: 10,
      fontWeight: 600,
      color: "rgba(255,255,255,0.7)",
      textAlign: "right",
    }),
  },
  ledger: {
    Header: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
      backgroundColor: tokens.page,
    }),
    Totals: (tokens) => ({
      color: tokens.text,
      fontFamily: tokens.bodyFont,
      backgroundColor: tokens.page,
    }),
    "Business name": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 22,
      fontWeight: 600,
      color: tokens.text,
    }),
    "Amount due": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 36,
      fontWeight: 600,
      color: tokens.primary,
      textAlign: "right",
    }),
    "Document number": (tokens) => ({
      fontFamily: GEIST_MONO,
      fontSize: 11,
      color: tokens.primary,
      textAlign: "right",
    }),
    "Client name": (tokens) => ({
      fontFamily: tokens.bodyFont,
      fontSize: 11,
      fontWeight: 500,
      color: tokens.text,
    }),
  },
}

const SHARED_LAYER_STYLE: Record<
  string,
  (
    family: LayoutFamilyId,
    tokens: ResolvedFamilyBrand,
    layout: GeneratedLayout
  ) => BuilderLayerStyle
> = {
  "Billing details": (_family, tokens) => ({
    color: tokens.text,
    fontFamily: tokens.bodyFont,
  }),
  "Line items": (_family, tokens) => ({
    color: tokens.text,
    fontFamily: tokens.bodyFont,
  }),
  Notes: (_family, tokens) => ({
    color: tokens.muted,
    fontFamily: tokens.bodyFont,
    fontSize: 11,
  }),
}
