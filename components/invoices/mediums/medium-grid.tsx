"use client"

import { MediumCard } from "@/components/invoices/mediums/medium-card"
import { LayoutsEmptyState } from "@/components/invoices/layouts-empty-state"
import type { MediumRow } from "@/lib/mediums-data"

type MediumGridProps = {
  items: MediumRow[]
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

/**
 * Figma: Medium Cards grid (3161:161821) — 300px cards, 16px gap.
 */
export function MediumGrid({
  items,
  hasActiveFilters = false,
  onClearFilters,
}: MediumGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-start justify-center rounded-lg bg-white px-4 pb-16 pt-[100px]">
        <LayoutsEmptyState
          entityLabel="paper types"
          showClear={hasActiveFilters}
          onClearFilters={onClearFilters}
        />
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
