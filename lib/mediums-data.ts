import type { MediumSafeArea } from "@/lib/medium-form"
import { buildUpdatedMeta, type UpdatedMeta } from "@/lib/format-updated-ago"

export type MediumRow = {
  id: string
  name: string
  paper: "A4" | "US letter" | "Custom"
  orientation: "Portrait" | "Landscape"
  dimensions: string
  resolution: "150 DPI" | "300 DPI" | "600 DPI"
  safeArea: MediumSafeArea
  updatedOn: string
  updatedAgo: string
}

export const MEDIUM_NAMES = [
  "A4", "US letter", "Custom", "A3", "Legal", "Tabloid", "Executive", "B5",
  "A5", "C4", "Folio", "Half letter", "B4", "DLE", "Envelope", "A2", "A6",
  "B6", "Statement", "Ledger", "Quarto", "C5", "Monarch", "Postcard", "A0",
  "A1", "A7", "B0", "B1", "B2", "B3", "C0", "C1", "C2", "C3", "C6",
  "Government letter", "Government legal", "ANSI A", "ANSI B", "ANSI C",
  "ANSI D", "Arch A", "Arch B", "Arch C", "Arch D", "Photo 4×6", "Photo 5×7",
  "Index card", "Receipt roll",
] as const

export type MediumName = (typeof MEDIUM_NAMES)[number]

export function mediumToFilterId(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const PRESET_PAPERS = ["A4", "US letter"] as const satisfies readonly MediumRow["paper"][]
const RESOLUTIONS: MediumRow["resolution"][] = ["150 DPI", "300 DPI", "600 DPI"]

const PAPER_MM: Record<(typeof PRESET_PAPERS)[number], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  "US letter": { width: 216, height: 279 },
}

/** Stable Fisher–Yates shuffle — same order across builds/refreshes. */
export function deterministicOrder(length: number, seed: number): number[] {
  const order = Array.from({ length }, (_, index) => index)
  let state = (seed * 9973 + length) >>> 0

  for (let i = length - 1; i > 0; i--) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    const j = state % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  return order
}

function orientedDimensions(
  width: number,
  height: number,
  orientation: MediumRow["orientation"]
): string {
  const oriented =
    orientation === "Portrait"
      ? { width: Math.min(width, height), height: Math.max(width, height) }
      : { width: Math.max(width, height), height: Math.min(width, height) }

  return `${oriented.width} × ${oriented.height} mm`
}

function buildUniqueSafeAreas(count: number): MediumSafeArea[] {
  const seen = new Set<string>()
  const areas: MediumSafeArea[] = []

  for (let index = 0; areas.length < count; index++) {
    const area: MediumSafeArea = {
      top: 3 + ((index * 7) % 22),
      right: 3 + ((index * 11) % 20),
      bottom: 3 + ((index * 13) % 22),
      left: 3 + ((index * 17) % 20),
    }
    const key = `${area.top}-${area.right}-${area.bottom}-${area.left}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    areas.push(area)
  }

  return areas
}

function buildUniqueCustomDimensions(count: number): string[] {
  const seen = new Set<string>()
  const dimensions: string[] = []

  for (let index = 0; dimensions.length < count; index++) {
    const width = 90 + ((index * 19) % 340)
    const height = 110 + ((index * 29) % 480)
    const label = `${width} × ${height} mm`

    if (seen.has(label)) {
      continue
    }

    seen.add(label)
    dimensions.push(label)
  }

  return dimensions
}

type MediumSeedProfile = Pick<
  MediumRow,
  "paper" | "orientation" | "dimensions" | "resolution" | "safeArea" | "updatedOn" | "updatedAgo"
>

/** First 8 rows when sorted by "Updated on" — cycles A4, US letter, Custom. */
const FEATURED_COUNT = 8
const FEATURED_PAPER_ORDER: MediumRow["paper"][] = [
  "A4",
  "US letter",
  "Custom",
  "A4",
  "US letter",
  "Custom",
  "A4",
  "US letter",
]
const FEATURED_RESOLUTION_ORDER: MediumRow["resolution"][] = [
  "600 DPI",
  "300 DPI",
  "150 DPI",
  "150 DPI",
  "600 DPI",
  "300 DPI",
  "300 DPI",
  "150 DPI",
]

function parseDimensionPair(dimensions: string): { width: number; height: number } {
  const match = dimensions.match(/(\d+)\s*×\s*(\d+)/)

  if (!match) {
    return { width: 210, height: 297 }
  }

  return { width: Number(match[1]), height: Number(match[2]) }
}

function buildPresetProfile(
  paper: (typeof PRESET_PAPERS)[number],
  orientation: MediumRow["orientation"],
  resolution: MediumRow["resolution"],
  safeArea: MediumSafeArea,
  meta: UpdatedMeta
): MediumSeedProfile {
  const preset = PAPER_MM[paper]

  return {
    paper,
    orientation,
    dimensions: orientedDimensions(preset.width, preset.height, orientation),
    resolution,
    safeArea,
    updatedOn: meta.updatedOn,
    updatedAgo: meta.updatedAgo,
  }
}

function buildCustomProfile(
  dimensions: string,
  orientation: MediumRow["orientation"],
  resolution: MediumRow["resolution"],
  safeArea: MediumSafeArea,
  meta: UpdatedMeta
): MediumSeedProfile {
  const { width, height } = parseDimensionPair(dimensions)

  return {
    paper: "Custom",
    orientation,
    dimensions: orientedDimensions(width, height, orientation),
    resolution,
    safeArea,
    updatedOn: meta.updatedOn,
    updatedAgo: meta.updatedAgo,
  }
}

function buildMediumSeedProfiles(count: number): MediumSeedProfile[] {
  const profiles: MediumSeedProfile[] = []
  const safeAreas = buildUniqueSafeAreas(count)
  const updatedMeta = buildUpdatedMeta(count)
  const customDimensions = buildUniqueCustomDimensions(count)
  let customDimIndex = 0

  for (let index = 0; index < Math.min(FEATURED_COUNT, count); index++) {
    const paper = FEATURED_PAPER_ORDER[index]
    const resolution = FEATURED_RESOLUTION_ORDER[index]
    const orientation: MediumRow["orientation"] =
      index % 2 === 0 ? "Portrait" : "Landscape"
    const meta = updatedMeta[index]

    if (paper === "Custom") {
      const dimensions = customDimensions[customDimIndex]
      customDimIndex++

      profiles.push(
        buildCustomProfile(
          dimensions,
          orientation,
          resolution,
          safeAreas[index],
          meta
        )
      )
      continue
    }

    profiles.push(
      buildPresetProfile(
        paper,
        orientation,
        resolution,
        safeAreas[index],
        meta
      )
    )
  }

  // Remaining rows: custom sizes with unique dimensions; timestamps continue sequentially.
  while (profiles.length < count) {
    const index = profiles.length
    const orientation: MediumRow["orientation"] =
      index % 2 === 0 ? "Portrait" : "Landscape"

    profiles.push(
      buildCustomProfile(
        customDimensions[customDimIndex],
        orientation,
        RESOLUTIONS[customDimIndex % RESOLUTIONS.length],
        safeAreas[index],
        updatedMeta[index]
      )
    )

    customDimIndex++
  }

  return profiles
}

const MEDIUM_NAME_ORDER = deterministicOrder(MEDIUM_NAMES.length, 53)
const MEDIUM_SEED_PROFILES = buildMediumSeedProfiles(MEDIUM_NAMES.length)

/**
 * The synthetic seed assigns names, papers, dimensions, and orientation
 * independently, so a row *named* "A4" can carry a landscape, custom-sized
 * profile. The builder renders the page directly from the medium, so a
 * preset-named medium must actually match its paper. Normalise the rows whose
 * name is a known preset to that paper's canonical portrait geometry.
 */
function normalizePresetGeometry(
  name: string,
  profile: MediumSeedProfile
): MediumSeedProfile {
  const preset = PRESET_PAPERS.find((paper) => paper === name)
  if (!preset) {
    return profile
  }

  const { width, height } = PAPER_MM[preset]
  return {
    ...profile,
    paper: preset,
    orientation: "Portrait",
    dimensions: orientedDimensions(width, height, "Portrait"),
  }
}

export const MEDIUM_ROWS: MediumRow[] = MEDIUM_NAME_ORDER.map((nameIndex, rowIndex) => {
  const name = MEDIUM_NAMES[nameIndex]
  return {
    id: `medium-${rowIndex + 1}`,
    name,
    ...normalizePresetGeometry(name, MEDIUM_SEED_PROFILES[rowIndex]),
  }
})

/**
 * Fixed paper presets offered in the builder's medium picker. The broader
 * mediums library is paused, so layout creation is intentionally scoped to these
 * three canonical sizes (true ISO/US dimensions, portrait, 12 mm safe area).
 */
function buildPaperPreset(
  id: string,
  name: string,
  paper: MediumRow["paper"],
  width: number,
  height: number
): MediumRow {
  return {
    id,
    name,
    paper,
    orientation: "Portrait",
    dimensions: orientedDimensions(width, height, "Portrait"),
    resolution: "300 DPI",
    safeArea: { top: 12, right: 12, bottom: 12, left: 12 },
    updatedOn: "",
    updatedAgo: "Just now",
  }
}

export const BUILDER_PAPER_PRESETS: MediumRow[] = [
  buildPaperPreset("paper-a4", "A4", "A4", 210, 297),
  buildPaperPreset("paper-us-letter", "US letter", "US letter", 216, 279),
  buildPaperPreset("paper-legal", "Legal", "Custom", 216, 356),
]

export const DEFAULT_BUILDER_MEDIUM_ID = BUILDER_PAPER_PRESETS[0].id

const BUILDER_PRESET_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  BUILDER_PAPER_PRESETS.map((medium) => [medium.name, medium.id])
)

/**
 * Detects an explicit paper-size request inside free-text and maps it to one of
 * the builder paper presets, or returns `null` when the text names no size (so
 * the caller keeps the picker selection).
 *
 * Matching is intentionally conservative: it requires size-qualifying phrasing
 * ("US letter", "letter size", "8.5 x 11", "legal size") rather than the bare
 * words "letter" or "legal", which routinely appear in invoice copy and would
 * otherwise trigger false overrides.
 */
export function detectBuilderMediumFromText(text: string): string | null {
  const value = text.toLowerCase()

  if (/\ba4\b/.test(value)) {
    return BUILDER_PRESET_ID_BY_NAME.A4 ?? null
  }

  if (
    /\bus[-\s]?letter\b/.test(value) ||
    /\bletter[-\s](?:size|sized|paper|format)\b/.test(value) ||
    /\b8\.5\s*["”]?\s*[x×]\s*11\b/.test(value)
  ) {
    return BUILDER_PRESET_ID_BY_NAME["US letter"] ?? null
  }

  if (
    /\blegal[-\s]?(?:size|sized|paper|format)\b/.test(value) ||
    /\b8\.5\s*["”]?\s*[x×]\s*14\b/.test(value)
  ) {
    return BUILDER_PRESET_ID_BY_NAME.Legal ?? null
  }

  return null
}

/** The three paper presets surfaced in the builder/prompt medium picker. */
export function getBuilderMediumPresets(): MediumRow[] {
  return BUILDER_PAPER_PRESETS
}

/** Default builder medium — A4. */
export function getDefaultBuilderMediumId(): string {
  return DEFAULT_BUILDER_MEDIUM_ID
}

export const MEDIUM_BY_ID = Object.fromEntries(
  [...MEDIUM_ROWS, ...BUILDER_PAPER_PRESETS].map((medium) => [medium.id, medium])
) as Record<string, MediumRow>

export function getMediumById(mediumId: string): MediumRow | undefined {
  return MEDIUM_BY_ID[mediumId]
}

export function getMediumName(mediumId: string): string {
  return getMediumById(mediumId)?.name ?? mediumId
}

/** First medium named "A4" — default for blank layouts and Create with AI. */
export function getDefaultA4MediumId(
  mediums: readonly Pick<MediumRow, "id" | "name">[] = MEDIUM_ROWS
): string | undefined {
  return mediums.find((medium) => medium.name === "A4")?.id ?? mediums[0]?.id
}

/** Portrait-oriented page size in mm from a medium's `dimensions` label. */
export function getMediumPageDimensionsMm(
  mediumId: string | null
): { width: number; height: number } {
  const medium = mediumId ? getMediumById(mediumId) : undefined

  if (!medium) {
    return PAPER_MM.A4
  }

  return parseDimensionPair(medium.dimensions)
}

/**
 * Render scale for the builder preview: CSS px per millimetre. Calibrated so a
 * portrait A4 (210 mm wide) renders at 595 px — the document's original design
 * width — keeping existing layouts pixel-identical while every other medium
 * (US letter, custom, landscape) derives its own proportions from the same scale.
 */
export const DOCUMENT_PX_PER_MM = 595 / 210

/** Content never sits closer than this to the paper edge, even at tiny safe areas. */
const MIN_SAFE_AREA_PX = 12

export type DocumentPageProfile = {
  orientation: MediumRow["orientation"]
  /** Oriented page size in mm (width > height in Landscape). */
  widthMm: number
  heightMm: number
  safeAreaMm: MediumSafeArea
  /** Oriented page size in CSS px at the builder's render scale. */
  widthPx: number
  heightPx: number
  /** Safe-area inset in CSS px (floored so content never collides with the edge). */
  padding: { top: number; right: number; bottom: number; left: number }
}

/**
 * Resolves every layout-affecting property of the selected medium — oriented
 * dimensions, the px render size, and the safe-area insets — into one object so
 * the builder canvas can render the page exactly as the medium is configured.
 * Falls back to portrait A4 defaults when no medium is selected.
 */
export function getDocumentPageProfile(
  mediumId: string | null
): DocumentPageProfile {
  const medium = mediumId ? getMediumById(mediumId) : undefined
  const { width, height } = getMediumPageDimensionsMm(mediumId)
  const orientation = medium?.orientation ?? "Portrait"
  const safeAreaMm = medium?.safeArea ?? { top: 3, right: 3, bottom: 3, left: 3 }

  const toPx = (mm: number) =>
    Math.max(Math.round(mm * DOCUMENT_PX_PER_MM), MIN_SAFE_AREA_PX)

  return {
    orientation,
    widthMm: width,
    heightMm: height,
    safeAreaMm,
    widthPx: Math.round(width * DOCUMENT_PX_PER_MM),
    heightPx: Math.round(height * DOCUMENT_PX_PER_MM),
    padding: {
      top: toPx(safeAreaMm.top),
      right: toPx(safeAreaMm.right),
      bottom: toPx(safeAreaMm.bottom),
      left: toPx(safeAreaMm.left),
    },
  }
}
