import type { GeneratedLayout } from "@/lib/layout-builder-types"
import {
  FAMILY_ACCENT,
  LAYOUT_FAMILY_IDS,
  normalizeLayoutStyle,
  type LayoutFamilyId,
} from "@/lib/layout-family"

export const CUSTOM_BRAND_BOARDS_KEY = "layouts-ai-custom-brand-boards-v1"

export type BrandTheme = {
  id: string
  name: string
  primary: string
  accent: string
  surface: string
  strongSurface: string
  text: string
  mutedText: string
  border: string
}

export type BrandTypePairing = {
  id: string
  name: string
  headingFont: string
  bodyFont: string
  headingLabel: string
  bodyLabel: string
}

export function fontClassification(label: string): "Sans" | "Serif" | "Mono" {
  if (/mono/i.test(label)) {
    return "Mono"
  }
  if (/serif|newsreader/i.test(label)) {
    return "Serif"
  }
  return "Sans"
}

/** Compact specimen copy: never `Font / Font`. */
export function typePairingSpecimen(
  type: Pick<BrandTypePairing, "headingLabel" | "bodyLabel">
): { primary: string; secondary: string } {
  if (type.headingLabel === type.bodyLabel) {
    return {
      primary: type.headingLabel,
      secondary: fontClassification(type.headingLabel),
    }
  }
  return { primary: type.headingLabel, secondary: type.bodyLabel }
}

export type BrandBoard = {
  id: string
  name: string
  description: string
  origin: "built-in" | "custom"
  themeId: string
  typeId: string
  theme: BrandTheme
  type: BrandTypePairing
}

export type BrandSelection = {
  boardId: string | null
  themeId: string
  typeId: string
}

export type ResolvedFamilyBrand = {
  page: string
  text: string
  muted: string
  primary: string
  accent: string
  strong: string
  border: string
  headingFont: string
  bodyFont: string
  selection: BrandSelection | null
  exactBoardId: string | null
}

const GEIST_SANS =
  "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
const GEIST_MONO =
  "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace"
const INTER = "var(--font-inter), Inter, system-ui, sans-serif"
const NEWSREADER = 'var(--font-newsreader), "Newsreader", Georgia, serif'
const INSTRUMENT =
  'var(--font-instrument-serif), "Instrument Serif", Georgia, serif'

export const BRAND_FONTS = [
  { id: "geist-sans", label: "Geist Sans", value: GEIST_SANS },
  { id: "inter", label: "Inter", value: INTER },
  { id: "newsreader", label: "Newsreader", value: NEWSREADER },
  { id: "instrument", label: "Instrument Serif", value: INSTRUMENT },
  { id: "geist-mono", label: "Geist Mono", value: GEIST_MONO },
] as const

export const BRAND_TYPE_PAIRINGS: BrandTypePairing[] = [
  {
    id: "studio-sans",
    name: "Studio sans",
    headingFont: GEIST_SANS,
    bodyFont: GEIST_SANS,
    headingLabel: "Geist Sans",
    bodyLabel: "Geist Sans",
  },
  {
    id: "editorial-serif",
    name: "Editorial serif",
    headingFont: NEWSREADER,
    bodyFont: NEWSREADER,
    headingLabel: "Newsreader",
    bodyLabel: "Newsreader",
  },
  {
    id: "technical-index",
    name: "Technical index",
    headingFont: GEIST_MONO,
    bodyFont: GEIST_SANS,
    headingLabel: "Geist Mono",
    bodyLabel: "Geist Sans",
  },
  {
    id: "instrument-display",
    name: "Instrument display",
    headingFont: INSTRUMENT,
    bodyFont: GEIST_SANS,
    headingLabel: "Instrument Serif",
    bodyLabel: "Geist Sans",
  },
  {
    id: "news-sans",
    name: "News sans",
    headingFont: NEWSREADER,
    bodyFont: INTER,
    headingLabel: "Newsreader",
    bodyLabel: "Inter",
  },
  {
    id: "corporate-inter",
    name: "Corporate inter",
    headingFont: INTER,
    bodyFont: INTER,
    headingLabel: "Inter",
    bodyLabel: "Inter",
  },
  {
    id: "dual-serif",
    name: "Dual serif",
    headingFont: INSTRUMENT,
    bodyFont: NEWSREADER,
    headingLabel: "Instrument Serif",
    bodyLabel: "Newsreader",
  },
  {
    id: "ledger-pair",
    name: "Ledger pair",
    headingFont: GEIST_SANS,
    bodyFont: GEIST_MONO,
    headingLabel: "Geist Sans",
    bodyLabel: "Geist Mono",
  },
]

export const BRAND_THEMES: BrandTheme[] = [
  {
    id: "harbor-studio",
    name: "Harbor studio",
    primary: "#1a4cff",
    accent: "#0b1220",
    surface: "#eef1f8",
    strongSurface: "#0b1220",
    text: "#0b1220",
    mutedText: "#64748b",
    border: "#c7d0e0",
  },
  {
    id: "folio-editorial",
    name: "Folio editorial",
    primary: "#7a2832",
    accent: "#1c1410",
    surface: "#f4efe6",
    strongSurface: "#1c1410",
    text: "#1c1410",
    mutedText: "#6b5e52",
    border: "#d6cdc4",
  },
  {
    id: "indexed-grid",
    name: "Indexed grid",
    primary: "#e10600",
    accent: "#0a0a0a",
    surface: "#eceae3",
    strongSurface: "#0a0a0a",
    text: "#0a0a0a",
    mutedText: "#525252",
    border: "#0a0a0a",
  },
  {
    id: "quiet-atelier",
    name: "Quiet atelier",
    primary: "#1f3d32",
    accent: "#8b7355",
    surface: "#f4efe8",
    strongSurface: "#1f3d32",
    text: "#1c1917",
    mutedText: "#5c564c",
    border: "#cfc6ba",
  },
  {
    id: "field-statement",
    name: "Field statement",
    primary: "#c2410c",
    accent: "#1c1917",
    surface: "#f7f1ea",
    strongSurface: "#c2410c",
    text: "#1c1917",
    mutedText: "#78716c",
    border: "#e7e5e4",
  },
  {
    id: "night-ledger",
    name: "Night ledger",
    primary: "#3ee0b7",
    accent: "#e8eaef",
    surface: "#101218",
    strongSurface: "#08090d",
    text: "#e8eaef",
    mutedText: "#94a3b8",
    border: "rgba(255,255,255,0.14)",
  },
  {
    id: "northwind-corporate",
    name: "Northwind corporate",
    primary: "#1e3a5f",
    accent: "#b45309",
    surface: "#ffffff",
    strongSurface: "#0f172a",
    text: "#0f172a",
    mutedText: "#475569",
    border: "#e2e8f0",
  },
  {
    id: "paper-quiet",
    name: "Paper quiet",
    primary: "#292524",
    accent: "#57534e",
    surface: "#fafaf9",
    strongSurface: "#1c1917",
    text: "#1c1917",
    mutedText: "#78716c",
    border: "#e7e5e4",
  },
]

const BUILT_IN_SPECS: {
  id: string
  name: string
  description: string
  themeId: string
  typeId: string
}[] = [
  {
    id: "harbor-studio",
    name: "Harbor studio",
    description: "Clean and structured",
    themeId: "harbor-studio",
    typeId: "studio-sans",
  },
  {
    id: "folio-editorial",
    name: "Folio editorial",
    description: "Warm and editorial",
    themeId: "folio-editorial",
    typeId: "editorial-serif",
  },
  {
    id: "indexed-grid",
    name: "Indexed grid",
    description: "Technical and precise",
    themeId: "indexed-grid",
    typeId: "technical-index",
  },
  {
    id: "quiet-atelier",
    name: "Quiet atelier",
    description: "Soft and refined",
    themeId: "quiet-atelier",
    typeId: "news-sans",
  },
  {
    id: "field-statement",
    name: "Field statement",
    description: "Bold and expressive",
    themeId: "field-statement",
    typeId: "instrument-display",
  },
  {
    id: "night-ledger",
    name: "Night ledger",
    description: "Dark and financial",
    themeId: "night-ledger",
    typeId: "ledger-pair",
  },
  {
    id: "northwind-corporate",
    name: "Northwind corporate",
    description: "Professional and restrained",
    themeId: "northwind-corporate",
    typeId: "corporate-inter",
  },
  {
    id: "paper-quiet",
    name: "Paper quiet",
    description: "Minimal and understated",
    themeId: "paper-quiet",
    typeId: "studio-sans",
  },
]

function pairingById(id: string): BrandTypePairing {
  return (
    BRAND_TYPE_PAIRINGS.find((entry) => entry.id === id) ?? BRAND_TYPE_PAIRINGS[0]
  )
}

function themeById(id: string): BrandTheme {
  return BRAND_THEMES.find((entry) => entry.id === id) ?? BRAND_THEMES[0]
}

export const BUILT_IN_BRAND_BOARDS: BrandBoard[] = BUILT_IN_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  description: spec.description,
  origin: "built-in" as const,
  themeId: spec.themeId,
  typeId: spec.typeId,
  theme: themeById(spec.themeId),
  type: pairingById(spec.typeId),
}))

const FAMILY_DEFAULT_THEME: Record<LayoutFamilyId, string> = {
  studio: "harbor-studio",
  editorial: "folio-editorial",
  swiss: "indexed-grid",
  atelier: "quiet-atelier",
  statement: "field-statement",
  ledger: "night-ledger",
}

const FAMILY_DEFAULT_TYPE: Record<LayoutFamilyId, string> = {
  studio: "studio-sans",
  editorial: "editorial-serif",
  swiss: "technical-index",
  atelier: "news-sans",
  statement: "instrument-display",
  ledger: "ledger-pair",
}

export function familyDefaultSelection(family: LayoutFamilyId): BrandSelection {
  return {
    boardId: null,
    themeId: FAMILY_DEFAULT_THEME[family],
    typeId: FAMILY_DEFAULT_TYPE[family],
  }
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "").slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 16, g: 24, b: 40 }
  }
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  const linear = (channel: number) => {
    const sample = channel / 255
    return sample <= 0.03928 ? sample / 12.92 : ((sample + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export function isDarkHex(hex: string): boolean {
  return relativeLuminance(hex) < 0.36
}

export function contrastOn(background: string): string {
  return relativeLuminance(background) < 0.45 ? "#f8fafc" : "#0b1220"
}

export function catalogBoards(custom: BrandBoard[]): BrandBoard[] {
  return [...BUILT_IN_BRAND_BOARDS, ...custom]
}

export function findBoard(
  id: string | null | undefined,
  custom: BrandBoard[]
): BrandBoard | undefined {
  if (!id) {
    return undefined
  }
  return catalogBoards(custom).find((board) => board.id === id)
}

export function findTheme(id: string, custom: BrandBoard[]): BrandTheme {
  const customTheme = custom.find((board) => board.themeId === id)?.theme
  return customTheme ?? themeById(id)
}

export function findType(id: string, custom: BrandBoard[]): BrandTypePairing {
  const customType = custom.find((board) => board.typeId === id)?.type
  return customType ?? pairingById(id)
}

export function exactBoardId(
  selection: BrandSelection,
  custom: BrandBoard[]
): string | null {
  const match = catalogBoards(custom).find(
    (board) =>
      board.themeId === selection.themeId && board.typeId === selection.typeId
  )
  return match?.id ?? null
}

export function selectionFromBoard(board: BrandBoard): BrandSelection {
  return { boardId: board.id, themeId: board.themeId, typeId: board.typeId }
}

function adaptTheme(family: LayoutFamilyId, theme: BrandTheme): Omit<
  ResolvedFamilyBrand,
  "headingFont" | "bodyFont" | "selection" | "exactBoardId"
> {
  if (family === "ledger") {
    const page = isDarkHex(theme.surface)
      ? theme.surface
      : isDarkHex(theme.strongSurface)
        ? theme.strongSurface
        : "#101218"
    const text = isDarkHex(page) ? (isDarkHex(theme.text) ? "#e8eaef" : theme.text) : theme.text
    return {
      page,
      text,
      muted: isDarkHex(page) ? "#94a3b8" : theme.mutedText,
      primary: theme.primary,
      accent: theme.accent,
      strong: isDarkHex(theme.strongSurface) ? theme.strongSurface : "#08090d",
      border: isDarkHex(page) ? "rgba(255,255,255,0.14)" : theme.border,
    }
  }
  return {
    page: theme.surface,
    text: theme.text,
    muted: theme.mutedText,
    primary: theme.primary,
    accent: theme.accent,
    strong: theme.strongSurface,
    border: theme.border,
  }
}

const BOLD_PRIMARY: Record<LayoutFamilyId, string> = {
  studio: "#0418c7",
  editorial: "#4a0d14",
  swiss: "#b10000",
  atelier: "#0c241c",
  statement: "#9a1f00",
  ledger: "#14f0c0",
}

/**
 * Stronger use of an existing theme's brand language — not a family swap.
 * Idempotent: already-intensified themes keep the same primary.
 */
export function intensifyBrandTheme(
  theme: BrandTheme,
  family: LayoutFamilyId | string
): BrandTheme {
  const id = normalizeLayoutStyle(family)
  const primary = BOLD_PRIMARY[id]
  const baseId = theme.id.replace(/-bold$/, "")
  return {
    ...theme,
    id: `${baseId}-bold`,
    name: /bold$/i.test(theme.name) ? theme.name : `${theme.name} bold`,
    primary,
    strongSurface:
      id === "statement" || id === "studio" ? primary : theme.strongSurface,
    accent: id === "ledger" ? primary : theme.accent,
    border: id === "swiss" ? primary : theme.border,
  }
}

export function resolveFamilyBrand(
  family: LayoutFamilyId | string,
  selection: BrandSelection | null | undefined,
  custom: BrandBoard[] = [],
  themeOverride?: BrandTheme | null
): ResolvedFamilyBrand {
  const id = normalizeLayoutStyle(family)
  let resolved = selection ?? familyDefaultSelection(id)
  if (resolved.boardId && !findBoard(resolved.boardId, custom)) {
    resolved = familyDefaultSelection(id)
  }
  const theme = themeOverride ?? findTheme(resolved.themeId, custom)
  const type = findType(resolved.typeId, custom)
  const paint = adaptTheme(id, theme)
  return {
    ...paint,
    headingFont: type.headingFont,
    bodyFont: type.bodyFont,
    selection: resolved,
    exactBoardId: exactBoardId(resolved, custom),
  }
}

export function brandCssVars(tokens: ResolvedFamilyBrand): Record<string, string> {
  return {
    "--bb-page": tokens.page,
    "--bb-text": tokens.text,
    "--bb-muted": tokens.muted,
    "--bb-primary": tokens.primary,
    "--bb-accent": tokens.accent,
    "--bb-strong": tokens.strong,
    "--bb-border": tokens.border,
    "--bb-heading": tokens.headingFont,
    "--bb-body": tokens.bodyFont,
  }
}

export function inheritPlacedAppearance(
  kind: string,
  tokens: ResolvedFamilyBrand
): { fontFamily: string; color?: string; backgroundColor?: string; borderColor?: string } {
  if (kind === "heading") {
    return { fontFamily: tokens.headingFont, color: tokens.text }
  }
  if (kind === "button") {
    return {
      fontFamily: tokens.bodyFont,
      color: contrastOn(tokens.primary),
      backgroundColor: tokens.primary,
    }
  }
  if (kind === "divider") {
    return { fontFamily: tokens.bodyFont, borderColor: tokens.border }
  }
  if (kind === "container" || kind.startsWith("columns-")) {
    return { fontFamily: tokens.bodyFont, borderColor: tokens.border }
  }
  if (kind === "quote") {
    return { fontFamily: tokens.bodyFont, color: tokens.muted }
  }
  return { fontFamily: tokens.bodyFont, color: tokens.text }
}

export function mergeInheritedStyle<T extends Record<string, unknown>>(
  inherited: T,
  override: Partial<T> | undefined
): T {
  return { ...inherited, ...Object.fromEntries(
    Object.entries(override ?? {}).filter(([, value]) => value !== undefined)
  ) } as T
}

export function brandFinancialFingerprint(layout: GeneratedLayout): string {
  return JSON.stringify({
    lineItems: layout.lineItems,
    taxRate: layout.taxRate,
    discountRate: layout.discountRate,
    currencyCode: layout.currencyCode,
    sections: layout.sections,
    payment: layout.payment,
    businessName: layout.businessName,
    clientName: layout.clientName,
    documentNumber: layout.documentNumber,
  })
}

export function allFamiliesResolve(selection: BrandSelection, custom: BrandBoard[] = []) {
  return LAYOUT_FAMILY_IDS.map((family) => ({
    family,
    tokens: resolveFamilyBrand(family, selection, custom),
    accent: FAMILY_ACCENT[family],
  }))
}

export function loadCustomBoards(): BrandBoard[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const raw = window.localStorage.getItem(CUSTOM_BRAND_BOARDS_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as BrandBoard[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (board) =>
        board &&
        board.origin === "custom" &&
        typeof board.id === "string" &&
        typeof board.name === "string" &&
        board.theme &&
        board.type
    )
  } catch {
    return []
  }
}

export function saveCustomBoards(boards: BrandBoard[]): void {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(CUSTOM_BRAND_BOARDS_KEY, JSON.stringify(boards))
}

export function createCustomBoard(input: {
  name: string
  theme: Omit<BrandTheme, "id" | "name">
  type: Pick<BrandTypePairing, "headingFont" | "bodyFont">
}): BrandBoard {
  const id = `custom-${Date.now().toString(36)}`
  const heading =
    BRAND_FONTS.find((font) => font.value === input.type.headingFont)?.label ??
    "Heading"
  const body =
    BRAND_FONTS.find((font) => font.value === input.type.bodyFont)?.label ?? "Body"
  const type: BrandTypePairing = {
    id: `${id}-type`,
    name: `${heading} / ${body}`,
    headingFont: input.type.headingFont,
    bodyFont: input.type.bodyFont,
    headingLabel: heading,
    bodyLabel: body,
  }
  const theme: BrandTheme = {
    id: `${id}-theme`,
    name: input.name.trim() || "Custom board",
    ...input.theme,
  }
  return {
    id,
    name: input.name.trim() || "Custom board",
    description: "Saved locally",
    origin: "custom",
    themeId: theme.id,
    typeId: type.id,
    theme,
    type,
  }
}

export const BOLD_BRAND_SELECTION: BrandSelection = {
  boardId: "field-statement",
  themeId: "field-statement",
  typeId: "instrument-display",
}

export function withBrandAccent(
  layout: GeneratedLayout,
  tokens: ResolvedFamilyBrand
): GeneratedLayout {
  return {
    ...layout,
    accent: tokens.primary,
    brand: tokens.selection ?? undefined,
  }
}

/**
 * Structured Brand Board commit. Preview and Apply both start from this patch
 * so the live document cannot drift from the board the user just saw.
 */
export function brandLayoutEditsFromSelection(
  family: LayoutFamilyId | string,
  selection: BrandSelection,
  custom: BrandBoard[] = []
): Pick<GeneratedLayout, "brand" | "accent"> & {
  brandTheme: undefined
} {
  const tokens = resolveFamilyBrand(family, selection, custom)
  return {
    brand: {
      boardId: selection.boardId,
      themeId: selection.themeId,
      typeId: selection.typeId,
    },
    accent: tokens.primary,
    brandTheme: undefined,
  }
}

/**
 * Canonical brand paint. `brandDraft` is preview-only: it ignores any AI
 * `brandTheme` overlay, matching the Apply commit which clears that overlay.
 */
export function resolvePaintedLayout(
  layout: GeneratedLayout,
  brandDraft: BrandSelection | null,
  custom: BrandBoard[] = []
): GeneratedLayout {
  const selection = brandDraft ?? layout.brand ?? null
  if (!selection) {
    return layout
  }
  const themeOverride = brandDraft ? undefined : layout.brandTheme
  const tokens = resolveFamilyBrand(layout.style, selection, custom, themeOverride)
  return withBrandAccent({ ...layout, brandTheme: themeOverride }, tokens)
}

export function canonicalBrandFingerprint(
  layout: GeneratedLayout,
  custom: BrandBoard[] = []
): string {
  const tokens = resolveFamilyBrand(
    layout.style,
    layout.brand ?? null,
    custom,
    layout.brandTheme
  )
  return JSON.stringify({
    style: layout.style,
    exactBoardId: tokens.exactBoardId,
    themeId: tokens.selection?.themeId,
    typeId: tokens.selection?.typeId,
    themeOverride: layout.brandTheme?.id ?? null,
    primary: tokens.primary,
    page: tokens.page,
    text: tokens.text,
    muted: tokens.muted,
    accent: tokens.accent,
    headingFont: tokens.headingFont,
    bodyFont: tokens.bodyFont,
  })
}

export function isBrandApplyNoop(
  committed: GeneratedLayout,
  selection: BrandSelection,
  custom: BrandBoard[] = []
): boolean {
  const preview = resolvePaintedLayout(committed, selection, custom)
  const applied = resolvePaintedLayout(
    { ...committed, ...brandLayoutEditsFromSelection(committed.style, selection, custom) },
    null,
    custom
  )
  return (
    canonicalBrandFingerprint(preview, custom) ===
      canonicalBrandFingerprint(applied, custom) &&
    canonicalBrandFingerprint(committed, custom) ===
      canonicalBrandFingerprint(preview, custom)
  )
}
