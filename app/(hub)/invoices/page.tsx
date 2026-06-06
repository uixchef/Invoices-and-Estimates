import type { Metadata } from "next"
import { LayoutsListPage } from "@/components/invoices/layouts-list-page"
import { LAYOUT_ROWS } from "@/lib/layouts-data"

export const metadata: Metadata = {
  title: "Invoices & estimates | Invoice Layouts",
  description: "Preview and manage invoice layout templates",
}

export default function InvoicesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4">
      <section
        aria-labelledby="invoice-layouts-heading"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-white bg-white p-4 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]"
      >
        <h2 id="invoice-layouts-heading" className="sr-only">
          Layout templates
        </h2>
        <LayoutsListPage rows={LAYOUT_ROWS} />
      </section>
    </div>
  )
}
