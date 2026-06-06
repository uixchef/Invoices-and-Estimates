import { formatUpdatedOn } from "@/lib/format-updated-ago"
import type { MediumRow } from "@/lib/mediums-data"

export type PaperSize = "A4" | "US letter" | "Custom"
export type MediumOrientation = "Portrait" | "Landscape"
export type MediumResolution = "150" | "300" | "600"

export type MediumSafeArea = {
  top: number
  right: number
  bottom: number
  left: number
}

export type MediumFormState = {
  paperSize: PaperSize
  orientation: MediumOrientation
  width: number
  height: number
  safeArea: MediumSafeArea
  resolution: MediumResolution
}

const PAPER_PRESETS: Record<Exclude<PaperSize, "Custom">, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  "US letter": { width: 216, height: 279 },
}

export const RESOLUTION_OPTIONS: Array<{
  value: MediumResolution
  label: string
  display: string
}> = [
  { value: "150", label: "150 DPI - Draft", display: "150 DPI" },
  { value: "300", label: "300 DPI - Print quality", display: "300 DPI" },
  { value: "600", label: "600 DPI - Fine", display: "600 DPI" },
]

export const DEFAULT_MEDIUM_FORM: MediumFormState = {
  paperSize: "A4",
  orientation: "Portrait",
  width: PAPER_PRESETS.A4.width,
  height: PAPER_PRESETS.A4.height,
  safeArea: { top: 3, right: 3, bottom: 3, left: 3 },
  resolution: "150",
}

export function getPaperPreset(paperSize: PaperSize): { width: number; height: number } | null {
  if (paperSize === "Custom") {
    return null
  }
  return PAPER_PRESETS[paperSize]
}

export function getPresetDimensionsForOrientation(
  paperSize: Exclude<PaperSize, "Custom">,
  orientation: MediumOrientation
): { width: number; height: number } {
  const preset = PAPER_PRESETS[paperSize]
  return getOrientedDimensions(preset.width, preset.height, orientation)
}

export function applyPaperPreset(
  state: MediumFormState,
  paperSize: PaperSize
): MediumFormState {
  const preset = getPaperPreset(paperSize)
  if (!preset) {
    return { ...state, paperSize }
  }

  const oriented = getOrientedDimensions(
    preset.width,
    preset.height,
    state.orientation
  )

  return {
    ...state,
    paperSize,
    width: oriented.width,
    height: oriented.height,
  }
}

export function applyOrientation(
  state: MediumFormState,
  orientation: MediumOrientation
): MediumFormState {
  const preset = getPaperPreset(state.paperSize)
  const oriented = preset
    ? getOrientedDimensions(preset.width, preset.height, orientation)
    : getOrientedDimensions(state.width, state.height, orientation)

  return {
    ...state,
    orientation,
    width: oriented.width,
    height: oriented.height,
  }
}

export function isCustomPaperSize(paperSize: PaperSize): boolean {
  return paperSize === "Custom"
}

export function getEffectiveDimensions(state: MediumFormState): {
  width: number
  height: number
} {
  return { width: state.width, height: state.height }
}

export function getOrientedDimensions(
  width: number,
  height: number,
  orientation: MediumOrientation
): { width: number; height: number } {
  if (orientation === "Portrait") {
    return {
      width: Math.min(width, height),
      height: Math.max(width, height),
    }
  }

  return {
    width: Math.max(width, height),
    height: Math.min(width, height),
  }
}

function parseDimensionsString(dimensions: string): { width: number; height: number } {
  const match = dimensions.match(/(\d+)\s*×\s*(\d+)/)
  if (!match) {
    return { width: 210, height: 297 }
  }

  return { width: Number(match[1]), height: Number(match[2]) }
}

function parseResolution(resolution: MediumRow["resolution"]): MediumResolution {
  if (resolution.startsWith("300")) {
    return "300"
  }
  if (resolution.startsWith("600")) {
    return "600"
  }
  return "150"
}

export function formatMediumUpdatedOn(date = new Date()): string {
  return formatUpdatedOn(date)
}

export function mediumFormToRowFields(formState: MediumFormState): Pick<
  MediumRow,
  "paper" | "orientation" | "dimensions" | "resolution" | "safeArea"
> {
  const { width, height } = getEffectiveDimensions(formState)

  return {
    paper: formState.paperSize,
    orientation: formState.orientation,
    dimensions: `${width} × ${height} mm`,
    resolution: `${formState.resolution} DPI`,
    safeArea: { ...formState.safeArea },
  }
}

export function mediumRowToFormState(row: MediumRow): MediumFormState {
  const { width, height } = parseDimensionsString(row.dimensions)

  return {
    paperSize: row.paper,
    orientation: row.orientation,
    width,
    height,
    safeArea: { ...row.safeArea },
    resolution: parseResolution(row.resolution),
  }
}

export function getMediumPreviewMetrics(state: MediumFormState) {
  const oriented = getEffectiveDimensions(state)
  const printableWidth = Math.max(
    oriented.width - state.safeArea.left - state.safeArea.right,
    0
  )
  const printableHeight = Math.max(
    oriented.height - state.safeArea.top - state.safeArea.bottom,
    0
  )
  const aspect = oriented.width / oriented.height
  const resolution = RESOLUTION_OPTIONS.find((option) => option.value === state.resolution)

  return {
    title: `${state.paperSize} · ${state.orientation}`,
    dimensions: `${oriented.width} × ${oriented.height} mm`,
    resolution: resolution?.display ?? `${state.resolution} DPI`,
    safeArea: `${Math.max(
      state.safeArea.top,
      state.safeArea.right,
      state.safeArea.bottom,
      state.safeArea.left
    )} mm`,
    aspect: `1 : ${aspect.toFixed(2)}`,
    printableArea: `${printableWidth} × ${printableHeight} mm`,
    oriented,
    printableWidth,
    printableHeight,
  }
}
