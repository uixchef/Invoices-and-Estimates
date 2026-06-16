import type { GeneratedLayout } from "@/lib/layout-builder-types"

/**
 * A selectable data source for the document preview: either a built-in sample
 * dataset or one of the workspace's actual invoices. Picking one overlays its
 * content onto the live layout so the template can be previewed against real
 * data without re-running generation.
 *
 * `data` is a partial layout — only the content fields a source overrides. The
 * builder merges it over the generated layout, and manual edits still win last.
 */
export type DocumentSourceKind = "sample" | "invoice"

export type DocumentSource = {
  id: string
  kind: DocumentSourceKind
  /** Compact label shown on the toolbar trigger once selected. */
  shortLabel: string
  /** Primary line in the picker list. */
  title: string
  /** Sample blurb shown under the title (samples only). */
  subtitle: string
  /** Owning client — invoices only; surfaced for search. */
  client?: string
  /** Lifecycle label shown as right-info on invoice rows (e.g. "Sent"). */
  status?: string
  data: Partial<GeneratedLayout>
}

const today = (offsetDays = 0): string => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const INVOICE_SAMPLES: DocumentSource[] = [
  {
    id: "sample-standard",
    kind: "sample",
    shortLabel: "Standard invoice",
    title: "Standard invoice (paid, USD)",
    subtitle: "3-line invoice with tax on one line, fully paid",
    data: {
      businessName: "Northwind Studio",
      clientName: "Acme Co.",
      currencyCode: "USD",
      currencySymbol: "$",
      lineItems: [
        { description: "Brand identity design", qty: 1, rate: 2400 },
        { description: "Landing page build", qty: 1, rate: 1800 },
        { description: "Revisions (hourly)", qty: 6, rate: 120 },
      ],
      taxRate: 0.08,
      discountRate: 0,
      documentNumber: "INV-2026-0142",
      issueDate: today(-3),
      dueDate: today(11),
    },
  },
  {
    id: "sample-detailed",
    kind: "sample",
    shortLabel: "Detailed invoice",
    title: "Detailed invoice (EUR + VAT + schedule)",
    subtitle:
      "Multi-line EUR invoice with loyalty discount, 19% VAT and a 3-installment schedule",
    data: {
      businessName: "Atelier Mär",
      clientName: "Köln Retail GmbH",
      currencyCode: "EUR",
      currencySymbol: "€",
      lineItems: [
        { description: "Discovery workshop", qty: 2, rate: 950 },
        { description: "UX research sprint", qty: 1, rate: 3200 },
        { description: "Design system setup", qty: 1, rate: 4100 },
        { description: "Component library", qty: 1, rate: 2750 },
        { description: "Handoff & QA (hourly)", qty: 12, rate: 110 },
      ],
      taxRate: 0.19,
      discountRate: 0.1,
      documentNumber: "INV-2026-0207",
      issueDate: today(-1),
      dueDate: today(29),
    },
  },
]

export const ACTUAL_INVOICES: DocumentSource[] = [
  {
    id: "inv-ABC97802786",
    kind: "invoice",
    shortLabel: "ABC97802786",
    title: "ABC97802786",
    subtitle: "Haliku Labs",
    client: "Haliku Labs",
    status: "Sent",
    data: {
      businessName: "Haliku Labs",
      clientName: "Meridian Partners",
      currencyCode: "USD",
      currencySymbol: "$",
      lineItems: [
        { description: "Monthly retainer", qty: 1, rate: 3500 },
        { description: "Ad-hoc support (hourly)", qty: 4, rate: 150 },
      ],
      taxRate: 0,
      discountRate: 0,
      documentNumber: "ABC97802786",
      issueDate: today(-9),
      dueDate: today(5),
    },
  },
  {
    id: "inv-ABC97802785",
    kind: "invoice",
    shortLabel: "ABC97802785",
    title: "ABC97802785",
    subtitle: "Test Li Co.",
    client: "Test Li Co.",
    status: "Sent",
    data: {
      businessName: "Test Li Co.",
      clientName: "Brightwave Inc.",
      currencyCode: "USD",
      currencySymbol: "$",
      lineItems: [
        { description: "Consulting", qty: 8, rate: 200 },
        { description: "Travel reimbursement", qty: 1, rate: 420 },
      ],
      taxRate: 0.05,
      discountRate: 0,
      documentNumber: "ABC97802785",
      issueDate: today(-12),
      dueDate: today(2),
    },
  },
  {
    id: "inv-ABC97802783",
    kind: "invoice",
    shortLabel: "ABC97802783",
    title: "ABC97802783",
    subtitle: "Test Li Co.",
    client: "Test Li Co.",
    status: "Paid",
    data: {
      businessName: "Test Li Co.",
      clientName: "Cedar & Co.",
      currencyCode: "USD",
      currencySymbol: "$",
      lineItems: [{ description: "Annual subscription", qty: 1, rate: 1200 }],
      taxRate: 0.05,
      discountRate: 0,
      documentNumber: "ABC97802783",
      issueDate: today(-30),
      dueDate: today(-16),
    },
  },
  {
    id: "inv-ABC97802779",
    kind: "invoice",
    shortLabel: "ABC97802779",
    title: "ABC97802779",
    subtitle: "Lumen Studio",
    client: "Lumen Studio",
    status: "Draft",
    data: {
      businessName: "Lumen Studio",
      clientName: "Oakridge Group",
      currencyCode: "GBP",
      currencySymbol: "£",
      lineItems: [
        { description: "Photography day rate", qty: 2, rate: 900 },
        { description: "Editing & retouching", qty: 1, rate: 650 },
      ],
      taxRate: 0.2,
      discountRate: 0,
      documentNumber: "ABC97802779",
      issueDate: today(-2),
      dueDate: today(28),
    },
  },
]

export const ALL_DOCUMENT_SOURCES: DocumentSource[] = [
  ...INVOICE_SAMPLES,
  ...ACTUAL_INVOICES,
]

export function findDocumentSource(id: string | null): DocumentSource | null {
  if (!id) {
    return null
  }
  return ALL_DOCUMENT_SOURCES.find((source) => source.id === id) ?? null
}
