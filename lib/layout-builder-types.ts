/** Routes where the layout builder runs without hub sidebar or payments top nav. */
export const LAYOUT_BUILDER_ROUTE = "/invoices/layouts/builder"

export function isLayoutBuilderRoute(pathname: string): boolean {
  return pathname === LAYOUT_BUILDER_ROUTE
}

export type BuilderReferenceImage = {
  id: string
  name: string
  previewUrl: string
}

/**
 * An invoice element the user picked in visual-edit mode to attach to the next
 * prompt as context — surfaced as a removable chip in the composer, mirroring
 * Cursor's "selected element → chat" flow.
 */
export type BuilderSelection = {
  id: string
  /** Human label shown on the chip, e.g. "Business name", "Item 1 description". */
  label: string
}

/**
 * Per-layer style overrides set from the "Visual edits" inspector. Applied as
 * inline styles on the layer so they win over the layout's base Tailwind
 * classes. Keyed by the layer label in the builder context.
 */
export type BuilderLayerStyle = {
  fontFamily?: string
  fontSize?: number
  fontStyle?: "normal" | "italic"
  fontWeight?: number
  /** Independent B/U toggles (italic is tracked via fontStyle). */
  bold?: boolean
  underline?: boolean
  textAlign?: "left" | "center" | "right" | "justify"
  color?: string
  backgroundColor?: string
  letterSpacing?: number
  lineHeight?: number
  /** Box model — per-side padding (px). */
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  /** Box model — per-side margin (px). */
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  /** Explicit sizing (px). */
  width?: number
  height?: number
  /** Per-corner border radius (px). */
  radiusTopLeft?: number
  radiusTopRight?: number
  radiusBottomRight?: number
  radiusBottomLeft?: number
  /** Border. */
  borderWidth?: number
  borderStyle?: "none" | "solid" | "dashed" | "dotted"
  borderColor?: string
}

/** MIME type for drag-and-drop from the Add elements palette. */
export const ELEMENT_DRAG_MIME = "application/x-invoice-element"

/** Drop anchor within the invoice document body. */
export type PlacedElementZone =
  | "after-billing"
  | "after-items"
  | "after-totals"
  | "after-notes"
  | "end"

/** User-placed element on the invoice canvas. */
export type PlacedElement = {
  id: string
  kind: string
  label: string
  zone: PlacedElementZone
  /** Editable placeholder copy — seeded on drop, updated in visual edit mode. */
  content: string
}

/**
 * Generation request handed off from the Create-with-AI prompt to the builder.
 * Carries the user's prompt, the chosen medium/model, and any reference images.
 */
export type LayoutBuilderSeed = {
  prompt: string
  mediumId: string
  modelId: string
  references: BuilderReferenceImage[]
}

/**
 * Handoff for opening an existing layout in the builder (the dashboard "Edit"
 * action). The builder restores this layout's name, medium, and document type,
 * reconstructs a believable chat history, and lands directly in the ready state
 * (no generation animation). `seed` deterministically resolves the same design
 * each time the layout is opened.
 */
export type LayoutBuilderEditSeed = {
  layoutId: string
  name: string
  documentType: BuilderDocumentType
  mediumId: string
  /** Stable derivation seed (the layout's numeric index) for the design. */
  seed: number
}

import type { AiTodoItem } from "@/components/ai/ai-todo-list"

export type BuilderUserMessage = {
  id: string
  role: "user"
  text: string
  references: BuilderReferenceImage[]
}

/** A clarifying question and the answer(s) the user gave for it. */
export type BuilderReceivedAnswer = {
  prompt: string
  values: string[]
}

/**
 * A completed assistant turn, persisted to the transcript so the full context
 * (received answers, reasoning, plan, and the closing recap) stays visible
 * across follow-ups — the way Cursor keeps each turn in history.
 */
export type BuilderAssistantMessage = {
  id: string
  role: "assistant"
  receivedAnswers: BuilderReceivedAnswer[] | null
  /** Reasoning recap from before clarifying questions were asked. */
  preReasoning: string | null
  preDurationSec: number | null
  /** Reasoning recap after answers were received (generation phase). */
  reasoning: string
  durationSec: number
  todos: AiTodoItem[]
  summary: string
}

export type BuilderMessage = BuilderUserMessage | BuilderAssistantMessage

export type BuilderStatus =
  | "idle"
  | "reasoning"
  | "asking"
  | "thinking"
  | "ready"

export type BuilderViewMode = "preview" | "code"

export const BUILDER_DOCUMENT_TYPES = [
  "Standard invoice",
  "Estimate",
  "Receipt",
  "Credit note",
] as const

export type BuilderDocumentType = (typeof BUILDER_DOCUMENT_TYPES)[number]

export const DEFAULT_LAYOUT_NAME = "New layout"

export type BuilderVisualStyle = "minimal" | "modern" | "classic" | "bold"

export type GeneratedLineItem = {
  description: string
  qty: number
  rate: number
}

/**
 * Resolved layout the builder renders once generation settles. Derived from the
 * prompt and the user's clarifying answers (stands in for the generation API).
 */
export type GeneratedLayout = {
  documentType: BuilderDocumentType
  businessName: string
  clientName: string
  emphasis: string | null
  style: BuilderVisualStyle
  accent: string
  currencyCode: string
  currencySymbol: string
  sections: {
    logo: boolean
    items: boolean
    taxes: boolean
    notes: boolean
    terms: boolean
  }
  lineItems: GeneratedLineItem[]
  taxRate: number
  documentNumber: string
  issueDate: string
  dueDate: string
}
