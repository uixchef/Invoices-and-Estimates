"use client"

import { useEffect, useMemo, useState } from "react"
import { useFilterBarState } from "@/hooks/use-filter-bar-state"
import type { LayoutsViewMode } from "@/components/invoices/layout-toolbar"
import { LayoutsPagination } from "@/components/invoices/layouts-pagination"
import { MediumGrid } from "@/components/invoices/mediums/medium-grid"
import { MediumToolbar } from "@/components/invoices/mediums/medium-toolbar"
import {
  MEDIUMS_PAGINATION_THRESHOLD,
  MediumTable,
} from "@/components/invoices/mediums/medium-table"
import {
  MEDIUM_EMPTY_SELECTIONS,
  MEDIUM_FILTER_TYPES,
} from "@/lib/medium-filters"
import { filterMediumRows } from "@/lib/filter-mediums"
import { useMediumsStore } from "@/lib/mediums-store"
import { compareByMostRecent } from "@/lib/sort-by-updated"

export function MediumsListPage() {
  const { mediums: rows } = useMediumsStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState<LayoutsViewMode>("grid")
  const [sort, setSort] = useState<"name" | "updated">("updated")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const {
    openFilterId,
    openFilterAnchor,
    selections,
    filterDraftIds,
    visibleFilterTags,
    setFilterDraftIds,
    handleFilterApply,
    handleToolbarFilterOpenChange,
    handleTableFilterOpenChange,
    handleAddFilter,
    handleRemoveFilter,
    clearAllFilters,
  } = useFilterBarState(MEDIUM_FILTER_TYPES, MEDIUM_EMPTY_SELECTIONS)

  const filtered = useMemo(() => {
    const result = filterMediumRows(rows, selections, searchQuery)
    return [...result].sort((a, b) => {
      if (sort === "updated") {
        return compareByMostRecent(a, b)
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true })
    })
  }, [rows, selections, searchQuery, sort])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selections, sort, pageSize])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const needsPagination = filtered.length >= MEDIUMS_PAGINATION_THRESHOLD

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    MEDIUM_FILTER_TYPES.some((id) => selections[id].length > 0)

  const handleClearFilters = () => {
    setSearchQuery("")
    clearAllFilters()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <MediumToolbar
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSortChange={setSort}
        openFilterId={openFilterId}
        openFilterAnchor={openFilterAnchor}
        selections={selections}
        filterDraftIds={filterDraftIds}
        visibleFilterTags={visibleFilterTags}
        onFilterDraftIdsChange={setFilterDraftIds}
        onFilterApply={handleFilterApply}
        onToolbarFilterOpenChange={handleToolbarFilterOpenChange}
        onAddFilter={handleAddFilter}
        onRemoveFilter={handleRemoveFilter}
      />

      {view === "list" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <MediumTable
            items={pageItems}
            needsPagination={needsPagination}
            openFilterId={openFilterId}
            openFilterAnchor={openFilterAnchor}
            selections={selections}
            filterDraftIds={filterDraftIds}
            onFilterOpenChange={handleTableFilterOpenChange}
            onFilterDraftIdsChange={setFilterDraftIds}
            onFilterApply={handleFilterApply}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
          {needsPagination ? (
            <LayoutsPagination
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <MediumGrid
            items={filtered}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}
    </div>
  )
}
