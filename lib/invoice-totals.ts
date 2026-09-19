import type { GeneratedLayout } from "@/lib/layout-builder-types"

export type InvoiceTotals = {
  subtotal: number
  discount: number
  tax: number
  total: number
}

/**
 * Dependent invoice math. Discount applies to subtotal when the discount
 * section is on; tax applies to the discounted remainder when taxes are on.
 */
export function lineAmount(item: { qty: number; rate: number }): number {
  return item.qty * item.rate
}

export function invoiceTotals(layout: GeneratedLayout): InvoiceTotals {
  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + lineAmount(item),
    0
  )
  const discount = layout.sections.discount
    ? subtotal * layout.discountRate
    : 0
  const tax = layout.sections.taxes
    ? (subtotal - discount) * layout.taxRate
    : 0
  return {
    subtotal,
    discount,
    tax,
    total: subtotal - discount + tax,
  }
}
