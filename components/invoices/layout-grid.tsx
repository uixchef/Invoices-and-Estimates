import type { LayoutRow } from "@/lib/layouts-data"
import { LayoutCard } from "@/components/invoices/layout-card"
import { LayoutsEmptyState } from "@/components/invoices/layouts-empty-state"

type LayoutGridProps = {
  items: LayoutRow[]
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

export function LayoutGrid({
  items,
  hasActiveFilters = false,
  onClearFilters,
}: LayoutGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#d0d5dd] bg-white px-4 py-16">
        <LayoutsEmptyState
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
          <LayoutCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
