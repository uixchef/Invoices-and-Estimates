import type { Metadata } from "next"
import { MediumsListPage } from "@/components/invoices/mediums/mediums-list-page"

export const metadata: Metadata = {
  title: "Paper types | Invoice Layouts",
  description:
    "Define output channels, paper, safe area, and resolution that documents are exported through",
}

export default function MediumsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4">
      <section
        aria-labelledby="mediums-heading"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-white bg-white p-4 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]"
      >
        <h2 id="mediums-heading" className="sr-only">
          Paper types
        </h2>
        <MediumsListPage />
      </section>
    </div>
  )
}
