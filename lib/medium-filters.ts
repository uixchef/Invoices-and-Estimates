import type { FilterDefinition } from "@/lib/layout-filters"

export type MediumFilterType = "paper" | "resolution"

export const MEDIUM_FILTER_TYPES: MediumFilterType[] = ["paper", "resolution"]

export const MEDIUM_FILTER_DEFINITIONS: Record<MediumFilterType, FilterDefinition> = {
  paper: {
    id: "paper",
    tagLabel: "Paper",
    menuLabel: "Paper",
    emptyStatus: "No paper selected yet",
    options: [
      { id: "a4", label: "A4" },
      { id: "us-letter", label: "US letter" },
      { id: "custom", label: "Custom" },
    ],
  },
  resolution: {
    id: "resolution",
    tagLabel: "Resolution",
    menuLabel: "Resolution",
    emptyStatus: "No resolutions selected yet",
    options: [
      { id: "150-dpi", label: "150 DPI" },
      { id: "300-dpi", label: "300 DPI" },
      { id: "600-dpi", label: "600 DPI" },
    ],
  },
}

export const MEDIUM_ADD_FILTER_OPTIONS = MEDIUM_FILTER_TYPES.map((id) => ({
  id,
  menuLabel: MEDIUM_FILTER_DEFINITIONS[id].menuLabel,
}))

export const MEDIUM_EMPTY_SELECTIONS: Record<MediumFilterType, string[]> = {
  paper: [],
  resolution: [],
}
