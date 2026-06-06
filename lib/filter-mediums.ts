import type { MediumFilterType } from "@/lib/medium-filters"
import type { MediumRow } from "@/lib/mediums-data"

export type MediumFilterSelections = Record<MediumFilterType, string[]>

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

const PAPER_LOOKUP: Record<MediumRow["paper"], string> = {
  A4: "a4",
  "US letter": "us-letter",
  Custom: "custom",
}

const RESOLUTION_LOOKUP: Record<MediumRow["resolution"], string> = {
  "150 DPI": "150-dpi",
  "300 DPI": "300-dpi",
  "600 DPI": "600-dpi",
}

export function filterMediumRows(
  rows: MediumRow[],
  selections: MediumFilterSelections,
  searchQuery: string
): MediumRow[] {
  const query = searchQuery.trim().toLowerCase()

  return rows.filter((row) => {
    if (query && !row.name.toLowerCase().includes(query)) {
      return false
    }

    if (
      !matchesSelection(
        row.paper,
        selections.paper,
        PAPER_LOOKUP as Record<string, string>
      )
    ) {
      return false
    }

    if (
      !matchesSelection(
        row.resolution,
        selections.resolution,
        RESOLUTION_LOOKUP as Record<string, string>
      )
    ) {
      return false
    }

    return true
  })
}
