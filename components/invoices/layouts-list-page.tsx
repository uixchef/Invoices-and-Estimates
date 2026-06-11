"use client"

import { useEffect, useMemo, useState } from "react"
import { useFilterBarState } from "@/hooks/use-filter-bar-state"
import { CreateWithAiPanel } from "@/components/invoices/create-with-ai-panel"
import { LayoutGrid } from "@/components/invoices/layout-grid"
import { LayoutToolbar, type LayoutsViewMode } from "@/components/invoices/layout-toolbar"
import {
  LAYOUTS_PAGINATION_THRESHOLD,
  LayoutTable,
} from "@/components/invoices/layout-table"
import { LayoutsPagination } from "@/components/invoices/layouts-pagination"
import {
  buildLayoutFilterDefinitions,
  EMPTY_SELECTIONS,
  FILTER_TYPES,
} from "@/lib/layout-filters"
import { filterRows } from "@/lib/filter-layouts"
import type { LayoutRow } from "@/lib/layouts-data"
import { useLayoutClone } from "@/lib/layout-clone-context"
import { useLayoutCreate } from "@/lib/layout-create-context"
import { useLayoutDelete } from "@/lib/layout-delete-context"
import { getBuilderMediumPresets } from "@/lib/mediums-data"
import { compareByMostRecent } from "@/lib/sort-by-updated"

type LayoutsListPageProps = {
  rows: LayoutRow[]
}

export function LayoutsListPage({ rows }: LayoutsListPageProps) {
  const { clonedLayouts } = useLayoutClone()
  const { createdLayouts } = useLayoutCreate()
  const { isRemoved } = useLayoutDelete()
  const visibleRows = useMemo(
    () =>
      [...createdLayouts, ...clonedLayouts, ...rows].filter(
        (row) => !isRemoved(row.id)
      ),
    [createdLayouts, clonedLayouts, isRemoved, rows]
  )
  const filterDefinitions = useMemo(
    () => buildLayoutFilterDefinitions(getBuilderMediumPresets()),
    []
  )

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
  } = useFilterBarState(FILTER_TYPES, EMPTY_SELECTIONS)

  const filtered = useMemo(() => {
    const result = filterRows(visibleRows, selections, searchQuery)
    return [...result].sort((a, b) => {
      if (sort === "updated") {
        return compareByMostRecent(a, b)
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true })
    })
  }, [visibleRows, selections, searchQuery, sort])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selections, sort, pageSize])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const needsPagination = filtered.length >= LAYOUTS_PAGINATION_THRESHOLD

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    FILTER_TYPES.some((id) => selections[id].length > 0)

  const handleClearFilters = () => {
    setSearchQuery("")
    clearAllFilters()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <CreateWithAiPanel />

      <LayoutToolbar
        filterDefinitions={filterDefinitions}
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
          <LayoutTable
            items={pageItems}
            needsPagination={needsPagination}
            filterDefinitions={filterDefinitions}
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
          <LayoutGrid
            items={filtered}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}
    </div>
  )
}
