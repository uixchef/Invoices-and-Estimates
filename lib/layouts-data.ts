import { buildUpdatedMeta } from "@/lib/format-updated-ago"
import {
  BUILDER_PAPER_PRESETS,
  deterministicOrder,
} from "@/lib/mediums-data"

export type LayoutRow = {
  id: string
  name: string
  type: "Invoice" | "Estimate" | "Receipt"
  /** References a builder paper preset (A4, US letter, Legal). */
  mediumId: string
  status: "Published" | "Draft"
  updatedOn: string
  updatedAgo: string
  /** Original layout id when this row is a client-side clone. */
  clonedFromId?: string
  /** Blank canvas with no designed content yet — renders an empty thumbnail. */
  isBlank?: boolean
}

const LAYOUT_COUNT = 212
const TYPES: LayoutRow["type"][] = ["Invoice", "Estimate", "Receipt"]
const STATUSES: LayoutRow["status"][] = ["Published", "Draft"]

/** First rows when sorted by "Updated on" — cycles Invoice, Estimate, Receipt. */
const FEATURED_TYPE_ORDER: LayoutRow["type"][] = [
  "Invoice",
  "Estimate",
  "Receipt",
  "Invoice",
  "Estimate",
  "Receipt",
  "Invoice",
  "Estimate",
  "Receipt",
]

// Two disjoint, coprime word pools (43 × 71). Pairing adjective[i % 43] with
// noun[i % 71] only repeats every lcm(43, 71) = 3053 rows, so every name across
// all 212 rows is unique with no repeated full names.
const NAME_ADJECTIVES = [
  "Modern", "Classic", "Minimal", "Bold", "Elegant", "Clean", "Compact",
  "Refined", "Lucid", "Sleek", "Crisp", "Polished", "Smart", "Premium",
  "Essential", "Signature", "Studio", "Corporate", "Boutique", "Artisan",
  "Heritage", "Luxe", "Vibrant", "Subtle", "Sharp", "Pure", "Pro", "Dynamic",
  "Graceful", "Streamlined", "Timeless", "Versatile", "Bespoke", "Contemporary",
  "Geometric", "Monochrome", "Gradient", "Layered", "Structured", "Balanced",
  "Editorial", "Fluid", "Nordic",
]

const NAME_NOUNS = [
  "Aurora", "Nimbus", "Meridian", "Lumen", "Vertex", "Cobalt", "Slate",
  "Quartz", "Onyx", "Ivory", "Marigold", "Sage", "Cedar", "Aspen", "Harbor",
  "Atlas", "Beacon", "Cascade", "Drift", "Ember", "Flux", "Glimmer", "Halcyon",
  "Indigo", "Juniper", "Kestrel", "Linen", "Mosaic", "Nova", "Opal", "Pebble",
  "Quill", "Ridge", "Saffron", "Tundra", "Umbra", "Verve", "Willow", "Zephyr",
  "Apex", "Bloom", "Coral", "Dune", "Echo", "Fern", "Grove", "Haven", "Iris",
  "Jade", "Lark", "Meadow", "Nectar", "Orchid", "Prairie", "Reef", "Solstice",
  "Terra", "Vale", "Wren", "Crest", "Lagoon", "Maple", "Onset", "Pinnacle",
  "Radiant", "Summit", "Twilight", "Vivid", "Cirrus", "Frost", "Glade",
]

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]
}

const LAYOUT_UPDATED_META = buildUpdatedMeta(LAYOUT_COUNT)
const LAYOUT_NAME_ORDER = deterministicOrder(LAYOUT_COUNT, 61)

export const LAYOUT_ROWS: LayoutRow[] = LAYOUT_NAME_ORDER.map((nameIndex, rowIndex) => {
  const number = rowIndex + 1
  const isFeatured = rowIndex < FEATURED_TYPE_ORDER.length
  const medium = pick(BUILDER_PAPER_PRESETS, rowIndex * 13 + 5)
  const meta = LAYOUT_UPDATED_META[rowIndex]

  return {
    id: `layout-${number}`,
    name: `${pick(NAME_ADJECTIVES, nameIndex)} ${pick(NAME_NOUNS, nameIndex)}`,
    type: isFeatured ? FEATURED_TYPE_ORDER[rowIndex] : pick(TYPES, rowIndex * 7 + 2),
    mediumId: medium.id,
    status: pick(STATUSES, rowIndex * 11 + 3),
    updatedOn: meta.updatedOn,
    updatedAgo: meta.updatedAgo,
  }
})

/**
 * Blank-canvas drafts surfaced on the dashboard with empty (skeleton)
 * thumbnails — the Layout Card "thumbnail=False" state (Figma 3082:30384
 * default / 3082:30369 hover). Recent timestamps float these to the top.
 */
const BLANK_LAYOUT_COUNT = 8
const BLANK_LAYOUT_META = buildUpdatedMeta(BLANK_LAYOUT_COUNT)

export const BLANK_LAYOUT_ROWS: LayoutRow[] = Array.from(
  { length: BLANK_LAYOUT_COUNT },
  (_, index) => {
    const number = index + 1
    const meta = BLANK_LAYOUT_META[index]

    return {
      id: `layout-blank-${number}`,
      name: `Layout ${number}`,
      type: "Invoice",
      mediumId: pick(BUILDER_PAPER_PRESETS, index * 5 + 1).id,
      status: "Draft",
      updatedOn: meta.updatedOn,
      updatedAgo: meta.updatedAgo,
      isBlank: true,
    }
  }
)
