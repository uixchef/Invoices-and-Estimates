import type {
  BuilderDocumentType,
  GeneratedLayout,
} from "@/lib/layout-builder-types"
import { lineItemsForFamily } from "@/lib/document-identities"
import { demoPaymentDetails } from "@/lib/demo-payment"
import {
  hasVisualStyleIntent,
  resolveAccentColor,
  resolveLayoutFamily,
  type LayoutFamilyId,
} from "@/lib/layout-family"
import { getBuilderNow } from "@/lib/portfolio-capture"

/**
 * Curated demo reference: a statement-field invoice that is visually distinct
 * from Northwind Studio and reproducible with existing family primitives.
 */
export const REFERENCE_DEMO = {
  businessName: "Saffron",
  clientName: "Holt Atelier",
  accent: "#c2410c",
  family: "statement" as LayoutFamilyId,
  lineItems: [
    { description: "Seasonal campaign", qty: 1, rate: 5400 },
    { description: "Lookbook art direction", qty: 1, rate: 2400 },
    { description: "Retail stills", qty: 12, rate: 90 },
  ],
} as const

export const RECONSTRUCT_TODO_LABELS = [
  "Read the reference structure",
  "Map the major regions",
  "Rebuild editable content",
  "Match the visual hierarchy",
  "Validate the final document",
] as const

export type ReferenceAnalysis = {
  dominantHex: string
  suggestedFamily: LayoutFamilyId
}

const FAMILY_FROM_HUE: { max: number; family: LayoutFamilyId }[] = [
  { max: 20, family: "statement" },
  { max: 50, family: "statement" },
  { max: 90, family: "atelier" },
  { max: 160, family: "atelier" },
  { max: 210, family: "studio" },
  { max: 260, family: "studio" },
  { max: 320, family: "editorial" },
  { max: 360, family: "statement" },
]

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const nr = r / 255
  const ng = g / 255
  const nb = b / 255
  const max = Math.max(nr, ng, nb)
  const min = Math.min(nr, ng, nb)
  const l = (max + min) / 2
  if (max === min) {
    return { h: 0, s: 0, l }
  }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === nr) {
    h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6
  } else if (max === ng) {
    h = ((nb - nr) / d + 2) / 6
  } else {
    h = ((nr - ng) / d + 4) / 6
  }
  return { h: h * 360, s, l }
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`
}

export function familyFromDominantColor(hex: string): LayoutFamilyId {
  const match = hex.replace("#", "").match(/^([0-9a-f]{6})$/i)
  if (!match) {
    return REFERENCE_DEMO.family
  }
  const value = Number.parseInt(match[1], 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  const { h, s, l } = rgbToHsl(r, g, b)
  if (s < 0.18) {
    return l < 0.35 ? "ledger" : "swiss"
  }
  return FAMILY_FROM_HUE.find((entry) => h <= entry.max)?.family ?? "statement"
}

export function resolveReferenceFamily(
  prompt: string,
  analysis?: ReferenceAnalysis | null
): LayoutFamilyId {
  if (hasVisualStyleIntent(prompt)) {
    return resolveLayoutFamily(prompt)
  }
  return analysis?.suggestedFamily ?? REFERENCE_DEMO.family
}

function deriveBusinessName(prompt: string): string | null {
  const patterns = [
    /(?:venture|business|company|brand|store|shop|studio|agency|firm)[,:]?\s+(?:called|named)?\s*["']?([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,3})/,
    /(?:called|named)\s+["']?([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,3})/,
    /["“]([^"”]{2,40})["”]/,
  ]
  for (const re of patterns) {
    const match = prompt.match(re)
    if (match?.[1]) {
      return match[1].trim().replace(/[.,]$/, "")
    }
  }
  return null
}

/**
 * Maps a visual reference onto native layout primitives. Identity comes from
 * the interpreted reference (demo fixture); family/accent can be shifted by
 * the accompanying prompt. Never pastes the screenshot into the document.
 */
export function reconstructLayoutFromReference(
  prompt: string,
  documentType: BuilderDocumentType,
  analysis?: ReferenceAnalysis | null
): GeneratedLayout {
  const family = resolveReferenceFamily(prompt, analysis)
  const named = deriveBusinessName(prompt)
  const useDemoCopy = family === "statement" || !hasVisualStyleIntent(prompt)

  const now = getBuilderNow()
  const due = new Date(now)
  due.setDate(due.getDate() + 14)

  return {
    documentType,
    businessName: named ?? REFERENCE_DEMO.businessName,
    clientName: REFERENCE_DEMO.clientName,
    emphasis: null,
    style: family,
    accent: resolveAccentColor(
      prompt,
      hasVisualStyleIntent(prompt) ? family : REFERENCE_DEMO.family
    ),
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: useDemoCopy
      ? [...REFERENCE_DEMO.lineItems]
      : lineItemsForFamily(family, 3),
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber: `INV-${now.getFullYear()}-0142`,
    issueDate: now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    dueDate: due.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    payment: demoPaymentDetails({
      businessName: named ?? REFERENCE_DEMO.businessName,
      documentNumber: `INV-${now.getFullYear()}-0142`,
    }),
  }
}

export async function analyzeReferenceImage(
  file: File
): Promise<ReferenceAnalysis> {
  if (typeof createImageBitmap !== "function") {
    return {
      dominantHex: REFERENCE_DEMO.accent,
      suggestedFamily: REFERENCE_DEMO.family,
    }
  }

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  const size = 48
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    return {
      dominantHex: REFERENCE_DEMO.accent,
      suggestedFamily: REFERENCE_DEMO.family,
    }
  }
  ctx.drawImage(bitmap, 0, 0, size, size)
  bitmap.close()
  const { data } = ctx.getImageData(0, 0, size, size)

  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3]
    if (alpha < 80) {
      continue
    }
    const pr = data[i]
    const pg = data[i + 1]
    const pb = data[i + 2]
    const { s, l } = rgbToHsl(pr, pg, pb)
    if (l > 0.88 || l < 0.08 || s < 0.08) {
      continue
    }
    r += pr
    g += pg
    b += pb
    count += 1
  }

  const hex =
    count > 0
      ? toHex(r / count, g / count, b / count)
      : REFERENCE_DEMO.accent

  return {
    dominantHex: hex,
    suggestedFamily: familyFromDominantColor(hex),
  }
}

export function fieldMoodFromHex(hex: string): {
  a: string
  b: string
  c: string
  d: string
} {
  return {
    a: "#c4b5fd",
    b: hex,
    c: mixHex(hex, "#f8fafc", 0.55),
    d: mixHex(hex, "#a78bfa", 0.45),
  }
}

function mixHex(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16)
  const pb = Number.parseInt(b.slice(1), 16)
  const mix = (shift: number) => {
    const ca = (pa >> shift) & 255
    const cb = (pb >> shift) & 255
    return Math.round(ca + (cb - ca) * t)
  }
  return toHex(mix(16), mix(8), mix(0))
}

