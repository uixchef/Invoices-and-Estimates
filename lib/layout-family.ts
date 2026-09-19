export const LAYOUT_FAMILY_IDS = [
  "studio",
  "editorial",
  "swiss",
  "atelier",
  "statement",
  "ledger",
] as const

export type LayoutFamilyId = (typeof LAYOUT_FAMILY_IDS)[number]

const LEGACY_TO_FAMILY: Record<string, LayoutFamilyId> = {
  brand: "studio",
  branded: "studio",
  modern: "studio",
  minimal: "swiss",
  compact: "swiss",
  soft: "swiss",
  luxury: "atelier",
  classic: "atelier",
  bold: "statement",
}

export const FAMILY_ACCENT: Record<LayoutFamilyId, string> = {
  studio: "#1a4cff",
  editorial: "#7a2832",
  swiss: "#e10600",
  atelier: "#1f3d32",
  statement: "#c2410c",
  ledger: "#3ee0b7",
}

export const FAMILY_LABEL: Record<LayoutFamilyId, string> = {
  studio: "studio",
  editorial: "editorial",
  swiss: "swiss grid",
  atelier: "atelier",
  statement: "statement",
  ledger: "ledger",
}

export const FAMILY_PROMPT_PHRASE: Record<LayoutFamilyId, string> = {
  studio:
    "Give it a confident creative-studio identity with strong typography and a designed amount-due close",
  editorial:
    "Give it an editorial magazine composition with a dramatic masthead and running folio",
  swiss:
    "Make it a rigorous indexed grid with hard rules and a single vermilion accent",
  atelier:
    "Make it a quiet luxury atelier document with a formal closing composition",
  statement:
    "Make it expressive with a large colour field and the amount due as a brand device",
  ledger:
    "Give it a contemporary dark financial ledger with clear transaction hierarchy",
}

const NAMED_ACCENTS: Record<string, string> = {
  purple: "#5b21b6",
  violet: "#5b21b6",
  indigo: "#3730a3",
  navy: "#1e3a8a",
  blue: "#1a4cff",
  cobalt: "#1a4cff",
  green: "#1f3d32",
  emerald: "#1f3d32",
  forest: "#1f3d32",
  mint: "#3ee0b7",
  red: "#e10600",
  vermilion: "#e10600",
  burgundy: "#7a2832",
  wine: "#7a2832",
  orange: "#c2410c",
  terracotta: "#c2410c",
  teal: "#0f766e",
  black: "#0a0a0a",
  charcoal: "#1c1917",
  gray: "#475467",
  grey: "#475467",
  gold: "#8b6914",
  bronze: "#8b7355",
}

const FAMILY_RULES: {
  family: LayoutFamilyId
  weight: number
  pattern: RegExp
}[] = [
  { family: "studio", weight: 4, pattern: /\bbrand(?:ed|ing|-forward)?\b/ },
  { family: "studio", weight: 4, pattern: /\b(studio|agency|creative)\b/ },
  { family: "studio", weight: 2, pattern: /\b(modern|professional|business)\b/ },
  { family: "atelier", weight: 4, pattern: /\b(luxury|luxurious|opulent|atelier)\b/ },
  {
    family: "atelier",
    weight: 3,
    pattern: /\b(premium|elegant|refined|sophisticated)\b/,
  },
  { family: "atelier", weight: 2, pattern: /\bclassic\b/ },
  { family: "swiss", weight: 4, pattern: /\b(swiss|grid|rigorous|technical)\b/ },
  { family: "swiss", weight: 3, pattern: /\b(minimal|minimalist|clean|simple)\b/ },
  { family: "swiss", weight: 3, pattern: /\b(compact|dense|information-dense)\b/ },
  { family: "statement", weight: 4, pattern: /\b(statement|expressive|dramatic)\b/ },
  { family: "statement", weight: 3, pattern: /\b(colour block|color block)\b/ },
  {
    family: "statement",
    weight: 3,
    pattern: /(?<!font\s)\bbold\b(?!\s+font)/,
  },
  {
    family: "editorial",
    weight: 4,
    pattern: /\b(editorial|typographic|asymmetric|magazine)\b/,
  },
  { family: "ledger", weight: 4, pattern: /\b(ledger|finance|financial|transaction)\b/ },
  { family: "ledger", weight: 3, pattern: /\b(digital[- ]first|fintech)\b/ },
]

const TIE_BREAK: readonly LayoutFamilyId[] = [
  "studio",
  "statement",
  "atelier",
  "swiss",
  "editorial",
  "ledger",
]

export function isLayoutFamilyId(value: unknown): value is LayoutFamilyId {
  return (
    typeof value === "string" &&
    (LAYOUT_FAMILY_IDS as readonly string[]).includes(value)
  )
}

export function normalizeLayoutStyle(style: string): LayoutFamilyId {
  if (isLayoutFamilyId(style)) {
    return style
  }
  return LEGACY_TO_FAMILY[style] ?? "studio"
}

export function accentForStyle(style: string): string {
  return FAMILY_ACCENT[normalizeLayoutStyle(style)]
}

export function resolveAccentColor(
  prompt: string,
  family: LayoutFamilyId
): string {
  const text = prompt.toLowerCase()
  for (const [name, hex] of Object.entries(NAMED_ACCENTS)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      return hex
    }
  }
  const hex = prompt.match(/#([0-9a-f]{6})\b/i)
  if (hex) {
    return `#${hex[1].toLowerCase()}`
  }
  return FAMILY_ACCENT[family]
}

export function resolveLayoutFamily(prompt: string): LayoutFamilyId {
  const text = prompt.toLowerCase()
  const scores = new Map<LayoutFamilyId, number>()

  for (const rule of FAMILY_RULES) {
    if (rule.pattern.test(text)) {
      scores.set(rule.family, (scores.get(rule.family) ?? 0) + rule.weight)
    }
  }

  if (scores.size === 0) {
    return "studio"
  }

  let best: LayoutFamilyId = "studio"
  let bestScore = -1
  for (const family of TIE_BREAK) {
    const score = scores.get(family) ?? 0
    if (score > bestScore) {
      best = family
      bestScore = score
    }
  }
  return best
}

export function resolveInitialVisualStyle(
  prompt: string,
  explicitStyle: unknown
): LayoutFamilyId {
  if (typeof explicitStyle === "string" && explicitStyle.trim()) {
    const raw = explicitStyle.trim().toLowerCase()
    if (isLayoutFamilyId(raw)) {
      return raw
    }
    if (raw in LEGACY_TO_FAMILY) {
      return LEGACY_TO_FAMILY[raw]
    }
  }
  return resolveLayoutFamily(prompt)
}

const DRAFT_FAMILY_ORDER: LayoutFamilyId[] = [
  "editorial",
  "studio",
  "statement",
  "swiss",
  "atelier",
  "ledger",
  "studio",
  "swiss",
]

export function dashboardFamilyForLayoutId(layoutId: string): LayoutFamilyId {
  const match = layoutId.match(/(\d+)/)
  const seed = match ? Number.parseInt(match[1], 10) : 1
  if (layoutId.startsWith("layout-draft-")) {
    const index = Math.max(seed, 1) - 1
    return DRAFT_FAMILY_ORDER[index % DRAFT_FAMILY_ORDER.length]
  }
  return LAYOUT_FAMILY_IDS[(seed * 3) % LAYOUT_FAMILY_IDS.length]
}

export function hasVisualStyleIntent(text: string): boolean {
  return FAMILY_RULES.some((rule) => rule.pattern.test(text.toLowerCase()))
}

export const PORTFOLIO_HERO_PROMPT =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."
