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

export const MEDIUM_ROWS: MediumRow[] = MEDIUM_NAME_ORDER.map((nameIndex, rowIndex) => ({
  id: `medium-${rowIndex + 1}`,
  name: MEDIUM_NAMES[nameIndex],
  ...MEDIUM_SEED_PROFILES[rowIndex],
}))

export const MEDIUM_BY_ID = Object.fromEntries(
  MEDIUM_ROWS.map((medium) => [medium.id, medium])
) as Record<string, MediumRow>

export function getMediumById(mediumId: string): MediumRow | undefined {
  return MEDIUM_BY_ID[mediumId]
}

export function getMediumName(mediumId: string): string {
  return getMediumById(mediumId)?.name ?? mediumId
}
