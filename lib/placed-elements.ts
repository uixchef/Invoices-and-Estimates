import {
  ELEMENT_DRAG_MIME,
  type GeneratedLayout,
  type PlacedElement,
  type PlacedElementZone,
} from "@/lib/layout-builder-types"

export const ADD_ELEMENT_KINDS = [
  "heading",
  "paragraph",
  "list",
  "quote",
  "divider",
  "container",
  "columns-1",
  "columns-2",
  "columns-3",
  "columns-4",
  "spacer",
  "image",
  "button",
  "table",
] as const

export type AddElementKind = (typeof ADD_ELEMENT_KINDS)[number]

export function isAddElementKind(kind: string): kind is AddElementKind {
  return (ADD_ELEMENT_KINDS as readonly string[]).includes(kind)
}

export function columnCountForKind(kind: string): number | null {
  if (!kind.startsWith("columns-")) {
    return null
  }
  const count = Number.parseInt(kind.slice("columns-".length), 10)
  return Number.isFinite(count) && count > 0 ? count : 1
}

export function inspectorTabForKind(
  kind: string
): "content" | "style" | "advanced" {
  if (
    kind === "image" ||
    kind === "divider" ||
    kind === "spacer" ||
    kind === "container" ||
    kind.startsWith("columns-")
  ) {
    return "style"
  }
  return "content"
}

export type TableAddResolution =
  | { action: "select-existing"; message: string }
  | { action: "enable-items"; message: string }
  | { action: "place-bound" }

/**
 * Data → Table is the invoice line-items table, not a decorative grid.
 * A second copy is refused; a hidden table is re-enabled instead.
 */
export function resolveTableAdd(input: {
  isBlankSession: boolean
  itemsVisible: boolean
}): TableAddResolution {
  if (input.isBlankSession) {
    return { action: "place-bound" }
  }
  if (input.itemsVisible) {
    return {
      action: "select-existing",
      message: "Line items are already on this invoice",
    }
  }
  return {
    action: "enable-items",
    message: "Line items added to the invoice",
  }
}

export function visiblePlacedLabel(kind: string, baseLabel: string): string {
  const trimmed = baseLabel.trim()
  if (kind === "columns-1") return "1-column section"
  if (kind === "columns-2") return "2-column section"
  if (kind === "columns-3") return "3-column section"
  if (kind === "columns-4") return "4-column section"
  if (kind === "container") return trimmed || "Section"
  return trimmed || kind
}

export function nextPlacedLabel(
  _existing: PlacedElement[],
  kind: string,
  baseLabel: string
): string {
  return visiblePlacedLabel(kind, baseLabel)
}

export function nextPlacedId(existing: PlacedElement[]): string {
  let max = 0
  for (const element of existing) {
    const value = Number.parseInt(element.id.replace(/^placed-/, ""), 10)
    if (Number.isFinite(value)) {
      max = Math.max(max, value)
    }
  }
  return `placed-${max + 1}`
}

export function insertPlacedElement(
  existing: PlacedElement[],
  created: PlacedElement,
  index?: number
): PlacedElement[] {
  if (index == null) {
    return [...existing, created]
  }
  const copy = [...existing]
  copy.splice(Math.max(0, Math.min(index, copy.length)), 0, created)
  return copy
}

/**
 * Global insert index for a drop at `offset` inside a zone (0 = before the
 * first element in that zone; `zoneCount` = after the last).
 */
export function insertIndexForZone(
  existing: PlacedElement[],
  zone: PlacedElementZone,
  offset: number
): number {
  const order = zoneOrder()
  const zoneRank = order.indexOf(zone)
  const indices = existing
    .map((element, index) => (element.zone === zone ? index : -1))
    .filter((index) => index >= 0)
  if (indices.length === 0) {
    const after = existing.findIndex(
      (element) => order.indexOf(element.zone) > zoneRank
    )
    return after === -1 ? existing.length : after
  }
  if (offset <= 0) {
    return indices[0]
  }
  if (offset >= indices.length) {
    return indices[indices.length - 1] + 1
  }
  return indices[offset]
}

export function parseElementDrag(
  dataTransfer: Pick<DataTransfer, "getData">
): { kind: string; label: string } | null {
  const raw = dataTransfer.getData(ELEMENT_DRAG_MIME)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as { kind?: string; label?: string }
    if (!parsed.kind || !parsed.label) {
      return null
    }
    return { kind: parsed.kind, label: parsed.label }
  } catch {
    return null
  }
}

export function defaultColumnContents(kind: string): string[] | undefined {
  const count = columnCountForKind(kind)
  if (count == null) {
    return undefined
  }
  return Array.from({ length: count }, () => "Column content")
}

export function withLayoutBlocks(
  layout: GeneratedLayout,
  blocks: PlacedElement[]
): GeneratedLayout {
  return { ...layout, blocks }
}

export function zoneOrder(): PlacedElementZone[] {
  return ["after-billing", "after-items", "after-totals", "after-notes", "end"]
}
