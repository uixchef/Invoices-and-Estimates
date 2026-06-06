"use client"

import { MediumCard } from "@/components/invoices/mediums/medium-card"
import type { MediumRow } from "@/lib/mediums-data"

type MediumGridProps = {
  items: MediumRow[]
}

/**
 * Figma: Medium Cards grid (3161:161821) — 300px cards, 16px gap.
 */
export function MediumGrid({ items }: MediumGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#d0d5dd] bg-white px-4 py-16 font-[family-name:var(--font-inter)] text-base text-[#475467]">
        No mediums match your filters.
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
        {items.map((item) => (
          <MediumCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
