"use client"

import {
  Calendar,
  Copy,
  Eye,
  FileText,
  Flag,
  ListFilter,
  MoreVertical,
  Pencil,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { FilterDropdownPopover } from "@/components/filters/filter-bar"
import type { FilterBarAnchor } from "@/components/filters/filter-bar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FilterDefinition, LayoutFilterType } from "@/lib/layout-filters"
import { FILTER_DEFINITIONS } from "@/lib/layout-filters"
import type { LayoutFilterSelections } from "@/lib/filter-layouts"
import type { LayoutRow } from "@/lib/layouts-data"
import { useMediumsStore } from "@/lib/mediums-store"
import { cn } from "@/lib/utils"

const TABLE_COLUMNS =
  "grid grid-cols-[minmax(220px,1.5fr)_150px_150px_150px_minmax(180px,1fr)_112px]"

/** Figma: Tables actions column (3068:167746) — 24px buttons, 16px gray icons. */
const ACTION_BUTTON_CLASS =
  "flex size-6 shrink-0 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"

/** Below this count, all rows show without pagination and the table fits content. */
export const LAYOUTS_PAGINATION_THRESHOLD = 10

type LayoutTableProps = {
  items: LayoutRow[]
  needsPagination?: boolean
  filterDefinitions?: Record<LayoutFilterType, FilterDefinition>
  openFilterId: LayoutFilterType | null
  openFilterAnchor: FilterBarAnchor | null
  selections: LayoutFilterSelections
  filterDraftIds: string[]
  onFilterOpenChange: (filterId: LayoutFilterType, open: boolean) => void
  onFilterDraftIdsChange: (ids: string[]) => void
  onFilterApply: (filterId: LayoutFilterType, ids: string[]) => void
}

function TableHeaderCell({
  icon: Icon,
  label,
  filterId,
  filterDefinitions,
  filterOpen = false,
  onFilterOpenChange,
  filterSelectedIds = [],
  onFilterSelectedIdsChange,
  filterDraftIds,
  onFilterDraftIdsChange,
  last = false,
}: {
  icon?: LucideIcon
  label?: string
  filterId?: LayoutFilterType
  filterDefinitions: Record<LayoutFilterType, FilterDefinition>
  filterOpen?: boolean
  onFilterOpenChange?: (open: boolean) => void
  filterSelectedIds?: string[]
  onFilterSelectedIdsChange?: (ids: string[]) => void
  filterDraftIds?: string[]
  onFilterDraftIdsChange?: (ids: string[]) => void
  last?: boolean
}) {
  const hasFilter =
    label &&
    filterId &&
    onFilterOpenChange &&
    onFilterSelectedIdsChange &&
    filterDefinitions[filterId]

  return (
    <div
      className={cn(
        "flex h-9 items-center border-b border-[#d0d5dd] bg-[#f2f4f7] px-3",
        !last && "border-r"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {Icon ? (
          <Icon className="size-4 shrink-0 text-[#101828]" aria-hidden />
        ) : null}
        {label ? (
          <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            {label}
          </span>
        ) : null}
        {hasFilter ? (
          <FilterDropdownPopover
            definition={filterDefinitions[filterId]}
            open={filterOpen}
            onOpenChange={onFilterOpenChange}
            selectedIds={filterSelectedIds}
            onSelectedIdsChange={onFilterSelectedIdsChange}
            draftIds={filterDraftIds}
            onDraftIdsChange={onFilterDraftIdsChange}
            align="start"
            sideOffset={4}
            trigger={
              <button
                type="button"
                aria-label={`Filter ${label}`}
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                className={cn(
                  "shrink-0 rounded p-0.5 outline-none hover:bg-[#eaecf0] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                  filterOpen && "bg-[#eaecf0]"
                )}
              >
                <ListFilter className="size-3.5 text-[#667085]" aria-hidden />
              </button>
            }
          />
        ) : label ? (
          <ListFilter className="size-3.5 shrink-0 text-[#667085]" aria-hidden />
        ) : null}
      </div>
    </div>
  )
}

const TYPE_BADGE_STYLES: Record<LayoutRow["type"], string> = {
  Invoice: "bg-[#eff4ff] text-[#004eeb]",
  Estimate: "bg-[#fffaeb] text-[#b54708]",
  Receipt: "bg-[#fef3f2] text-[#b42318]",
}

function TypeBadge({ label }: { label: LayoutRow["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
        TYPE_BADGE_STYLES[label]
      )}
    >
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: LayoutRow["status"] }) {
  if (status === "Published") {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[#ecfdf3] px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#027a48]">
        Published
      </span>
    )
  }

  return (
    <span className="inline-flex h-6 items-center rounded-full bg-[#f2f4f7] px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]">
      Draft
    </span>
  )
}

function LayoutTableRow({ item }: { item: LayoutRow }) {
  const { getMediumName } = useMediumsStore()

  return (
    <div
      className={cn(
        TABLE_COLUMNS,
        "group transition-colors hover:bg-[#f5f8ff]"
      )}
    >
      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#475467]">
          {item.name}
        </span>
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <TypeBadge label={item.type} />
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#475467]">
          {getMediumName(item.mediumId)}
        </span>
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <StatusBadge status={item.status} />
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#475467]">
          {item.updatedOn}, {item.updatedAgo}
        </span>
      </div>

      <div className="flex h-11 items-center gap-1 border-b border-[#d0d5dd] px-3 py-2">
        <button
          type="button"
          aria-label={`Edit ${item.name}`}
          className={ACTION_BUTTON_CLASS}
        >
          <Pencil className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Preview ${item.name}`}
          className={ACTION_BUTTON_CLASS}
        >
          <Eye className="size-4" aria-hidden />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More actions for ${item.name}`}
              className={ACTION_BUTTON_CLASS}
            >
              <MoreVertical className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded">
            <DropdownMenuItem>
              <Copy className="size-4 text-[#667085]" aria-hidden />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[#b42318] focus:text-[#b42318]">
              <Trash2 className="size-4 text-[#b42318]" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function LayoutTable({
  items,
  needsPagination = false,
  filterDefinitions = FILTER_DEFINITIONS,
  openFilterId,
  openFilterAnchor,
  selections,
  filterDraftIds,
  onFilterOpenChange,
  onFilterDraftIdsChange,
  onFilterApply,
}: LayoutTableProps) {
  const isEmpty = items.length === 0

  const filterProps = (filterId: LayoutFilterType) => ({
    filterId,
    filterDefinitions,
    filterOpen: openFilterId === filterId && openFilterAnchor === "table",
    onFilterOpenChange: (open: boolean) => onFilterOpenChange(filterId, open),
    filterSelectedIds: selections[filterId],
    onFilterSelectedIdsChange: (ids: string[]) => onFilterApply(filterId, ids),
    filterDraftIds: openFilterId === filterId ? filterDraftIds : selections[filterId],
    onFilterDraftIdsChange: onFilterDraftIdsChange,
  })

  return (
    <div
      className={cn(
        "grid w-full max-h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded border border-[#d0d5dd] bg-white",
        isEmpty || needsPagination ? "min-h-0 flex-1" : "h-fit"
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={TABLE_COLUMNS}>
            <TableHeaderCell
              icon={FileText}
              label="Name"
              filterDefinitions={filterDefinitions}
            />
            <TableHeaderCell icon={Tag} label="Type" {...filterProps("type")} />
            <TableHeaderCell icon={FileText} label="Medium" {...filterProps("medium")} />
            <TableHeaderCell icon={Flag} label="Status" {...filterProps("status")} />
            <TableHeaderCell
              icon={Calendar}
              label="Updated on"
              filterDefinitions={filterDefinitions}
            />
            <TableHeaderCell filterDefinitions={filterDefinitions} last />
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-auto overscroll-y-contain">
        <div className="min-w-[760px]">
          {isEmpty ? (
            <div className="flex h-32 items-center justify-center px-4 font-[family-name:var(--font-inter)] text-base text-[#475467]">
              No layouts match your filters.
            </div>
          ) : (
            items.map((item) => <LayoutTableRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  )
}
