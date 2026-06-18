import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"

import { Button } from "@/components/highrise/button"

/**
 * Figma: Invoices — Estimates / Mediums header (3068:169517)
 * Shown when navigating into the Mediums management page.
 */
export function MediumsHeader() {
  return (
    <div className="flex w-full flex-col justify-center border-b border-[#d0d5dd] bg-white px-4 py-2">
      <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-12">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/invoices"
            aria-label="Back to layouts"
            className="flex size-6 shrink-0 items-center justify-center rounded text-[#475467] outline-none hover:bg-[#f2f4f7] hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
              Paper types
            </h2>
            <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
              Define output channels, paper, safe area, and resolution, that
              documents are exported through.
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-2"
          role="group"
          aria-label="Paper type actions"
        >
          <Button asChild variant="primary">
            <Link href="/invoices/mediums/new">
              <Plus className="size-5 shrink-0" strokeWidth={2} aria-hidden />
              Create paper type
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
