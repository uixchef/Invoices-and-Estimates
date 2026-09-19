"use client"

import { InvoiceFamilyDocument } from "@/components/invoices/documents/invoice-family-document"
import { layoutFromRow } from "@/lib/layout-builder-context"
import { identityForFamily, lineItemsForFamily } from "@/lib/document-identities"
import { demoPaymentDetails } from "@/lib/demo-payment"
import {
  FAMILY_ACCENT,
  LAYOUT_FAMILY_IDS,
  type LayoutFamilyId,
} from "@/lib/layout-family"
import { RECENT_DRAFT_ROWS } from "@/lib/layouts-data"
import { getDocumentPageProfile } from "@/lib/mediums-data"
import type { GeneratedLayout } from "@/lib/layout-builder-types"

function sampleLayout(
  family: LayoutFamilyId,
  overrides: Partial<GeneratedLayout> = {}
): GeneratedLayout {
  const identity = identityForFamily(family)
  return {
    documentType: "Standard invoice",
    businessName: identity.businessName,
    clientName: identity.clientName,
    emphasis: null,
    style: family,
    accent: FAMILY_ACCENT[family],
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
    lineItems: lineItemsForFamily(family, 3),
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber: "INV-2026-0142",
    issueDate: "Sep 17, 2026",
    dueDate: "Oct 1, 2026",
    payment: demoPaymentDetails({
      businessName: identity.businessName,
      documentNumber: "INV-2026-0142",
    }),
    ...overrides,
  }
}

export default function FamilyReviewPage() {
  const pageProfile = getDocumentPageProfile(null)

  return (
    <div className="bg-[#e4e7ec] px-10 py-10">
      <h1 className="mb-8 font-[family-name:var(--font-inter)] text-xl font-semibold">
        Layout families
      </h1>
      <div className="flex flex-col gap-16">
        {LAYOUT_FAMILY_IDS.map((family) => (
          <section key={family} data-family={family}>
            <h2 className="mb-4 font-[family-name:var(--font-inter)] text-sm font-medium uppercase tracking-wide text-[#344054]">
              {family}
            </h2>
            <InvoiceFamilyDocument
              layout={sampleLayout(family)}
              pageProfile={pageProfile}
            />
          </section>
        ))}
        <section data-family="overlay-eur">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide">
            Overlay · EUR · long names · 5 items · tax off
          </h2>
          <InvoiceFamilyDocument
            layout={sampleLayout("studio", {
              businessName: "Northwind Collaborative Studio & Partners LLP",
              clientName: "Harborfield International Holdings Group",
              currencyCode: "EUR",
              currencySymbol: "€",
              sections: {
                logo: true,
                items: true,
                taxes: false,
                notes: true,
                terms: true,
                discount: true,
                onlinePayment: true,
                paymentDetails: true,
              },
              lineItems: [
                { description: "Discovery workshop", qty: 2, rate: 850 },
                { description: "Identity system", qty: 1, rate: 4200 },
                { description: "Layout system", qty: 1, rate: 2800 },
                { description: "Implementation", qty: 12, rate: 95 },
                { description: "Retainer", qty: 1, rate: 600 },
              ],
            })}
            pageProfile={pageProfile}
          />
        </section>
        <section data-family="dashboard-drafts">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide">
            Dashboard drafts (layoutFromRow)
          </h2>
          <div className="flex flex-col gap-12">
            {RECENT_DRAFT_ROWS.map((row) => (
              <div key={row.id} data-draft={row.id}>
                <p className="mb-2 text-xs text-[#667085]">
                  {row.id} · {layoutFromRow(row).style}
                </p>
                <InvoiceFamilyDocument
                  layout={layoutFromRow(row)}
                  pageProfile={getDocumentPageProfile(row.mediumId)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
