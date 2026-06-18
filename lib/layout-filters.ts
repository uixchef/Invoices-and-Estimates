import type { MediumRow } from "@/lib/mediums-data"

export type LayoutFilterType = "type" | "medium" | "status"

export type FilterOption = {
  id: string
  label: string
}

export type FilterDefinition = {
  id: string
  tagLabel: string
  menuLabel: string
  emptyStatus: string
  options: FilterOption[]
}

export const FILTER_TYPES: LayoutFilterType[] = ["type", "medium", "status"]

export const FILTER_DEFINITIONS: Record<LayoutFilterType, FilterDefinition> = {
  type: {
    id: "type",
    tagLabel: "Type",
    menuLabel: "Type",
    emptyStatus: "No types selected yet",
    options: [
      { id: "invoice", label: "Invoice" },
      { id: "estimate", label: "Estimate" },
      { id: "receipt", label: "Receipt" },
    ],
  },
  medium: {
    id: "medium",
    tagLabel: "Paper type",
    menuLabel: "Paper type",
    emptyStatus: "No paper types selected yet",
    options: [],
  },
  status: {
    id: "status",
    tagLabel: "Status",
    menuLabel: "Status",
    emptyStatus: "No statuses selected yet",
    options: [
      { id: "published", label: "Published" },
      { id: "draft", label: "Draft" },
    ],
  },
}

export const ADD_FILTER_OPTIONS = FILTER_TYPES.map((id) => ({
  id,
  menuLabel: FILTER_DEFINITIONS[id].menuLabel,
}))

export const EMPTY_SELECTIONS: Record<LayoutFilterType, string[]> = {
  type: [],
  medium: [],
  status: [],
}

export function buildLayoutFilterDefinitions(
  mediums: MediumRow[]
): Record<LayoutFilterType, FilterDefinition> {
  return {
    ...FILTER_DEFINITIONS,
    medium: {
      ...FILTER_DEFINITIONS.medium,
      options: mediums.map((medium) => ({
        id: medium.id,
        label: medium.name,
      })),
    },
  }
}
