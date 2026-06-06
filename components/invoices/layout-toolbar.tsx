"use client"

import {
  ArrowUpDown,
  LayoutGrid,
  List,
  Search,
} from "lucide-react"
import { ConfigurableFilterBar } from "@/components/filters/filter-bar"
import { Input } from "@/components/highrise/input-text"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FilterDefinition, LayoutFilterType } from "@/lib/layout-filters"
import type { LayoutFilterSelections } from "@/lib/filter-layouts"
import {
  ADD_FILTER_OPTIONS,
  FILTER_DEFINITIONS,
} from "@/lib/layout-filters"
import type { FilterBarAnchor } from "@/components/filters/filter-bar"
import { cn } from "@/lib/utils"

export type LayoutsViewMode = "grid" | "list"

type LayoutToolbarProps = {
  filterDefinitions?: Record<LayoutFilterType, FilterDefinition>
  view: LayoutsViewMode
  onViewChange: (view: LayoutsViewMode) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSortChange: (sort: "name" | "updated") => void
  openFilterId: LayoutFilterType | null
  openFilterAnchor: FilterBarAnchor | null
  selections: LayoutFilterSelections
  filterDraftIds: string[]
  visibleFilterTags: LayoutFilterType[]
  onFilterDraftIdsChange: (ids: string[]) => void
  onFilterApply: (filterId: LayoutFilterType, ids: string[]) => void
  onToolbarFilterOpenChange: (filterId: LayoutFilterType, open: boolean) => void
  onAddFilter: (filterId: LayoutFilterType) => void
  onRemoveFilter: (filterId: LayoutFilterType) => void
}

function GridViewIcon({ className }: { className?: string }) {
  return <LayoutGrid className={cn("size-5 shrink-0", className)} aria-hidden />
}

function ListViewIcon({ className }: { className?: string }) {
  return <List className={cn("size-5 shrink-0", className)} aria-hidden />
}

export function LayoutToolbar({
  filterDefinitions = FILTER_DEFINITIONS,
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
}: LayoutToolbarProps) {
  const iconClass = (active: boolean) =>
    active ? "text-[#004eeb]" : "text-[#667085]"

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <ConfigurableFilterBar<LayoutFilterType>
          filterDefinitions={filterDefinitions}
          addFilterOptions={ADD_FILTER_OPTIONS}
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
          <DropdownMenuContent align="start" className="rounded">
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
            placeholder="Search layouts"
            aria-label="Search layouts"
            className="h-9 pl-8 font-[family-name:var(--font-inter)] text-base leading-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
          />
        </div>

        <div
          className="flex h-9 shrink-0 overflow-hidden rounded border border-[#d0d5dd]"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            onClick={() => onViewChange("grid")}
            className={cn(
              "flex w-9 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#155eef]/40",
              view === "grid" ? "bg-[#eff4ff]" : "bg-white hover:bg-slate-50"
            )}
          >
            <GridViewIcon className={iconClass(view === "grid")} />
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            aria-label="List view"
            onClick={() => onViewChange("list")}
            className={cn(
              "flex w-9 items-center justify-center border-l border-[#d0d5dd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#155eef]/40",
              view === "list" ? "bg-[#eff4ff]" : "bg-white hover:bg-slate-50"
            )}
          >
            <ListViewIcon className={iconClass(view === "list")} />
          </button>
        </div>
      </div>
    </div>
  )
}
