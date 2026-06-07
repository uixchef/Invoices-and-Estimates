"use client"

import Link from "next/link"
import {
  Aperture,
  Calendar,
  File,
  FileText,
  ListFilter,
  Pencil,
  Ruler,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { getMediumEditorHref } from "@/lib/medium-routes"
import { FilterDropdownPopover } from "@/components/filters/filter-bar"
import type { FilterBarAnchor } from "@/components/filters/filter-bar"
import type { MediumFilterType } from "@/lib/medium-filters"
import { MEDIUM_FILTER_DEFINITIONS } from "@/lib/medium-filters"
import type { MediumFilterSelections } from "@/lib/filter-mediums"
import type { MediumRow } from "@/lib/mediums-data"
import { useMediumDelete } from "@/lib/medium-delete-context"
import { cn } from "@/lib/utils"

const TABLE_COLUMNS =
  "grid grid-cols-[minmax(220px,1.5fr)_200px_160px_150px_minmax(180px,1fr)_80px]"

/** Below this count, all rows show without pagination and the table fits content. */
export const MEDIUMS_PAGINATION_THRESHOLD = 10

type MediumTableProps = {
  items: MediumRow[]
  needsPagination?: boolean
  openFilterId: MediumFilterType | null
  openFilterAnchor: FilterBarAnchor | null
  selections: MediumFilterSelections
  filterDraftIds: string[]
  onFilterOpenChange: (filterId: MediumFilterType, open: boolean) => void
  onFilterDraftIdsChange: (ids: string[]) => void
  onFilterApply: (filterId: MediumFilterType, ids: string[]) => void
}

function TableHeaderCell({
  icon: Icon,
  label,
  filterId,
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
  filterId?: MediumFilterType
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
    MEDIUM_FILTER_DEFINITIONS[filterId]

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
            definition={MEDIUM_FILTER_DEFINITIONS[filterId]}
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

function MediumTableRow({ item }: { item: MediumRow }) {
  const editHref = getMediumEditorHref(item.id)
  const { requestDelete } = useMediumDelete()

  return (
    <div
      className={cn(
        TABLE_COLUMNS,
        "group transition-colors hover:bg-[#f5f8ff]"
      )}
    >
      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <Link
          href={editHref}
          className="min-w-0 truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#475467] outline-none transition-colors hover:text-[#004eeb] focus-visible:text-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          {item.name}
        </Link>
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#475467]">
          {item.paper} · {item.orientation}
        </span>
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#475467]">
          {item.dimensions}
        </span>
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#475467]">
          {item.resolution}
        </span>
      </div>

      <div className="flex h-11 items-center border-b border-[#d0d5dd] px-3 py-2">
        <span className="truncate font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#475467]">
          {item.updatedOn}, {item.updatedAgo}
        </span>
      </div>

      <div className="flex h-11 items-center gap-1 border-b border-[#d0d5dd] px-2 py-2">
        <Link
          href={editHref}
          aria-label={`Edit ${item.name}`}
          className="flex size-6 items-center justify-center rounded outline-none hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <Pencil className="size-4 text-[#667085]" aria-hidden />
        </Link>
        <button
          type="button"
          aria-label={`Delete ${item.name}`}
          onClick={() => requestDelete(item)}
          className="flex size-6 items-center justify-center rounded outline-none hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <Trash2 className="size-4 text-[#667085]" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function MediumTable({
  items,
  needsPagination = false,
  openFilterId,
  openFilterAnchor,
  selections,
  filterDraftIds,
  onFilterOpenChange,
  onFilterDraftIdsChange,
  onFilterApply,
}: MediumTableProps) {
  const isEmpty = items.length === 0

  const filterProps = (filterId: MediumFilterType) => ({
    filterId,
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
        <div className="min-w-[900px]">
          <div className={TABLE_COLUMNS}>
            <TableHeaderCell icon={FileText} label="Name" />
            <TableHeaderCell icon={File} label="Paper" {...filterProps("paper")} />
            <TableHeaderCell icon={Ruler} label="Dimensions" />
            <TableHeaderCell
              icon={Aperture}
              label="Resolution"
              {...filterProps("resolution")}
            />
            <TableHeaderCell icon={Calendar} label="Updated on" />
            <TableHeaderCell last />
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-auto overscroll-y-contain">
        <div className="min-w-[900px]">
          {isEmpty ? (
            <div className="flex h-32 items-center justify-center px-4 font-[family-name:var(--font-inter)] text-base text-[#475467]">
              No mediums match your filters.
            </div>
          ) : (
            items.map((item) => <MediumTableRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  )
}
