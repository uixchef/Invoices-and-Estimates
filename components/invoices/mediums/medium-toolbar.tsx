"use client"

import { ArrowUpDown, LayoutGrid, List, Search } from "lucide-react"
import { ConfigurableFilterBar } from "@/components/filters/filter-bar"
import { ContentSwitcher } from "@/components/highrise/content-switcher"
import type { FilterBarAnchor } from "@/components/filters/filter-bar"
import { Input } from "@/components/highrise/input-text"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LayoutsViewMode } from "@/components/invoices/layout-toolbar"
import type { MediumFilterType } from "@/lib/medium-filters"
import type { MediumFilterSelections } from "@/lib/filter-mediums"
import {
  MEDIUM_ADD_FILTER_OPTIONS,
  MEDIUM_FILTER_DEFINITIONS,
} from "@/lib/medium-filters"
import { cn } from "@/lib/utils"

type MediumToolbarProps = {
  view: LayoutsViewMode
  onViewChange: (view: LayoutsViewMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSortChange: (sort: "name" | "updated") => void
  openFilterId: MediumFilterType | null
  openFilterAnchor: FilterBarAnchor | null
  selections: MediumFilterSelections
  filterDraftIds: string[]
  visibleFilterTags: MediumFilterType[]
  onFilterDraftIdsChange: (ids: string[]) => void
  onFilterApply: (filterId: MediumFilterType, ids: string[]) => void
  onToolbarFilterOpenChange: (filterId: MediumFilterType, open: boolean) => void
  onAddFilter: (filterId: MediumFilterType) => void
  onRemoveFilter: (filterId: MediumFilterType) => void
}

export function MediumToolbar({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  onSortChange,
  openFilterId,
  openFilterAnchor,
  selections,
  filterDraftIds,
  visibleFilterTags,
  onFilterDraftIdsChange,
  onFilterApply,
  onToolbarFilterOpenChange,
  onAddFilter,
  onRemoveFilter,
}: MediumToolbarProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <ConfigurableFilterBar<MediumFilterType>
          filterDefinitions={MEDIUM_FILTER_DEFINITIONS}
          addFilterOptions={MEDIUM_ADD_FILTER_OPTIONS}
          openFilterId={openFilterId}
          openFilterAnchor={openFilterAnchor}
          selections={selections}
          filterDraftIds={filterDraftIds}
          visibleFilterTags={visibleFilterTags}
          onFilterDraftIdsChange={onFilterDraftIdsChange}
          onFilterApply={onFilterApply}
          onToolbarFilterOpenChange={onToolbarFilterOpenChange}
          onAddFilter={onAddFilter}
          onRemoveFilter={onRemoveFilter}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-[14px] border pl-2 pr-3",
                "font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
                "border-[#d0d5dd] bg-white text-[#344054] hover:bg-slate-50",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              )}
            >
              <ArrowUpDown className="size-[18px]" aria-hidden />
              Sort by
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => onSortChange("name")}>
              Name
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSortChange("updated")}>
              Updated on
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-[440px]">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
            aria-hidden
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search paper types"
            aria-label="Search paper types"
            className="h-9 pl-8 font-[family-name:var(--font-inter)] text-base leading-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
          />
        </div>

        <ContentSwitcher<LayoutsViewMode>
          value={view}
          onChange={onViewChange}
          ariaLabel="View mode"
          iconOnly
          options={[
            {
              value: "grid",
              label: "Grid view",
              icon: <LayoutGrid aria-hidden />,
            },
            {
              value: "list",
              label: "List view",
              icon: <List aria-hidden />,
            },
          ]}
        />
      </div>
    </div>
  )
}
