import type { GeneratedPaymentDetails } from "@/lib/layout-builder-types"

/**
 * Fixture payment values used by demo generation and the sample data overlay.
 * Structured on the document model so Pay-online / bank-detail edits stay
 * inspectable instead of being baked into a screenshot.
 */
export function demoPaymentDetails(doc: {
  businessName: string
  documentNumber: string
}): GeneratedPaymentDetails {
  return {
    bankName: "First National Bank",
    accountName: doc.businessName,
    accountNumber: "4829 1103 7741",
    routingNumber: "021000021",
    payUrl: `https://pay.layouts-ai.demo/invoice/${encodeURIComponent(doc.documentNumber)}`,
    payLabel: "Pay online",
  }
}
