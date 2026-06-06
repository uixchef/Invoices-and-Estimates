import type { LayoutFilterType } from "@/lib/layout-filters"
import type { LayoutRow } from "@/lib/layouts-data"

export type LayoutFilterSelections = Record<LayoutFilterType, string[]>

function matchesSelection(
  value: string,
  selectedIds: string[],
  lookup: Record<string, string>
): boolean {
  if (selectedIds.length === 0) {
    return true
  }

  const normalized = lookup[value] ?? value.toLowerCase()
  return selectedIds.includes(normalized)
}

const TYPE_LOOKUP: Record<LayoutRow["type"], string> = {
  Invoice: "invoice",
  Estimate: "estimate",
  Receipt: "receipt",
}

const STATUS_LOOKUP: Record<LayoutRow["status"], string> = {
  Published: "published",
  Draft: "draft",
}

export function filterRows(
  rows: LayoutRow[],
  selections: LayoutFilterSelections,
  searchQuery: string
): LayoutRow[] {
  const query = searchQuery.trim().toLowerCase()

  return rows.filter((row) => {
    if (query && !row.name.toLowerCase().includes(query)) {
      return false
    }

    if (
      !matchesSelection(row.type, selections.type, TYPE_LOOKUP as Record<string, string>)
    ) {
      return false
    }

    if (
      selections.medium.length > 0 &&
      !selections.medium.includes(row.mediumId)
    ) {
      return false
    }

    if (
      !matchesSelection(
        row.status,
        selections.status,
        STATUS_LOOKUP as Record<string, string>
      )
    ) {
      return false
    }

    return true
  })
}
