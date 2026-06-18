import Link from "next/link"
import { Ruler } from "lucide-react"

import { CreateWithAiButton } from "@/components/invoices/create-with-ai-button"
import { NewLayoutButton } from "@/components/invoices/new-layout-button"
import { neutralSecondaryButtonVariants } from "@/components/invoices/neutral-secondary-button"

/**
 * Mediums management is paused — the nav entry is kept behind this flag so it can
 * be brought back without re-implementing it. Flip to `true` to restore it.
 */
const SHOW_MEDIUMS_NAV = false

/**
 * Figma: Invoices — Estimates / Invoice Header (3068:159601)
 */
export function InvoiceLayoutHeader() {
  return (
    <div className="flex w-full flex-col justify-center border-b border-[#d0d5dd] bg-white px-4 py-2">
      <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-12">
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            Layouts
          </h2>
          <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
            Author handlebars layouts against the platform document types.
          </p>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-2"
          role="group"
          aria-label="Layout actions"
        >
          {SHOW_MEDIUMS_NAV ? (
            <Link href="/invoices/mediums" className={neutralSecondaryButtonVariants()}>
              <Ruler className="size-5 shrink-0" strokeWidth={2} aria-hidden />
              Paper types
            </Link>
          ) : null}
          <CreateWithAiButton />
          <NewLayoutButton />
        </div>
      </div>
    </div>
  )
}
