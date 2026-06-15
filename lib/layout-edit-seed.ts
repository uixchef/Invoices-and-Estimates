import type { LayoutRow } from "@/lib/layouts-data"
import {
  type BuilderDocumentType,
  type LayoutBuilderEditSeed,
} from "@/lib/layout-builder-types"

/** Dashboard layout types map onto the builder's document-type vocabulary. */
const DOCUMENT_TYPE_BY_LAYOUT_TYPE: Record<
  LayoutRow["type"],
  BuilderDocumentType
> = {
  Invoice: "Standard invoice",
  Estimate: "Estimate",
  Receipt: "Receipt",
}

/** Extracts the stable numeric index baked into a layout id (e.g. "layout-42"). */
function layoutSeedFromId(id: string): number {
  const match = id.match(/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

/**
 * Builds the builder handoff for opening an existing layout via "Edit". The
 * numeric `seed` makes the reconstructed design deterministic, so a given
 * layout always reopens to the same document.
 */
export function layoutEditSeedFromRow(row: LayoutRow): LayoutBuilderEditSeed {
  return {
    layoutId: row.id,
    name: row.name,
    documentType: DOCUMENT_TYPE_BY_LAYOUT_TYPE[row.type],
    mediumId: row.mediumId,
    seed: layoutSeedFromId(row.id),
    isBlank: Boolean(row.isBlank),
  }
}
