import type { GeneratedLineItem } from "@/lib/layout-builder-types"
import type { LayoutFamilyId } from "@/lib/layout-family"

export type DocumentIdentity = {
  businessName: string
  clientName: string
  layoutName: string
  lineItems: GeneratedLineItem[]
}

const STUDIO_ITEMS: GeneratedLineItem[] = [
  { description: "Brand identity & art direction", qty: 1, rate: 4800 },
  { description: "Campaign layout system", qty: 1, rate: 3200 },
  { description: "Design implementation", qty: 12, rate: 140 },
  { description: "Motion & launch assets", qty: 1, rate: 1800 },
  { description: "Studio retainer", qty: 1, rate: 900 },
]

const EDITORIAL_ITEMS: GeneratedLineItem[] = [
  { description: "Issue design & typesetting", qty: 1, rate: 3600 },
  { description: "Cover & masthead system", qty: 1, rate: 1400 },
  { description: "Print production art", qty: 3, rate: 420 },
  { description: "Archive digitisation", qty: 8, rate: 95 },
]

const SWISS_ITEMS: GeneratedLineItem[] = [
  { description: "Signage & wayfinding grid", qty: 1, rate: 2200 },
  { description: "Identity application", qty: 1, rate: 1600 },
  { description: "Documentation system", qty: 6, rate: 180 },
  { description: "Production files", qty: 1, rate: 400 },
]

const ATELIER_ITEMS: GeneratedLineItem[] = [
  { description: "Spatial concept", qty: 1, rate: 5400 },
  { description: "Material & finish schedule", qty: 1, rate: 2100 },
  { description: "Detail drawings", qty: 4, rate: 380 },
  { description: "Site consultation", qty: 2, rate: 650 },
]

const STATEMENT_ITEMS: GeneratedLineItem[] = [
  { description: "Seasonal campaign", qty: 1, rate: 6200 },
  { description: "Lookbook art direction", qty: 1, rate: 2800 },
  { description: "E-commerce stills", qty: 16, rate: 85 },
  { description: "Social system", qty: 1, rate: 1100 },
]

const LEDGER_ITEMS: GeneratedLineItem[] = [
  { description: "Advisory retainer — Q3", qty: 1, rate: 4500 },
  { description: "Financial model review", qty: 1, rate: 1800 },
  { description: "Board materials", qty: 1, rate: 950 },
  { description: "Ad-hoc support", qty: 6, rate: 175 },
]

export const FAMILY_IDENTITY: Record<LayoutFamilyId, DocumentIdentity> = {
  studio: {
    businessName: "Northwind Studio",
    clientName: "Atelier Mär",
    layoutName: "Northwind Studio",
    lineItems: STUDIO_ITEMS,
  },
  editorial: {
    businessName: "Meridian Press",
    clientName: "Folio Review",
    layoutName: "Meridian Press",
    lineItems: EDITORIAL_ITEMS,
  },
  swiss: {
    businessName: "Harbor Index",
    clientName: "Civic Works",
    layoutName: "Harbor Index",
    lineItems: SWISS_ITEMS,
  },
  atelier: {
    businessName: "Vale Atelier",
    clientName: "Linen House",
    layoutName: "Vale Atelier",
    lineItems: ATELIER_ITEMS,
  },
  statement: {
    businessName: "Verve",
    clientName: "Arden Goods",
    layoutName: "Verve",
    lineItems: STATEMENT_ITEMS,
  },
  ledger: {
    businessName: "Ironwood",
    clientName: "Pinnacle Holdings",
    layoutName: "Ironwood Ledger",
    lineItems: LEDGER_ITEMS,
  },
}

export const DRAFT_IDENTITY_BY_ID: Record<
  string,
  { family: LayoutFamilyId; layoutName: string }
> = {
  "layout-draft-1": { family: "editorial", layoutName: "Meridian Press" },
  "layout-draft-2": { family: "studio", layoutName: "Northwind Studio" },
  "layout-draft-3": { family: "statement", layoutName: "Verve" },
  "layout-draft-4": { family: "swiss", layoutName: "Harbor Index" },
  "layout-draft-5": { family: "atelier", layoutName: "Vale Atelier" },
  "layout-draft-6": { family: "ledger", layoutName: "Ironwood Ledger" },
  "layout-draft-7": { family: "studio", layoutName: "Northwind Studio" },
  "layout-draft-8": { family: "swiss", layoutName: "Harbor Index" },
}

export function identityForFamily(family: LayoutFamilyId): DocumentIdentity {
  return FAMILY_IDENTITY[family]
}

export function lineItemsForFamily(
  family: LayoutFamilyId,
  count: number
): GeneratedLineItem[] {
  const items = FAMILY_IDENTITY[family].lineItems
  const n = Math.min(Math.max(count, 1), items.length)
  return items.slice(0, n)
}
