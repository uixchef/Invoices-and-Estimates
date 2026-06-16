"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"

import type { AiAnswers, AiQuestion } from "@/components/ai/ai-questions"
import type { AiTodoItem } from "@/components/ai/ai-todo-list"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import {
  playCompletionSound,
  playErrorSound,
  playQuestionSound,
  primeCompletionSound,
} from "@/lib/completion-sound"
import {
  DELETE_CANCEL_LABEL,
  DELETE_CONFIRMATION_LABEL,
} from "@/lib/delete-confirmation-copy"
import {
  buildCompletionSummary,
  buildPostReasoning,
  buildReasoning,
  buildRecommendations,
} from "@/lib/builder-narrative"
import { getDefaultPlacedContent } from "@/lib/placed-element-defaults"
import { getDefaultBuilderMediumId } from "@/lib/mediums-data"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import {
  BUILDER_DOCUMENT_TYPES,
  DEFAULT_LAYOUT_NAME,
  type BuilderConditionRule,
  type BuilderDocumentType,
  type BuilderLayerKind,
  type BuilderLayerRules,
  type BuilderLayerStyle,
  type BuilderRuleKind,
  type BuilderMessage,
  type BuilderReferenceImage,
  type BuilderReceivedAnswer,
  type BuilderSelection,
  type BuilderStatus,
  type BuilderVisualStyle,
  type GeneratedLayout,
  type GeneratedLineItem,
  type LayoutBuilderEditSeed,
  type PlacedElement,
  type PlacedElementZone,
} from "@/lib/layout-builder-types"

/** Simulated generation latency until the layout-generation API is wired in. */
const SIMULATED_THINKING_MS = 7000

/** Invoice AI side-panel resize bounds (Figma: 3181:33796). */
const PANEL_MIN_WIDTH = 360
const PANEL_MAX_WIDTH = 640
const PANEL_DEFAULT_WIDTH = 360

const HISTORY_LIMIT = 50
const CODE_HISTORY_DEBOUNCE_MS = 500

/**
 * Per-tab persistence key. The builder keeps its working session in
 * sessionStorage so a refresh restores the user's recent state (generated
 * layout, placed elements, blank session, transcript) instead of dropping them
 * back into an empty builder that spins the first-generation animation forever.
 */
const SESSION_STORAGE_KEY = "invoice-builder-session-v1"

/** Shape persisted to sessionStorage. Transcript references (blob URLs) are
 *  dropped on save since they don't survive a reload. */
type PersistedBuilderSession = {
  v: 1
  name: string
  mediumId: string | null
  modelId: string | null
  documentType: BuilderDocumentType
  isBlankSession: boolean
  hasGeneratedOnce: boolean
  hasUnsavedChanges: boolean
  messages: BuilderMessage[]
  answers: AiAnswers | null
  receivedAnswers: BuilderReceivedAnswer[] | null
  preReasoning: string | null
  preThoughtDurationSec: number | null
  thoughtDurationSec: number | null
  layoutEdits: Partial<GeneratedLayout>
  layerText: Record<string, string>
  layerStyles: Record<string, BuilderLayerStyle>
  hiddenLayers: string[]
  layerDuplicates: Record<string, number>
  placedElements: PlacedElement[]
  codeOverride: string | null
  /** Per-turn version snapshots so eye/undo stay functional after a reload. */
  versionSnapshots: Record<string, VersionSnapshot>
}

/** Undo/redo captures document-editing state only (not panel chrome or chat). */
type BuilderHistorySnapshot = {
  layoutEdits: Partial<GeneratedLayout>
  layerText: Record<string, string>
  layerStyles: Record<string, BuilderLayerStyle>
  /** Layers hidden via the selector's delete control (reversible through undo). */
  hiddenLayers: string[]
  /** Per-layer inline duplicate count produced by the selector's duplicate control. */
  layerDuplicates: Record<string, number>
  placedElements: PlacedElement[]
  codeOverride: string | null
}

function cloneHistorySnapshot(
  snapshot: BuilderHistorySnapshot
): BuilderHistorySnapshot {
  return structuredClone(snapshot)
}

/**
 * Frozen document state captured when an assistant turn settles, keyed by that
 * turn's message id. Lets the user preview the canvas "as of that prompt" (eye
 * control) or revert to it (undo control). Carries the resolved layout too so
 * the preview is faithful even if answers / document type change later.
 */
type VersionSnapshot = BuilderHistorySnapshot & {
  generatedLayout: GeneratedLayout
}

/** Short "thinking" pass shown (with streaming reasoning) before questions. */
const REASONING_MS = 2600

/**
 * Clarifying questions the assistant asks before generating, so the layout
 * matches the user's intent on the first pass (Cursor-style).
 */
const BUILDER_QUESTIONS: AiQuestion[] = [
  {
    id: "focus",
    type: "text",
    prompt: "What should this layout emphasise?",
    placeholder: "e.g. clean branding, itemised detail, payment terms…",
  },
  {
    id: "style",
    type: "single-select",
    prompt: "Pick a visual style",
    required: true,
    options: [
      { id: "minimal", label: "Minimal" },
      { id: "modern", label: "Modern" },
      { id: "classic", label: "Classic" },
      { id: "bold", label: "Bold" },
    ],
    allowOther: true,
  },
  {
    id: "sections",
    type: "multi-select",
    prompt: "Which sections should be included?",
    options: [
      { id: "logo", label: "Logo & branding" },
      { id: "items", label: "Itemised table" },
      { id: "taxes", label: "Taxes & discounts" },
      { id: "notes", label: "Notes" },
      { id: "terms", label: "Payment terms" },
    ],
    allowOther: true,
  },
  {
    id: "currency",
    type: "select",
    prompt: "Default currency",
    placeholder: "Select currency",
    options: [
      { id: "usd", label: "USD ($)" },
      { id: "eur", label: "EUR (€)" },
      { id: "gbp", label: "GBP (£)" },
      { id: "inr", label: "INR (₹)" },
    ],
  },
  {
    id: "line-items",
    type: "stepper",
    prompt: "How many sample line items?",
    options: ["1", "2", "3", "4", "5"],
  },
]

/**
 * Words that signal an under-specified refinement ("make it nicer") versus a
 * concrete instruction ("change the header font to bold"). Used to decide
 * whether a follow-up needs clarification before we regenerate.
 *
 * Stands in for a model confidence/uncertainty signal until the API is wired in.
 */
const FOLLOW_UP_VAGUE_TERMS = [
  "better",
  "nicer",
  "cleaner",
  "improve",
  "improvement",
  "fix",
  "change",
  "update",
  "redo",
  "tweak",
  "adjust",
  "polish",
  "something",
  "stuff",
  "etc",
  "more",
  "less",
  "different",
  "redesign",
]

const FOLLOW_UP_CONCRETE_TERMS = [
  "color",
  "colour",
  "font",
  "logo",
  "header",
  "footer",
  "table",
  "column",
  "row",
  "tax",
  "discount",
  "total",
  "currency",
  "margin",
  "padding",
  "spacing",
  "align",
  "size",
  "date",
  "address",
  "border",
  "background",
  "section",
  "notes",
  "terms",
]

/** Style adjectives that signal the user already has a visual direction. */
const STYLE_HINT_TERMS = [
  "minimal",
  "modern",
  "classic",
  "bold",
  "clean",
  "simple",
  "elegant",
  "professional",
  "corporate",
  "playful",
  "luxury",
  "vintage",
  "sleek",
  "colorful",
  "colourful",
]

/** Section keywords that signal the user already named what to include. */
const SECTION_HINT_TERMS = [
  "logo",
  "brand",
  "item",
  "table",
  "tax",
  "discount",
  "note",
  "term",
  "payment",
  "total",
  "column",
  "qr",
  "signature",
]

const CURRENCY_HINT_RE = /\b(usd|eur|gbp|inr|dollar|euro|pound|rupee)\b|[$€£₹]/i

/**
 * Scales the *initial* clarifying questions to what the prompt is actually
 * missing instead of always asking the full set. A detailed brief (or a
 * reference image plus a few words) generates straight away; a sparse prompt
 * still gets the questions it needs. Returns `null` to skip questions entirely.
 *
 * Stands in for a model confidence signal until the generation API is wired in.
 */
function buildInitialQuestions(
  text: string,
  hasReferences: boolean
): AiQuestion[] | null {
  const normalized = text.trim().toLowerCase()
  const wordCount = normalized
    ? normalized.split(/\s+/).filter(Boolean).length
    : 0

  // A reference image carries strong intent; with even a short prompt, generate.
  if (hasReferences && wordCount >= 3) {
    return null
  }

  const hasStyle = STYLE_HINT_TERMS.some((term) => normalized.includes(term))
  const hasSections = SECTION_HINT_TERMS.some((term) =>
    normalized.includes(term)
  )
  const hasCurrency = CURRENCY_HINT_RE.test(text)
  const signals = [hasStyle, hasSections, hasCurrency].filter(Boolean).length

  // Specific enough to act on directly: a longer brief with a couple of
  // concrete signals, or three signals regardless of length.
  if ((wordCount >= 12 && signals >= 2) || signals >= 3) {
    return null
  }

  // Otherwise ask only for the gaps. Style/sections/currency are dropped when
  // the prompt already implies them; the open "focus" + line-item count are
  // kept only for genuinely sparse prompts.
  const missing = BUILDER_QUESTIONS.filter((question) => {
    if (question.id === "style") return !hasStyle
    if (question.id === "sections") return !hasSections
    if (question.id === "currency") return !hasCurrency
    return wordCount < 8
  })

  return missing.length > 0 ? missing : null
}

/**
 * Returns a scoped clarification set when a follow-up reads as ambiguous, or
 * `null` when the request is specific enough to generate from directly.
 */
function buildFollowUpQuestions(text: string): AiQuestion[] | null {
  const normalized = text.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  const hasVague = FOLLOW_UP_VAGUE_TERMS.some((term) =>
    normalized.includes(term)
  )
  const hasConcrete = FOLLOW_UP_CONCRETE_TERMS.some((term) =>
    normalized.includes(term)
  )

  // Any concrete instruction is actioned directly. Only clarify when there's no
  // concrete signal and the request is either very short or explicitly vague.
  const isUncertain = !hasConcrete && (wordCount < 5 || hasVague)
  if (!isUncertain) {
    return null
  }

  return [
    {
      id: "clarify-target",
      type: "single-select",
      prompt: "Which part should I focus on?",
      required: true,
      options: [
        { id: "header", label: "Header & branding" },
        { id: "items", label: "Line items table" },
        { id: "totals", label: "Totals, taxes & discounts" },
        { id: "footer", label: "Notes & footer" },
        { id: "whole", label: "The whole layout" },
      ],
      allowOther: true,
    },
    {
      id: "clarify-goal",
      type: "single-select",
      prompt: "What outcome are you after?",
      options: [
        { id: "cleaner", label: "Make it cleaner / simpler" },
        { id: "compact", label: "More compact" },
        { id: "detailed", label: "More detailed" },
        { id: "brand", label: "Match my brand" },
      ],
    },
    {
      id: "clarify-detail",
      type: "text",
      prompt: "Anything specific I should know?",
      placeholder: "Optional — add detail so I get it right the first time.",
    },
  ]
}

/** Cursor-style plan the assistant works through while generating a layout. */
const BUILDER_TODO_LABELS = [
  "Analyse prompt & requirements",
  "Set up medium dimensions & safe area",
  "Lay out header & branding",
  "Build the line items table",
  "Add totals, taxes & discounts",
  "Add notes & footer",
] as const

const CURRENCY_BY_ID: Record<string, { code: string; symbol: string }> = {
  usd: { code: "USD", symbol: "$" },
  eur: { code: "EUR", symbol: "€" },
  gbp: { code: "GBP", symbol: "£" },
  inr: { code: "INR", symbol: "₹" },
}

const STYLE_ACCENT: Record<BuilderVisualStyle, string> = {
  minimal: "#101828",
  modern: "#155eef",
  classic: "#475467",
  bold: "#6938ef",
}

/** Sample catalogue used to populate a believable itemised table. */
const SAMPLE_LINE_ITEMS: GeneratedLineItem[] = [
  { description: "Brand & layout design", qty: 1, rate: 1200 },
  { description: "Implementation & setup", qty: 8, rate: 95 },
  { description: "Content & copywriting", qty: 4, rate: 120 },
  { description: "Revisions & QA", qty: 3, rate: 85 },
  { description: "Support retainer (monthly)", qty: 1, rate: 300 },
]

/** Best-effort extraction of a business name from the free-text prompt. */
function deriveBusinessName(prompt: string): string {
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
  return "Your Business"
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0")
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const DOC_PREFIX: Record<BuilderDocumentType, string> = {
  "Standard invoice": "INV",
  Estimate: "EST",
  Receipt: "RCT",
  "Credit note": "CRN",
}

/**
 * Resolves the rendered layout from the prompt + clarifying answers. Stands in
 * for the generation API: deterministic, so the same inputs render the same doc.
 */
function deriveLayout(
  prompt: string,
  answers: AiAnswers | null,
  documentType: BuilderDocumentType
): GeneratedLayout {
  const styleAnswer =
    typeof answers?.style === "string" ? answers.style : "modern"
  const style: BuilderVisualStyle = (
    ["minimal", "modern", "classic", "bold"] as BuilderVisualStyle[]
  ).includes(styleAnswer as BuilderVisualStyle)
    ? (styleAnswer as BuilderVisualStyle)
    : "modern"

  const currencyId =
    typeof answers?.currency === "string" ? answers.currency : "usd"
  const currency = CURRENCY_BY_ID[currencyId] ?? CURRENCY_BY_ID.usd

  const selectedSections = Array.isArray(answers?.sections)
    ? (answers?.sections as string[])
    : null
  const sections = {
    logo: selectedSections ? selectedSections.includes("logo") : true,
    // An itemised table is the spine of the document; always present.
    items: true,
    taxes: selectedSections ? selectedSections.includes("taxes") : true,
    notes: selectedSections ? selectedSections.includes("notes") : true,
    terms: selectedSections ? selectedSections.includes("terms") : true,
    // Optional add-ons surfaced via follow-up prompts / recommendations.
    discount: false,
    onlinePayment: false,
    paymentDetails: false,
  }

  const countAnswer =
    typeof answers?.["line-items"] === "string"
      ? Number.parseInt(answers["line-items"] as string, 10)
      : 3
  const itemCount = Number.isFinite(countAnswer)
    ? Math.min(Math.max(countAnswer, 1), SAMPLE_LINE_ITEMS.length)
    : 3

  const emphasis =
    typeof answers?.focus === "string" && answers.focus.trim()
      ? answers.focus.trim()
      : null

  const now = new Date()
  const due = new Date(now)
  due.setDate(due.getDate() + 14)

  return {
    documentType,
    businessName: deriveBusinessName(prompt),
    clientName: "Acme Co.",
    emphasis,
    style,
    accent: STYLE_ACCENT[style],
    currencyCode: currency.code,
    currencySymbol: currency.symbol,
    sections,
    lineItems: SAMPLE_LINE_ITEMS.slice(0, itemCount),
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber: `${DOC_PREFIX[documentType]}-${now.getFullYear()}-${pad(
      142,
      4
    )}`,
    issueDate: formatDate(now),
    dueDate: formatDate(due),
  }
}

/** Named accent colours an edit prompt can request explicitly. */
const ACCENT_BY_COLOR: Record<string, string> = {
  purple: "#6938ef",
  violet: "#6938ef",
  indigo: "#444ce7",
  blue: "#155eef",
  green: "#039855",
  emerald: "#039855",
  red: "#d92d20",
  orange: "#e04f16",
  amber: "#dc6803",
  teal: "#0e9384",
  pink: "#dd2590",
  rose: "#e31b54",
  black: "#101828",
  gray: "#475467",
  grey: "#475467",
}

/** Currency words an edit prompt can switch to. */
const CURRENCY_BY_WORD: Record<string, string> = {
  dollar: "usd",
  dollars: "usd",
  usd: "usd",
  euro: "eur",
  euros: "eur",
  eur: "eur",
  pound: "gbp",
  pounds: "gbp",
  sterling: "gbp",
  gbp: "gbp",
  rupee: "inr",
  rupees: "inr",
  inr: "inr",
}

/** Optional sections in the order we backfill them for an unmatched "add" prompt. */
const ADDABLE_SECTIONS: (keyof GeneratedLayout["sections"])[] = [
  "logo",
  "taxes",
  "notes",
  "terms",
  "discount",
  "onlinePayment",
  "paymentDetails",
]

/**
 * Interprets a follow-up prompt as a concrete edit to the layout — the stand-in
 * for the editing API. Maps natural-language requests (and the recommendation
 * chips) to section toggles, style/accent, currency, and line-item changes so a
 * prompt visibly changes the document. Returns the same layout unchanged when
 * nothing recognisable is requested.
 */
function applyPromptEdit(
  layout: GeneratedLayout,
  rawPrompt: string
): GeneratedLayout {
  // Element-scoped prompts arrive as "Item 2: <text>"; the edit still applies.
  const text = rawPrompt.toLowerCase().replace(/^[^:]{0,40}:\s*/, "")
  if (!text.trim()) {
    return layout
  }

  const remove =
    /\b(remove|hide|delete|drop|without|no longer|take out|get rid of)\b/.test(
      text
    )
  const on = !remove

  const next: GeneratedLayout = {
    ...layout,
    sections: { ...layout.sections },
    lineItems: [...layout.lineItems],
  }
  let changed = false

  const setSection = (
    key: keyof GeneratedLayout["sections"],
    matcher: RegExp
  ) => {
    if (matcher.test(text)) {
      next.sections[key] = on
      changed = true
    }
  }

  setSection("logo", /\b(logo|brand mark|branding|brand header)\b/)
  setSection("taxes", /\b(tax|taxes|vat|gst|sales tax)\b/)
  setSection("notes", /\b(notes?|thank[\s-]?you|memo|message)\b/)
  setSection("terms", /\b(terms|conditions|policy)\b/)
  setSection("discount", /\b(discount|coupon|promo|markdown|rebate)\b/)
  setSection(
    "onlinePayment",
    /\b(pay online|pay now|online payment|payment button|pay link|payment link|checkout button)\b/
  )
  setSection(
    "paymentDetails",
    /\b(bank|payment details|account number|wire|iban|swift|remittance|ach)\b/
  )

  // Visual style + accent.
  const styleWord = (
    ["minimal", "modern", "classic", "bold"] as BuilderVisualStyle[]
  ).find((style) => new RegExp(`\\b${style}\\b`).test(text))
  if (styleWord) {
    next.style = styleWord
    next.accent = STYLE_ACCENT[styleWord]
    changed = true
  }
  for (const [name, hex] of Object.entries(ACCENT_BY_COLOR)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      next.accent = hex
      changed = true
      break
    }
  }

  // Line items.
  const mentionsItem = /\b(item|line item|row|service|product)s?\b/.test(text)
  if (mentionsItem && !remove && /\b(add|insert|another|extra|more)\b/.test(text)) {
    const pick = SAMPLE_LINE_ITEMS[next.lineItems.length % SAMPLE_LINE_ITEMS.length]
    next.lineItems = [...next.lineItems, { ...pick }]
    changed = true
  } else if (mentionsItem && remove && next.lineItems.length > 1) {
    next.lineItems = next.lineItems.slice(0, -1)
    changed = true
  }

  // Currency.
  for (const [word, id] of Object.entries(CURRENCY_BY_WORD)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      const currency = CURRENCY_BY_ID[id]
      next.currencyCode = currency.code
      next.currencySymbol = currency.symbol
      changed = true
      break
    }
  }

  // Fallback: an additive prompt we couldn't map exactly still produces a
  // visible change by enabling the next missing optional section.
  if (!changed && /\b(add|include|insert|create|put|show|with)\b/.test(text)) {
    const missing = ADDABLE_SECTIONS.find((key) => !next.sections[key])
    if (missing) {
      next.sections[missing] = true
      changed = true
    }
  }

  return changed ? next : layout
}

/**
 * Composes the rendered layout from the conversation: the first prompt sets the
 * base, then up to `maxFollowUps` settled follow-up prompts fold in as edits,
 * and manual visual edits win last. A pure function of the transcript so the
 * same conversation always renders the same document.
 */
function composeLayout(
  userPrompts: string[],
  maxFollowUps: number,
  answers: AiAnswers | null,
  documentType: BuilderDocumentType,
  layoutEdits: Partial<GeneratedLayout>
): GeneratedLayout {
  let composed = deriveLayout(userPrompts[0] ?? "", answers, documentType)
  for (let i = 1; i < userPrompts.length && i <= maxFollowUps; i++) {
    composed = applyPromptEdit(composed, userPrompts[i])
  }
  return { ...composed, ...layoutEdits }
}

/**
 * Believable placeholder businesses for a restored document. The layout's own
 * name (e.g. "Signature Wren", "Layout 2") is a template label, not a brand, so
 * the reconstructed invoice uses a real-sounding business instead.
 */
const EDIT_BUSINESSES = [
  "Northwind Studio",
  "Atlas & Co.",
  "Maple Lane Design",
  "Harbor Creative",
  "Brightwork Agency",
  "Cedar & Sage",
  "Lumen Studio",
  "Foundry Collective",
  "Meridian Consulting",
  "Olive & Ash",
  "Riverstone Partners",
  "Wildflower Co.",
  "Summit Works",
  "Paper Crane Studio",
  "Indigo House",
  "Ironwood Labs",
] as const

const EDIT_OPENERS = [
  "I need",
  "Can you put together",
  "Build me",
  "Help me set up",
  "I'd like",
] as const

const EDIT_STYLE_PHRASE: Record<BuilderVisualStyle, string> = {
  minimal: "Keep it clean and minimal",
  modern: "Give it a modern look with a subtle accent colour",
  classic: "Make it classic and formal",
  bold: "Make it bold with a strong branded header",
}

function indefiniteArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "an" : "a"
}

/**
 * Reconstructs a believable creation session for an existing layout opened via
 * the dashboard "Edit" action. The layout's numeric `seed` deterministically
 * resolves the business, style, currency, sections, item count, and timings, so
 * a given layout always reopens to the same design and the same transcript.
 * Returns the natural-language prompt, a clean reasoning "gist", the clarifying
 * answers (which feed `deriveLayout` exactly like a fresh generation), and the
 * resolved business name — keeping the restored session 100% real.
 */
function deriveEditSession(editSeed: LayoutBuilderEditSeed): {
  prompt: string
  gist: string
  businessName: string
  answers: AiAnswers
  preDurationSec: number
  durationSec: number
} {
  const styles: BuilderVisualStyle[] = ["minimal", "modern", "classic", "bold"]
  const currencies = ["usd", "eur", "gbp", "inr"]
  const seed = Math.max(0, editSeed.seed)

  const style = styles[seed % styles.length]
  const currency = currencies[Math.floor(seed / 4) % currencies.length]
  const business = EDIT_BUSINESSES[seed % EDIT_BUSINESSES.length]

  // Header, table, and totals are always present; notes/terms vary so reopened
  // layouts read as distinct documents rather than one template.
  const sections = ["logo", "items", "taxes"]
  if (seed % 2 === 0) sections.push("notes")
  if (seed % 3 === 0) sections.push("terms")

  const itemCount = (seed % 5) + 1
  const docLabel = editSeed.documentType.toLowerCase()
  const article = indefiniteArticle(docLabel)

  // Natural-language request, assembled from the resolved design so the prompt,
  // the document, and the assistant's recap all agree.
  const clauses = ["our logo and business details in the header"]
  clauses.push("an itemised table for the work")
  clauses.push("subtotal and tax totals")
  if (sections.includes("notes")) clauses.push("a short thank-you note")
  if (sections.includes("terms")) clauses.push("payment terms at the bottom")

  const detail =
    clauses.length === 1
      ? clauses[0]
      : `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`

  const opener = EDIT_OPENERS[seed % EDIT_OPENERS.length]
  const prompt = `${opener} ${article} ${docLabel} for ${business}. ${EDIT_STYLE_PHRASE[style]}. Include ${detail}.`

  return {
    prompt,
    gist: `${article} ${docLabel} for ${business}`,
    businessName: business,
    answers: {
      style,
      currency,
      sections,
      "line-items": String(itemCount),
    },
    preDurationSec: 2 + (seed % 4),
    durationSec: 6 + (seed % 7),
  }
}

/** Mirrors the "Other" sentinel used by the questions card. */
const OTHER_ANSWER_VALUE = "__other__"

/** Resolves an answer value to its display label (option label or raw text). */
function answerLabel(question: AiQuestion, value: string): string {
  if (value === OTHER_ANSWER_VALUE) {
    return "Other"
  }
  if ("options" in question && Array.isArray(question.options)) {
    const option = question.options.find(
      (candidate) => typeof candidate !== "string" && candidate.id === value
    )
    if (option && typeof option !== "string") {
      return option.label
    }
  }
  return value
}

/**
 * Flattens the user's clarifying answers into prompt + display-value pairs for
 * the "Received answers" recap.
 */
function formatReceivedAnswers(
  questions: AiQuestion[],
  answers: AiAnswers
): BuilderReceivedAnswer[] {
  const result: BuilderReceivedAnswer[] = []
  for (const question of questions) {
    const value = answers[question.id]
    let values: string[] = []
    if (Array.isArray(value)) {
      values = value.map((entry) => answerLabel(question, entry))
    } else if (typeof value === "string" && value.trim()) {
      values = [answerLabel(question, value)]
    }
    if (values.length > 0) {
      result.push({ prompt: question.prompt, values })
    }
  }
  return result
}

type LayoutBuilderContextValue = {
  name: string
  draftName: string
  isEditingName: boolean
  setDraftName: (value: string) => void
  startNameEdit: () => void
  commitName: () => void
  cancelNameEdit: () => void

  mediumId: string | null
  modelId: string | null
  documentType: BuilderDocumentType
  setDocumentType: (value: BuilderDocumentType) => void

  /**
   * Code editor and live preview are independent toggles. Both can be open at
   * once (split view); toggling one never changes the other. At least one panel
   * is always visible, so turning off the last open panel is a no-op.
   */
  codeOpen: boolean
  previewOpen: boolean
  toggleCode: () => void
  togglePreview: () => void

  /**
   * Raw-code ("eject") mode. When `codeOverride` is non-null the code editor is
   * detached from the structured model: edits are kept verbatim and the preview
   * renders the raw HTML instead of the generated document. Visual edits and the
   * structured fields are paused until the user reverts. `null` = attached, the
   * code view is a live projection of `generatedLayout` + `layerText`.
   */
  codeOverride: string | null
  isCodeDetached: boolean
  /** Detaches into raw-code mode, seeding the buffer with the current code. */
  detachCode: (code: string) => void
  /** Updates the raw-code buffer while editing (no-op when attached). */
  updateCodeOverride: (code: string) => void
  /** Re-attaches to the structured model, discarding raw-code edits. */
  reattachCode: () => void

  /**
   * Invoice AI side panel state. Shared so the toolbar's left action cluster can
   * track the panel's width and open/closed state, keeping the two regions
   * aligned when the panel is resized or collapsed.
   */
  panelOpen: boolean
  setPanelOpen: Dispatch<SetStateAction<boolean>>
  panelWidth: number
  setPanelWidth: Dispatch<SetStateAction<number>>
  panelMinWidth: number
  panelMaxWidth: number

  /**
   * Visual edit mode (Cursor-style). When on, the rendered invoice becomes
   * directly editable in the preview; edits are merged onto the generated layout
   * via `updateLayout`.
   */
  editMode: boolean
  toggleEditMode: () => void
  updateLayout: (patch: Partial<GeneratedLayout>) => void

  /**
   * Elements selected in visual-edit mode and attached to the next prompt as
   * context chips (Cursor-style). Adding an existing label is a no-op.
   */
  selections: BuilderSelection[]
  addSelection: (label: string) => void
  removeSelection: (id: string) => void
  clearSelections: () => void

  /**
   * Free-text overrides for layers that aren't backed by a structured layout
   * field (addresses, section labels, notes/terms copy…), keyed by layer label.
   * Lets every layer be edited in visual-edit mode without bloating
   * `GeneratedLayout`.
   */
  layerText: Record<string, string>
  setLayerText: (label: string, value: string) => void

  /** Per-layer style overrides set from the Visual edits inspector. */
  layerStyles: Record<string, BuilderLayerStyle>
  setLayerStyle: (label: string, patch: Partial<BuilderLayerStyle>) => void

  /** True when the layer has been deleted (hidden) via its selector control. */
  isLayerHidden: (label: string) => boolean
  /** Number of inline copies a layer currently has from the duplicate control. */
  layerDuplicateCount: (label: string) => number
  /** Adds an inline copy of the layer. */
  duplicateLayer: (label: string) => void
  /** Opens the delete confirmation for a layer (hide on confirm). */
  requestDeleteLayer: (label: string) => void

  /**
   * The layer whose Visual edits inspector is open (replaces the chat). Null
   * shows the normal AI conversation.
   */
  inspectingLayer: string | null
  inspectLayer: (label: string | null, kind?: BuilderLayerKind) => void

  /**
   * Whether the inspected layer is an individual text layer or a
   * section/container. Drives text-only controls (e.g. the Style tab's
   * "Content" field, which only applies to editable text). Null when nothing is
   * inspected.
   */
  inspectingLayerKind: BuilderLayerKind | null

  /** Which Edits sub-tab the inspector shows. */
  editsTab: "style" | "advanced"
  setEditsTab: (tab: "style" | "advanced") => void

  /** Selects a layer for inspection — opens its Visual edits panel + chip. */
  selectLayer: (label: string, kind?: BuilderLayerKind) => void

  /** Seeds a layer's content/style overrides from the DOM on first inspect. */
  seedLayer: (
    label: string,
    seed: { content: string; style: BuilderLayerStyle }
  ) => void

  /**
   * Advanced-tab rules (conditional show/hide, repeat, wrap) per layer. Applied
   * rules persist so reopening a card shows its saved configuration.
   */
  layerRules: Record<string, BuilderLayerRules>
  setLayerRule: (
    label: string,
    kind: BuilderRuleKind,
    rule: BuilderConditionRule
  ) => void
  clearLayerRule: (label: string, kind: BuilderRuleKind) => void

  /**
   * Add-elements palette open in the panel (replaces the chat), opened from the
   * toolbar's plus button. Mutually exclusive with the Visual edits inspector.
   */
  addingElement: boolean
  openAddElements: () => void
  closeAddElements: () => void

  /** Placeholder entities dropped onto the invoice from the Add elements palette. */
  placedElements: PlacedElement[]
  addPlacedElement: (input: {
    kind: string
    label: string
    zone: PlacedElementZone
    /** Insert position in the placed-element order (blank page). Appends if omitted. */
    index?: number
  }) => void
  updatePlacedElementContent: (id: string, content: string) => void
  removePlacedElement: (id: string) => void
  /** Inserts a copy of a placed element directly after the original. */
  duplicatePlacedElement: (id: string) => void

  /**
   * "Start from blank" session: the builder opened on its empty state with no
   * seed prompt. Drives the AI panel welcome state and the canvas empty state
   * (Figma 3268:37410). Cleared the moment the user sends a prompt or places an
   * element, after which the normal generate/edit flow takes over.
   */
  isBlankSession: boolean
  /** Bumped to pull focus into the blank-state prompt input (e.g. canvas CTA). */
  promptFocusToken: number
  /** Requests focus on the blank-state prompt input. */
  focusPrompt: () => void

  messages: BuilderMessage[]
  status: BuilderStatus
  /** Human-readable failure reason shown while `status === "error"`. */
  errorMessage: string | null
  /** Re-runs the last failed turn (clears the error and tries again). */
  retryGeneration: () => void
  /** Dismisses the error and returns the builder to its prior resting state. */
  dismissError: () => void
  /**
   * True once the builder has produced a layout at least once. Follow-up prompts
   * keep this set so the canvas can keep the existing layout on screen instead of
   * replacing it with the full-screen generating animation.
   */
  hasGeneratedOnce: boolean
  /** Duration of the pre-question reasoning pass. */
  preThoughtDurationSec: number | null
  /** Collapsed recap text from before clarifying questions. */
  preReasoning: string | null
  /** Duration of the post-answer generation pass. */
  thoughtDurationSec: number | null
  todos: AiTodoItem[]
  /** Clarifying questions shown while `status === "asking"`. */
  questions: AiQuestion[]
  /** Answers captured for the active turn (null when none were asked). */
  receivedAnswers: BuilderReceivedAnswer[] | null
  /** Resolved layout to render once `status === "ready"`. */
  generatedLayout: GeneratedLayout
  sendMessage: (text: string, references?: BuilderReferenceImage[]) => void
  /**
   * Sends a prompt-box ("Describe your edit") request scoped to a layer/section.
   * The named container shows the working glow for the turn instead of the whole
   * canvas, so an AI change reads as local to what the user selected.
   */
  sendScopedEdit: (label: string, text: string) => void
  /** True while the AI is acting on `label` from a scoped prompt-box edit. */
  isLayerEditing: (label: string) => boolean
  /** Layer/section a scoped prompt-box edit is currently targeting (else null). */
  aiEditingLayer: string | null
  /** Records the answers and kicks off generation. */
  submitAnswers: (answers: AiAnswers) => void
  /** Skips the clarifying questions and kicks off generation. */
  skipQuestions: () => void
  /** Halts the in-progress generation and settles the session. */
  stopGeneration: () => void

  /** Undo / redo for layout edits, layer overrides, placed elements, and code. */
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void

  /**
   * Per-turn version controls (the eye / undo on each assistant answer). Each
   * settled turn freezes a document snapshot; `previewVersion` renders it on the
   * canvas read-only, `restoreVersion` rolls the live document back to it.
   */
  previewVersionId: string | null
  previewVersion: (messageId: string) => void
  exitVersionPreview: () => void
  restoreVersion: (messageId: string) => void
  hasVersionSnapshot: (messageId: string) => boolean

  /** Transient confirmation toast above the composer; null when hidden. */
  feedbackToast: string | null
  /** Shows a toast above the composer for a few seconds (answer feedback, etc.). */
  showFeedbackToast: (message: string) => void

  /**
   * True once the session has edits that haven't been persisted — drives the
   * "Unsaved changes?" guard when leaving the builder. Set by any document
   * mutation, a generation, or a rename; cleared by Save / Publish.
   */
  hasUnsavedChanges: boolean
  /** Clears the unsaved-changes flag after a successful Save / Publish. */
  markSaved: () => void
}

const LayoutBuilderContext = createContext<LayoutBuilderContextValue | null>(null)

let messageCounter = 0
function nextMessageId() {
  messageCounter += 1
  return `builder-msg-${Date.now()}-${messageCounter}`
}

export function LayoutBuilderProvider({ children }: { children: ReactNode }) {
  const { consumePendingGeneration, consumePendingEdit, consumePendingBlank } =
    useCreateWithAi()

  const [name, setName] = useState(DEFAULT_LAYOUT_NAME)
  const [draftName, setDraftName] = useState(DEFAULT_LAYOUT_NAME)
  const [isEditingName, setIsEditingName] = useState(false)

  const [mediumId, setMediumId] = useState<string | null>(null)
  const [modelId, setModelId] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<BuilderDocumentType>(
    BUILDER_DOCUMENT_TYPES[0]
  )
  const [codeOpen, setCodeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [codeOverride, setCodeOverrideState] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const [editMode, setEditMode] = useState(false)
  const [layoutEdits, setLayoutEdits] = useState<Partial<GeneratedLayout>>({})
  const [selections, setSelections] = useState<BuilderSelection[]>([])
  const [layerText, setLayerTextState] = useState<Record<string, string>>({})
  const [layerStyles, setLayerStyles] = useState<
    Record<string, BuilderLayerStyle>
  >({})
  const [hiddenLayers, setHiddenLayers] = useState<string[]>([])
  const [layerDuplicates, setLayerDuplicates] = useState<
    Record<string, number>
  >({})
  // Advanced-tab conditional-logic / repeat / wrap rules, keyed by layer label
  // then by card, so applied rules survive collapsing the card or switching
  // layers and back.
  const [layerRules, setLayerRules] = useState<
    Record<string, BuilderLayerRules>
  >({})
  const [inspectingLayer, setInspectingLayer] = useState<string | null>(null)
  const [inspectingLayerKind, setInspectingLayerKind] =
    useState<BuilderLayerKind | null>(null)
  const [pendingDeleteLayer, setPendingDeleteLayer] = useState<string | null>(
    null
  )
  const [editsTab, setEditsTab] = useState<"style" | "advanced">("style")
  const [addingElement, setAddingElement] = useState(false)
  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([])

  // Per-turn document snapshots (message id → frozen state) and the turn the
  // user is currently previewing on the canvas (null = live/current version).
  const versionSnapshotsRef = useRef<Record<string, VersionSnapshot>>({})
  // Bumped whenever the snapshot map changes (capture or restore) so the persist
  // effect re-runs and consumers re-evaluate `hasVersionSnapshot`.
  const [snapshotVersion, setSnapshotVersion] = useState(0)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)

  // Transient confirmation toast shown just above the composer (e.g. after
  // submitting answer feedback). Auto-clears.
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const feedbackToastTimerRef = useRef<number | null>(null)

  const placedElementCounterRef = useRef(0)
  const historyPastRef = useRef<BuilderHistorySnapshot[]>([])
  const historyFutureRef = useRef<BuilderHistorySnapshot[]>([])
  const applyingHistoryRef = useRef(false)
  const codeEditSessionRef = useRef(false)
  const codeEditDebounceRef = useRef<number | null>(null)
  const documentStateRef = useRef<BuilderHistorySnapshot>({
    layoutEdits: {},
    layerText: {},
    layerStyles: {},
    hiddenLayers: [],
    layerDuplicates: {},
    placedElements: [],
    codeOverride: null,
  })
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [messages, setMessages] = useState<BuilderMessage[]>([])
  const [status, setStatus] = useState<BuilderStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isBlankSession, setIsBlankSession] = useState(false)
  const [promptFocusToken, setPromptFocusToken] = useState(0)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false)
  const [questions, setQuestions] = useState<AiQuestion[]>(BUILDER_QUESTIONS)
  const [answers, setAnswers] = useState<AiAnswers | null>(null)
  const [receivedAnswers, setReceivedAnswers] = useState<
    BuilderReceivedAnswer[] | null
  >(null)
  const [preThoughtDurationSec, setPreThoughtDurationSec] = useState<
    number | null
  >(null)
  const [preReasoning, setPreReasoning] = useState<string | null>(null)
  const [thoughtDurationSec, setThoughtDurationSec] = useState<number | null>(
    null
  )
  const [completedTodoCount, setCompletedTodoCount] = useState(0)

  const thinkingStartedAtRef = useRef<number | null>(null)
  const reasoningStartedAtRef = useRef<number | null>(null)
  const pendingQuestionsRef = useRef<AiQuestion[] | null>(null)
  const referenceUrlsRef = useRef<string[]>([])
  const initializedRef = useRef(false)

  useEffect(() => {
    documentStateRef.current = {
      layoutEdits,
      layerText,
      layerStyles,
      hiddenLayers,
      layerDuplicates,
      placedElements,
      codeOverride,
    }
  }, [
    layoutEdits,
    layerText,
    layerStyles,
    hiddenLayers,
    layerDuplicates,
    placedElements,
    codeOverride,
  ])

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyPastRef.current.length > 0)
    setCanRedo(historyFutureRef.current.length > 0)
  }, [])

  const clearHistory = useCallback(() => {
    historyPastRef.current = []
    historyFutureRef.current = []
    codeEditSessionRef.current = false
    if (codeEditDebounceRef.current) {
      window.clearTimeout(codeEditDebounceRef.current)
      codeEditDebounceRef.current = null
    }
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const applyHistorySnapshot = useCallback(
    (snapshot: BuilderHistorySnapshot) => {
      applyingHistoryRef.current = true
      setLayoutEdits(snapshot.layoutEdits)
      setLayerTextState(snapshot.layerText)
      setLayerStyles(snapshot.layerStyles)
      setHiddenLayers(snapshot.hiddenLayers)
      setLayerDuplicates(snapshot.layerDuplicates)
      setPlacedElements(snapshot.placedElements)
      setCodeOverrideState(snapshot.codeOverride)
      applyingHistoryRef.current = false
    },
    []
  )

  const pushHistory = useCallback(() => {
    if (applyingHistoryRef.current) {
      return
    }

    // Any edit that records history is an unsaved change.
    setHasUnsavedChanges(true)

    historyPastRef.current.push(
      cloneHistorySnapshot(documentStateRef.current)
    )
    if (historyPastRef.current.length > HISTORY_LIMIT) {
      historyPastRef.current.shift()
    }
    historyFutureRef.current = []
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const undo = useCallback(() => {
    const previous = historyPastRef.current.pop()
    if (!previous) {
      return
    }

    historyFutureRef.current.push(
      cloneHistorySnapshot(documentStateRef.current)
    )
    applyHistorySnapshot(previous)
    syncHistoryFlags()
  }, [applyHistorySnapshot, syncHistoryFlags])

  const redo = useCallback(() => {
    const next = historyFutureRef.current.pop()
    if (!next) {
      return
    }

    historyPastRef.current.push(
      cloneHistorySnapshot(documentStateRef.current)
    )
    applyHistorySnapshot(next)
    syncHistoryFlags()
  }, [applyHistorySnapshot, syncHistoryFlags])

  // New generation invalidates edit history — the prior layout is no longer the base.
  useEffect(() => {
    if (status === "reasoning" || status === "thinking") {
      clearHistory()
      // A generation produces an unsaved result. Restored (saved) layouts open
      // straight into "ready" and never pass through these phases, so they stay
      // clean until the user edits.
      setHasUnsavedChanges(true)
    }
  }, [status, clearHistory])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (status !== "ready") {
        return
      }

      const mod = event.metaKey || event.ctrlKey
      if (!mod) {
        return
      }

      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (key === "z" && event.shiftKey) {
        event.preventDefault()
        redo()
      } else if (key === "y") {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [status, undo, redo])

  const startThinking = useCallback(() => {
    thinkingStartedAtRef.current = Date.now()
    setThoughtDurationSec(null)
    setStatus("thinking")
  }, [])

  // Kicks off the brief reasoning pass. `pending` holds the questions to ask
  // afterwards (or null to go straight to generation once reasoning settles).
  const startReasoning = useCallback((pending: AiQuestion[] | null) => {
    pendingQuestionsRef.current = pending && pending.length > 0 ? pending : null
    reasoningStartedAtRef.current = Date.now()
    setPreThoughtDurationSec(null)
    setPreReasoning(null)
    setThoughtDurationSec(null)
    setStatus("reasoning")
  }, [])

  // After a couple of seconds of "thinking", either surface clarifying
  // questions or move straight into generation.
  useEffect(() => {
    if (status !== "reasoning") {
      return
    }

    const timer = window.setTimeout(() => {
      const startedAt = reasoningStartedAtRef.current ?? Date.now()
      const durationSec = Math.max(
        1,
        Math.round((Date.now() - startedAt) / 1000)
      )

      const lastUser = [...messages]
        .reverse()
        .find((message) => message.role === "user")
      const prompt = lastUser?.text ?? ""

      const pending = pendingQuestionsRef.current
      if (pending) {
        setPreThoughtDurationSec(durationSec)
        setPreReasoning(buildReasoning(prompt))
        setQuestions(pending)
        setStatus("asking")
      } else {
        startThinking()
      }
    }, REASONING_MS)

    return () => window.clearTimeout(timer)
  }, [status, startThinking, messages])

  // Drives the simulated generation latency. Owning the timer in an effect keyed
  // on `status` keeps it resilient to Strict Mode's mount/cleanup/mount cycle.
  useEffect(() => {
    if (status !== "thinking") {
      return
    }

    const timer = window.setTimeout(() => {
      const startedAt = thinkingStartedAtRef.current ?? Date.now()
      const elapsedSec = Math.max(
        1,
        Math.round((Date.now() - startedAt) / 1000)
      )
      setThoughtDurationSec(elapsedSec)
      setStatus("ready")
    }, SIMULATED_THINKING_MS)

    return () => window.clearTimeout(timer)
  }, [status])

  // Tick the plan forward while generating; complete it once ready.
  useEffect(() => {
    if (status === "ready") {
      setCompletedTodoCount(BUILDER_TODO_LABELS.length)
      return
    }

    // No plan while idle or gathering answers.
    if (status !== "thinking") {
      return
    }

    setCompletedTodoCount(0)
    const interval = window.setInterval(() => {
      setCompletedTodoCount((current) =>
        current < BUILDER_TODO_LABELS.length - 1 ? current + 1 : current
      )
    }, SIMULATED_THINKING_MS / (BUILDER_TODO_LABELS.length + 1))

    return () => window.clearInterval(interval)
  }, [status])

  // Seed the session from the prompt the user submitted on the list page.
  useEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    // Rehydrates the working session saved before a refresh / reload. Returns
    // true when a session was restored. Settles the status from the persisted
    // content so a reload never lands on the endless first-generation animation:
    // a finished layout reopens "ready", an in-flight first build resumes, and a
    // blank session reopens its empty state.
    const restoreSession = (): boolean => {
      if (typeof window === "undefined") {
        return false
      }
      let raw: string | null = null
      try {
        raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
      } catch {
        return false
      }
      if (!raw) {
        return false
      }

      let saved: PersistedBuilderSession
      try {
        const parsed = JSON.parse(raw) as PersistedBuilderSession
        if (!parsed || parsed.v !== 1) {
          return false
        }
        saved = parsed
      } catch {
        return false
      }

      setName(saved.name)
      setDraftName(saved.name)
      setMediumId(saved.mediumId)
      setModelId(saved.modelId)
      setDocumentType(saved.documentType)
      setIsBlankSession(saved.isBlankSession)
      setMessages(saved.messages ?? [])
      setAnswers(saved.answers ?? null)
      setReceivedAnswers(saved.receivedAnswers ?? null)
      setPreReasoning(saved.preReasoning ?? null)
      setPreThoughtDurationSec(saved.preThoughtDurationSec ?? null)
      setThoughtDurationSec(saved.thoughtDurationSec ?? null)
      setLayoutEdits(saved.layoutEdits ?? {})
      setLayerTextState(saved.layerText ?? {})
      setLayerStyles(saved.layerStyles ?? {})
      setHiddenLayers(saved.hiddenLayers ?? [])
      setLayerDuplicates(saved.layerDuplicates ?? {})
      setPlacedElements(saved.placedElements ?? [])
      setCodeOverrideState(saved.codeOverride ?? null)
      setHasUnsavedChanges(saved.hasUnsavedChanges ?? false)
      // Restore per-turn snapshots so the eye/undo controls on earlier turns
      // keep working after a reload (they live in a ref, lost on refresh).
      versionSnapshotsRef.current = saved.versionSnapshots ?? {}
      setSnapshotVersion((value) => value + 1)

      if (saved.hasGeneratedOnce) {
        setHasGeneratedOnce(true)
        setStatus("ready")
      } else if (
        !saved.isBlankSession &&
        (saved.messages ?? []).some((message) => message.role === "user")
      ) {
        // A first build was interrupted mid-flight — resume it to completion so
        // the user lands on a finished layout rather than a dead empty canvas.
        startReasoning(null)
      } else {
        setStatus("idle")
      }

      return true
    }

    // "Start from blank": open on the empty state (Figma 3268:37410). No seed
    // prompt, no generation — the canvas shows the empty state and the panel
    // shows the AI welcome until the user describes a layout or inserts an
    // element. A default medium keeps the toolbar's size picker populated.
    if (consumePendingBlank()) {
      setIsBlankSession(true)
      setMediumId(getDefaultBuilderMediumId())
      return
    }

    // "Edit" on an existing layout: restore it into a real, editable session.
    // We reconstruct the original prompt + answers deterministically, seed the
    // transcript, and land directly in the ready state (no generation
    // animation). The ready-effect appends the matching assistant recap, so the
    // chat reads like the conversation that produced this layout.
    const editSeed = consumePendingEdit()
    if (editSeed) {
      const session = deriveEditSession(editSeed)
      setName(editSeed.name)
      setDraftName(editSeed.name)
      setMediumId(editSeed.mediumId)
      setDocumentType(editSeed.documentType)
      setAnswers(session.answers)
      // The resolved business name is what shows on the document.
      setLayoutEdits({ businessName: session.businessName })
      setThoughtDurationSec(session.durationSec)

      // Rebuild the original turn so the transcript reads exactly like the
      // session that produced this layout: prompt → clarifying answers →
      // reasoning → completed plan → recap. Seeding both messages means the
      // ready-effect leaves the history untouched (no duplicate turn).
      const restoredLayout: GeneratedLayout = {
        ...deriveLayout(session.prompt, session.answers, editSeed.documentType),
        businessName: session.businessName,
      }
      const receivedEditAnswers = formatReceivedAnswers(
        BUILDER_QUESTIONS,
        session.answers
      )
      const completedTodos: AiTodoItem[] = BUILDER_TODO_LABELS.map(
        (label, index) => ({
          id: `builder-todo-${index}`,
          label,
          status: "done",
        })
      )

      setMessages([
        {
          id: nextMessageId(),
          role: "user",
          text: session.prompt,
          references: [],
        },
        {
          id: nextMessageId(),
          role: "assistant",
          receivedAnswers: receivedEditAnswers,
          preReasoning: buildReasoning(session.gist),
          preDurationSec: session.preDurationSec,
          reasoning: buildPostReasoning(session.gist, receivedEditAnswers),
          durationSec: session.durationSec,
          todos: completedTodos,
          summary: buildCompletionSummary(restoredLayout),
          recommendations: buildRecommendations(restoredLayout),
        },
      ])
      setHasGeneratedOnce(true)
      setStatus("ready")
      return
    }

    const seed = consumePendingGeneration()
    if (!seed) {
      // No fresh navigation seed → this is a refresh / direct load. Bring the
      // user back to their recent session; if there's nothing saved, open the
      // blank empty state instead of the first-generation animation.
      if (!restoreSession()) {
        setIsBlankSession(true)
        setMediumId(getDefaultBuilderMediumId())
      }
      return
    }

    setMediumId(seed.mediumId)
    setModelId(seed.modelId)
    referenceUrlsRef.current = seed.references.map((ref) => ref.previewUrl)

    const text =
      seed.prompt ||
      `Generate a layout from ${seed.references.length} reference image${
        seed.references.length === 1 ? "" : "s"
      }.`

    setMessages([
      {
        id: nextMessageId(),
        role: "user",
        text,
        references: seed.references,
      },
    ])

    // Think first, then clarify only the gaps the prompt left open — a detailed
    // brief (or a reference image) goes straight to generation.
    startReasoning(buildInitialQuestions(seed.prompt, seed.references.length > 0))
  }, [
    consumePendingGeneration,
    consumePendingEdit,
    consumePendingBlank,
    startReasoning,
  ])

  // Persist the working session so a refresh restores it. Only writes once the
  // session has real content, which also prevents the initial (pre-hydration)
  // render from clobbering a saved session with empty defaults. Status is not
  // persisted — it's re-derived on restore — and transcript references (blob
  // URLs) are dropped since they can't survive a reload.
  useEffect(() => {
    if (!initializedRef.current || typeof window === "undefined") {
      return
    }
    const hasContent =
      hasGeneratedOnce ||
      isBlankSession ||
      placedElements.length > 0 ||
      messages.length > 0
    if (!hasContent) {
      return
    }
    const snapshot: PersistedBuilderSession = {
      v: 1,
      name,
      mediumId,
      modelId,
      documentType,
      isBlankSession,
      hasGeneratedOnce,
      hasUnsavedChanges,
      messages: messages.map((message) => ({ ...message, references: [] })),
      answers,
      receivedAnswers,
      preReasoning,
      preThoughtDurationSec,
      thoughtDurationSec,
      layoutEdits,
      layerText,
      layerStyles,
      hiddenLayers,
      layerDuplicates,
      placedElements,
      codeOverride,
      versionSnapshots: versionSnapshotsRef.current,
    }
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(snapshot)
      )
    } catch {
      // Storage full / unavailable — persistence is best-effort.
    }
  }, [
    name,
    mediumId,
    modelId,
    documentType,
    isBlankSession,
    hasGeneratedOnce,
    hasUnsavedChanges,
    messages,
    answers,
    receivedAnswers,
    preReasoning,
    preThoughtDurationSec,
    thoughtDurationSec,
    layoutEdits,
    layerText,
    layerStyles,
    hiddenLayers,
    layerDuplicates,
    placedElements,
    codeOverride,
    snapshotVersion,
  ])

  const focusPrompt = useCallback(() => {
    // Bring the AI composer forward: open the panel and dismiss whatever else is
    // occupying it (Add elements palette / Visual edits inspector), mirroring how
    // `openAddElements` surfaces the palette. Then focus the prompt input.
    setPanelOpen(true)
    setAddingElement(false)
    setInspectingLayer(null)
    setPromptFocusToken((token) => token + 1)
  }, [])

  useEffect(() => {
    const urls = referenceUrlsRef
    return () => {
      for (const url of urls.current) {
        if (url) {
          URL.revokeObjectURL(url)
        }
      }
    }
  }, [])

  // Toggle a panel, but never let both close — keep the last panel visible.
  const toggleCode = useCallback(() => {
    setCodeOpen((open) => (open ? !previewOpen : true))
  }, [previewOpen])

  const togglePreview = useCallback(() => {
    setPreviewOpen((open) => (open ? !codeOpen : true))
  }, [codeOpen])

  // Visual edit requires the preview, so enabling it ensures the preview is open.
  // Leaving edit mode also closes any open inspector. Visual edits operate on the
  // structured model, so they're unavailable while detached into raw-code mode.
  const toggleEditMode = useCallback(() => {
    if (codeOverride !== null) {
      return
    }
    setEditMode((on) => {
      const next = !on
      if (next) {
        setPreviewOpen(true)
        // Entering edit mode supersedes the Add elements palette, so close it
        // and fall through to the edit empty state.
        setAddingElement(false)
      } else {
        setInspectingLayer(null)
      }
      return next
    })
  }, [codeOverride])

  // Detaching snapshots the current generated code as the editable buffer and
  // tears down structured-edit affordances so the two models can't silently
  // diverge while the user edits raw code.
  const detachCode = useCallback((code: string) => {
    pushHistory()
    setCodeOverrideState(code)
    setEditMode(false)
    setInspectingLayer(null)
    setAddingElement(false)
    setSelections([])
    setCodeOpen(true)
  }, [pushHistory])

  const updateCodeOverride = useCallback((code: string) => {
    if (!applyingHistoryRef.current) {
      if (!codeEditSessionRef.current) {
        pushHistory()
        codeEditSessionRef.current = true
      }

      if (codeEditDebounceRef.current) {
        window.clearTimeout(codeEditDebounceRef.current)
      }
      codeEditDebounceRef.current = window.setTimeout(() => {
        codeEditSessionRef.current = false
        codeEditDebounceRef.current = null
      }, CODE_HISTORY_DEBOUNCE_MS)
    }

    setCodeOverrideState((current) => (current === null ? current : code))
  }, [pushHistory])

  const reattachCode = useCallback(() => {
    pushHistory()
    setCodeOverrideState(null)
  }, [pushHistory])

  const updateLayout = useCallback((patch: Partial<GeneratedLayout>) => {
    pushHistory()
    setLayoutEdits((current) => ({ ...current, ...patch }))
  }, [pushHistory])

  // Single-selection: picking a layer replaces any existing chip so only one
  // element is ever attached to the composer at a time.
  const addSelection = useCallback((label: string) => {
    setSelections((current) => {
      if (current.length === 1 && current[0].label === label) {
        return current
      }
      return [{ id: nextMessageId(), label }]
    })
  }, [])

  const removeSelection = useCallback((id: string) => {
    setSelections((current) => {
      const removed = current.find((selection) => selection.id === id)
      if (removed) {
        // Closing the chip for the inspected layer also closes its inspector.
        setInspectingLayer((open) => (open === removed.label ? null : open))
      }
      return current.filter((selection) => selection.id !== id)
    })
  }, [])

  const clearSelections = useCallback(() => {
    setSelections([])
    setInspectingLayer(null)
  }, [])

  const setLayerText = useCallback(
    (label: string, value: string) => {
      pushHistory()
      setLayerTextState((current) => ({ ...current, [label]: value }))
    },
    [pushHistory]
  )

  const setLayerStyle = useCallback(
    (label: string, patch: Partial<BuilderLayerStyle>) => {
      pushHistory()
      setLayerStyles((current) => ({
        ...current,
        [label]: { ...current[label], ...patch },
      }))
    },
    [pushHistory]
  )

  // Inline duplicate: bumps the layer's copy count so the element renders an
  // extra, independently editable copy of itself (reversible through undo).
  const duplicateLayer = useCallback(
    (label: string) => {
      pushHistory()
      setLayerDuplicates((current) => ({
        ...current,
        [label]: (current[label] ?? 0) + 1,
      }))
    },
    [pushHistory]
  )

  // Delete hides the layer (kept reversible via undo rather than destroyed).
  const deleteLayer = useCallback(
    (label: string) => {
      pushHistory()
      setHiddenLayers((current) =>
        current.includes(label) ? current : [...current, label]
      )
      setSelections((current) =>
        current.filter((selection) => selection.label !== label)
      )
      setInspectingLayer((open) => (open === label ? null : open))
    },
    [pushHistory]
  )

  const requestDeleteLayer = useCallback((label: string) => {
    setPendingDeleteLayer(label)
  }, [])

  const confirmDeleteLayer = useCallback(() => {
    if (pendingDeleteLayer) {
      deleteLayer(pendingDeleteLayer)
    }
    setPendingDeleteLayer(null)
  }, [deleteLayer, pendingDeleteLayer])

  const cancelDeleteLayer = useCallback(() => {
    setPendingDeleteLayer(null)
  }, [])

  const isLayerHidden = useCallback(
    (label: string) => hiddenLayers.includes(label),
    [hiddenLayers]
  )

  const layerDuplicateCount = useCallback(
    (label: string) => layerDuplicates[label] ?? 0,
    [layerDuplicates]
  )

  const inspectLayer = useCallback(
    (label: string | null, kind: BuilderLayerKind = "text") => {
      setInspectingLayer(label)
      setInspectingLayerKind(label === null ? null : kind)
      if (label !== null) {
        // Fresh inspect session always opens on the Style tab.
        setEditsTab("style")
        setAddingElement(false)
      }
    },
    []
  )

  const selectLayer = useCallback(
    (label: string, kind: BuilderLayerKind = "container") => {
      addSelection(label)
      setInspectingLayer(label)
      setInspectingLayerKind(kind)
      setEditsTab("style")
      setAddingElement(false)
    },
    [addSelection]
  )

  // Opening the add-elements palette takes over the panel, so make sure the
  // panel is visible and the inspector is dismissed.
  const openAddElements = useCallback(() => {
    setPanelOpen(true)
    setInspectingLayer(null)
    setAddingElement(true)
  }, [])

  const closeAddElements = useCallback(() => {
    setAddingElement(false)
  }, [])

  const addPlacedElement = useCallback(
    ({
      kind,
      label,
      zone,
      index,
    }: {
      kind: string
      label: string
      zone: PlacedElementZone
      index?: number
    }) => {
      pushHistory()
      placedElementCounterRef.current += 1
      const id = `placed-${placedElementCounterRef.current}`

      setPlacedElements((current) => {
        const sameKind = current.filter((element) => element.kind === kind)
        const displayLabel =
          sameKind.length > 0 ? `${label} ${sameKind.length + 1}` : label

        const next: PlacedElement = {
          id,
          kind,
          label: displayLabel,
          zone,
          content: getDefaultPlacedContent(kind),
        }

        if (index == null) {
          return [...current, next]
        }
        // Positional insert for the blank build-from-scratch page (drop between
        // existing blocks). The blank session stays blank — the page just
        // accumulates the elements the user drops, no invoice scaffold.
        const copy = [...current]
        copy.splice(Math.max(0, Math.min(index, copy.length)), 0, next)
        return copy
      })
    },
    [pushHistory]
  )

  const updatePlacedElementContent = useCallback(
    (id: string, content: string) => {
      pushHistory()
      setPlacedElements((current) =>
        current.map((element) =>
          element.id === id ? { ...element, content } : element
        )
      )
    },
    [pushHistory]
  )

  const removePlacedElement = useCallback(
    (id: string) => {
      pushHistory()
      setPlacedElements((current) =>
        current.filter((element) => element.id !== id)
      )
    },
    [pushHistory]
  )

  const duplicatePlacedElement = useCallback(
    (id: string) => {
      pushHistory()
      placedElementCounterRef.current += 1
      const copyId = `placed-${placedElementCounterRef.current}`
      setPlacedElements((current) => {
        const index = current.findIndex((element) => element.id === id)
        if (index === -1) {
          return current
        }
        const source = current[index]
        const copy: PlacedElement = {
          ...source,
          id: copyId,
          label: `${source.label} copy`,
        }
        const next = [...current]
        next.splice(index + 1, 0, copy)
        return next
      })
    },
    [pushHistory]
  )

  const seedLayer = useCallback(
    (label: string, seed: { content: string; style: BuilderLayerStyle }) => {
      setLayerTextState((current) =>
        label in current ? current : { ...current, [label]: seed.content }
      )
      setLayerStyles((current) =>
        label in current ? current : { ...current, [label]: seed.style }
      )
    },
    []
  )

  // Saves (or replaces) an Advanced-tab rule for a layer. Persisted in session
  // state so reopening the card shows the applied configuration.
  const setLayerRule = useCallback(
    (label: string, kind: BuilderRuleKind, rule: BuilderConditionRule) => {
      setLayerRules((current) => ({
        ...current,
        [label]: { ...current[label], [kind]: rule },
      }))
      setHasUnsavedChanges(true)
    },
    []
  )

  // Removes a previously applied Advanced-tab rule for a layer.
  const clearLayerRule = useCallback(
    (label: string, kind: BuilderRuleKind) => {
      setLayerRules((current) => {
        const existing = current[label]
        if (!existing || !(kind in existing)) {
          return current
        }
        const { [kind]: _removed, ...rest } = existing
        return { ...current, [label]: rest }
      })
      setHasUnsavedChanges(true)
    },
    []
  )

  const startNameEdit = useCallback(() => {
    setDraftName(name)
    setIsEditingName(true)
  }, [name])

  const commitName = useCallback(() => {
    const trimmed = draftName.trim()
    const nextName = trimmed || DEFAULT_LAYOUT_NAME
    setName((current) => {
      if (current !== nextName) {
        setHasUnsavedChanges(true)
      }
      return nextName
    })
    setIsEditingName(false)
  }, [draftName])

  const markSaved = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  const cancelNameEdit = useCallback(() => {
    setDraftName(name)
    setIsEditingName(false)
  }, [name])

  const stopGeneration = useCallback(() => {
    // Stopping mid-reasoning jumps straight to the questions (or settles if
    // there are none); stopping mid-generation settles the layout.
    if (status === "reasoning") {
      const startedAt = reasoningStartedAtRef.current ?? Date.now()
      const durationSec = Math.max(
        1,
        Math.round((Date.now() - startedAt) / 1000)
      )
      const pending = pendingQuestionsRef.current
      if (pending) {
        const lastUser = [...messages]
          .reverse()
          .find((message) => message.role === "user")
        setPreThoughtDurationSec(durationSec)
        setPreReasoning(buildReasoning(lastUser?.text ?? ""))
        setQuestions(pending)
        setStatus("asking")
      } else {
        setStatus("ready")
      }
      return
    }

    if (status !== "thinking") {
      return
    }
    const startedAt = thinkingStartedAtRef.current ?? Date.now()
    setThoughtDurationSec(
      Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    )
    setStatus("ready")
  }, [status, messages])

  const submitAnswers = useCallback(
    (submitted: AiAnswers) => {
      primeCompletionSound()
      setAnswers(submitted)
      setReceivedAnswers(formatReceivedAnswers(questions, submitted))
      startThinking()
    },
    [questions, startThinking]
  )

  const skipQuestions = useCallback(() => {
    primeCompletionSound()
    setReceivedAnswers(null)
    startThinking()
  }, [startThinking])

  // Marks the current turn as failed. The status effect plays the error cue on
  // entry; the panel surfaces the reason with a retry affordance.
  const failGeneration = useCallback((message: string) => {
    setErrorMessage(message)
    setQuestions([])
    setStatus("error")
  }, [])

  // The layer/section a prompt-box ("Describe your edit") request is scoped to.
  // While the AI works on that turn, only this container shows the working glow
  // (the canvas-wide beam is suppressed), so the change reads as local.
  const [aiEditingLayer, setAiEditingLayer] = useState<string | null>(null)

  const sendMessage = useCallback(
    (text: string, references: BuilderReferenceImage[] = []) => {
      const trimmed = text.trim()
      if (!trimmed && references.length === 0) {
        return
      }

      // Warm the audio context under this click so the completion/error cue is
      // allowed to play once the turn settles (timer-driven, no gesture).
      primeCompletionSound()

      // The first prompt ends the blank empty state; the generate flow takes over.
      setIsBlankSession(false)

      // Leaving a version preview — a new turn always acts on the live document.
      setPreviewVersionId(null)

      // A new turn supersedes any prior failure.
      setErrorMessage(null)

      // New turn — clear any prior answer recap until this turn asks again.
      setReceivedAnswers(null)
      setPreThoughtDurationSec(null)
      setPreReasoning(null)

      referenceUrlsRef.current = [
        ...referenceUrlsRef.current,
        ...references.map((ref) => ref.previewUrl),
      ]

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "user",
          text: trimmed,
          references,
        },
      ])

      // Can't reach the model offline — fail the turn so the user gets a clear
      // error (and the error cue) instead of a generation that never resolves.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        failGeneration(
          "Couldn't reach Invoice AI. Check your connection and try again."
        )
        return
      }

      // Always think first; only interrupt with questions when the request
      // reads as ambiguous, otherwise reasoning rolls into generation.
      startReasoning(buildFollowUpQuestions(trimmed))
    },
    [startReasoning, failGeneration]
  )

  // Prompt-box edit scoped to a specific layer/section: tag the active turn so
  // the working glow renders inside that container only, then hand off to the
  // normal turn pipeline (prefixing the layer keeps the transcript readable).
  const sendScopedEdit = useCallback(
    (label: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        return
      }
      setAiEditingLayer(label)
      sendMessage(`${label}: ${trimmed}`)
    },
    [sendMessage]
  )

  // True while the AI is acting on `label` from a scoped prompt-box edit — drives
  // the in-container working animation (same beam/shimmer as the canvas).
  const isLayerEditing = useCallback(
    (label: string) =>
      aiEditingLayer === label &&
      (status === "thinking" ||
        status === "reasoning" ||
        status === "asking"),
    [aiEditingLayer, status]
  )

  const retryGeneration = useCallback(() => {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === "user")
    const prompt = lastUser?.text ?? ""
    setErrorMessage(null)

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      failGeneration(
        "Couldn't reach Invoice AI. Check your connection and try again."
      )
      return
    }

    startReasoning(buildFollowUpQuestions(prompt))
  }, [messages, startReasoning, failGeneration])

  const dismissError = useCallback(() => {
    setErrorMessage(null)
    setStatus(hasGeneratedOnce ? "ready" : "idle")
  }, [hasGeneratedOnce])

  const generatedLayout = useMemo<GeneratedLayout>(() => {
    const userPrompts = messages
      .filter((message) => message.role === "user")
      .map((message) => message.text)
    const settledTurns = messages.filter(
      (message) => message.role === "assistant"
    ).length
    // The first prompt → assistant #1 → base layout; each later prompt folds in
    // once its assistant turn has settled (so the change lands on completion,
    // not the instant the user hits send). Manual edits still win last.
    return composeLayout(
      userPrompts,
      settledTurns - 1,
      answers,
      documentType,
      layoutEdits
    )
  }, [messages, answers, documentType, layoutEdits])

  // Freeze a snapshot of the document the first time each assistant turn
  // appears, so its eye/undo controls can preview or revert to that exact state
  // later. Write-once per id keeps earlier versions frozen as edits accumulate.
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant")
    if (!lastAssistant || versionSnapshotsRef.current[lastAssistant.id]) {
      return
    }
    versionSnapshotsRef.current[lastAssistant.id] = {
      ...cloneHistorySnapshot(documentStateRef.current),
      generatedLayout,
    }
    // Surface the new snapshot to consumers (hasVersionSnapshot reads the ref)
    // and trigger a persist so it survives a reload.
    setSnapshotVersion((value) => value + 1)
  }, [messages, generatedLayout])

  const previewVersion = useCallback((messageId: string) => {
    if (!versionSnapshotsRef.current[messageId]) {
      return
    }
    setPreviewVersionId(messageId)
  }, [])

  const exitVersionPreview = useCallback(() => {
    setPreviewVersionId(null)
  }, [])

  const restoreVersion = useCallback(
    (messageId: string) => {
      const snapshot = versionSnapshotsRef.current[messageId]
      if (!snapshot) {
        return
      }
      // Record the current state for undo, then roll the document back.
      pushHistory()
      applyHistorySnapshot({
        layoutEdits: snapshot.layoutEdits,
        layerText: snapshot.layerText,
        layerStyles: snapshot.layerStyles,
        hiddenLayers: snapshot.hiddenLayers,
        layerDuplicates: snapshot.layerDuplicates,
        placedElements: snapshot.placedElements,
        codeOverride: snapshot.codeOverride,
      })
      setPreviewVersionId(null)
    },
    [pushHistory, applyHistorySnapshot]
  )

  const hasVersionSnapshot = useCallback(
    (messageId: string) => Boolean(versionSnapshotsRef.current[messageId]),
    []
  )

  const showFeedbackToast = useCallback((message: string) => {
    setFeedbackToast(message)
    if (feedbackToastTimerRef.current) {
      window.clearTimeout(feedbackToastTimerRef.current)
    }
    feedbackToastTimerRef.current = window.setTimeout(
      () => setFeedbackToast(null),
      2600
    )
  }, [])

  useEffect(() => {
    return () => {
      if (feedbackToastTimerRef.current) {
        window.clearTimeout(feedbackToastTimerRef.current)
      }
    }
  }, [])

  // The snapshot currently being previewed (if any) drives read-only canvas
  // overrides below.
  const previewSnapshot = previewVersionId
    ? (versionSnapshotsRef.current[previewVersionId] ?? null)
    : null

  // While previewing a past version the canvas renders that frozen snapshot and
  // editing is suppressed (read-only). Otherwise everything reads live state.
  const effective = useMemo(() => {
    if (!previewSnapshot) {
      return {
        generatedLayout,
        layerText,
        layerStyles,
        placedElements,
        codeOverride,
        isCodeDetached: codeOverride !== null,
        editMode,
        inspectingLayer,
        isLayerHidden,
        layerDuplicateCount,
      }
    }
    return {
      generatedLayout: previewSnapshot.generatedLayout,
      layerText: previewSnapshot.layerText,
      layerStyles: previewSnapshot.layerStyles,
      placedElements: previewSnapshot.placedElements,
      codeOverride: previewSnapshot.codeOverride,
      isCodeDetached: previewSnapshot.codeOverride !== null,
      editMode: false,
      inspectingLayer: null,
      isLayerHidden: (label: string) =>
        previewSnapshot.hiddenLayers.includes(label),
      layerDuplicateCount: (label: string) =>
        previewSnapshot.layerDuplicates[label] ?? 0,
    }
  }, [
    previewSnapshot,
    generatedLayout,
    layerText,
    layerStyles,
    placedElements,
    codeOverride,
    editMode,
    inspectingLayer,
    isLayerHidden,
    layerDuplicateCount,
  ])

  // Latch once the first generation settles; follow-up prompts then keep the
  // existing layout visible instead of re-showing the generating animation.
  useEffect(() => {
    if (status === "ready") {
      setHasGeneratedOnce(true)
    }
    // A scoped prompt-box edit only owns the working glow while the turn is
    // actively running; once it settles (ready / error / idle) release it so the
    // container returns to its resting state.
    if (status !== "thinking" && status !== "reasoning" && status !== "asking") {
      setAiEditingLayer(null)
    }
  }, [status])

  // Play a soft completion cue whenever a turn finishes generating a layout.
  // Gated on the previous status being an active generating phase so it never
  // fires when an existing layout is restored straight into "ready" for edits.
  const prevStatusRef = useRef<BuilderStatus>("idle")
  useEffect(() => {
    const previous = prevStatusRef.current
    prevStatusRef.current = status

    const wasGenerating =
      previous === "thinking" ||
      previous === "reasoning" ||
      previous === "asking"

    if (status === "ready" && wasGenerating) {
      playCompletionSound()
    }

    // Soft prompt chime when the AI surfaces clarifying questions, so the user
    // notices the turn now needs their input.
    if (status === "asking" && previous !== "asking") {
      playQuestionSound()
    }

    // Distinct descending cue when a turn fails, so a failure is noticed even if
    // the user has looked away from the panel.
    if (status === "error" && previous !== "error") {
      playErrorSound()
    }
  }, [status])

  // Once a turn settles, persist it to the transcript: the reasoning, the
  // completed plan, and the closing recap. Keeps the full context visible the
  // way Cursor does, instead of clearing it after the to-dos finish.
  useEffect(() => {
    if (status !== "ready") {
      return
    }

    setMessages((current) => {
      const last = current[current.length - 1]
      if (!last || last.role === "assistant") {
        return current
      }

      const lastUser = [...current]
        .reverse()
        .find((message) => message.role === "user")
      const prompt = lastUser?.text ?? ""

      // The layout this turn produces — fold every prompt up to and including
      // the one being answered (this assistant message isn't appended yet, so
      // the live `generatedLayout` memo still trails by one turn). Keeps the
      // recap and recommendations consistent with what lands on the canvas.
      const userPrompts = current
        .filter((message) => message.role === "user")
        .map((message) => message.text)
      const settledTurns = current.filter(
        (message) => message.role === "assistant"
      ).length
      const turnLayout = composeLayout(
        userPrompts,
        settledTurns,
        answers,
        documentType,
        layoutEdits
      )

      const completedTodos: AiTodoItem[] = BUILDER_TODO_LABELS.map(
        (label, index) => ({
          id: `builder-todo-${index}`,
          label,
          status: "done",
        })
      )

      const hasAnswers = receivedAnswers && receivedAnswers.length > 0

      return [
        ...current,
        {
          id: nextMessageId(),
          role: "assistant",
          receivedAnswers,
          preReasoning: hasAnswers ? preReasoning : null,
          preDurationSec: hasAnswers ? (preThoughtDurationSec ?? 0) : null,
          reasoning: hasAnswers
            ? buildPostReasoning(prompt, receivedAnswers)
            : buildReasoning(prompt),
          durationSec: thoughtDurationSec ?? 0,
          todos: completedTodos,
          summary: buildCompletionSummary(turnLayout),
          recommendations: buildRecommendations(turnLayout),
        },
      ]
    })
  }, [
    status,
    thoughtDurationSec,
    preThoughtDurationSec,
    preReasoning,
    answers,
    documentType,
    layoutEdits,
    receivedAnswers,
  ])

  const todos = useMemo<AiTodoItem[]>(() => {
    if (status !== "thinking" && status !== "ready") {
      return []
    }

    return BUILDER_TODO_LABELS.map((label, index) => {
      let itemStatus: AiTodoItem["status"] = "pending"
      if (index < completedTodoCount) {
        itemStatus = "done"
      } else if (index === completedTodoCount && status === "thinking") {
        itemStatus = "in-progress"
      }

      return { id: `builder-todo-${index}`, label, status: itemStatus }
    })
  }, [completedTodoCount, status])

  const value = useMemo<LayoutBuilderContextValue>(
    () => ({
      name,
      draftName,
      isEditingName,
      setDraftName,
      startNameEdit,
      commitName,
      cancelNameEdit,
      mediumId,
      modelId,
      documentType,
      setDocumentType,
      codeOpen,
      previewOpen,
      toggleCode,
      togglePreview,
      codeOverride: effective.codeOverride,
      isCodeDetached: effective.isCodeDetached,
      detachCode,
      updateCodeOverride,
      reattachCode,
      panelOpen,
      setPanelOpen,
      panelWidth,
      setPanelWidth,
      panelMinWidth: PANEL_MIN_WIDTH,
      panelMaxWidth: PANEL_MAX_WIDTH,
      editMode: effective.editMode,
      toggleEditMode,
      updateLayout,
      selections,
      addSelection,
      removeSelection,
      clearSelections,
      layerText: effective.layerText,
      setLayerText,
      layerStyles: effective.layerStyles,
      setLayerStyle,
      isLayerHidden: effective.isLayerHidden,
      layerDuplicateCount: effective.layerDuplicateCount,
      duplicateLayer,
      requestDeleteLayer,
      inspectingLayer: effective.inspectingLayer,
      inspectLayer,
      inspectingLayerKind,
      editsTab,
      setEditsTab,
      selectLayer,
      seedLayer,
      layerRules,
      setLayerRule,
      clearLayerRule,
      addingElement,
      openAddElements,
      closeAddElements,
      placedElements: effective.placedElements,
      addPlacedElement,
      updatePlacedElementContent,
      removePlacedElement,
      duplicatePlacedElement,
      isBlankSession,
      promptFocusToken,
      focusPrompt,
      messages,
      status,
      errorMessage,
      retryGeneration,
      dismissError,
      hasGeneratedOnce,
      preThoughtDurationSec,
      preReasoning,
      thoughtDurationSec,
      todos,
      questions,
      receivedAnswers,
      generatedLayout: effective.generatedLayout,
      sendMessage,
      sendScopedEdit,
      isLayerEditing,
      aiEditingLayer,
      submitAnswers,
      skipQuestions,
      stopGeneration,
      canUndo,
      canRedo,
      undo,
      redo,
      previewVersionId,
      previewVersion,
      exitVersionPreview,
      restoreVersion,
      hasVersionSnapshot,
      feedbackToast,
      showFeedbackToast,
      hasUnsavedChanges,
      markSaved,
    }),
    [
      name,
      draftName,
      isEditingName,
      startNameEdit,
      commitName,
      cancelNameEdit,
      mediumId,
      modelId,
      documentType,
      codeOpen,
      previewOpen,
      toggleCode,
      togglePreview,
      codeOverride,
      detachCode,
      updateCodeOverride,
      reattachCode,
      panelOpen,
      panelWidth,
      editMode,
      toggleEditMode,
      updateLayout,
      selections,
      addSelection,
      removeSelection,
      clearSelections,
      layerText,
      setLayerText,
      layerStyles,
      setLayerStyle,
      isLayerHidden,
      layerDuplicateCount,
      duplicateLayer,
      requestDeleteLayer,
      inspectingLayer,
      inspectLayer,
      inspectingLayerKind,
      editsTab,
      setEditsTab,
      selectLayer,
      seedLayer,
      layerRules,
      setLayerRule,
      clearLayerRule,
      addingElement,
      openAddElements,
      closeAddElements,
      placedElements,
      addPlacedElement,
      updatePlacedElementContent,
      removePlacedElement,
      duplicatePlacedElement,
      isBlankSession,
      promptFocusToken,
      focusPrompt,
      messages,
      status,
      errorMessage,
      retryGeneration,
      dismissError,
      hasGeneratedOnce,
      preThoughtDurationSec,
      preReasoning,
      thoughtDurationSec,
      todos,
      questions,
      receivedAnswers,
      generatedLayout,
      sendMessage,
      sendScopedEdit,
      isLayerEditing,
      aiEditingLayer,
      submitAnswers,
      skipQuestions,
      stopGeneration,
      canUndo,
      canRedo,
      undo,
      redo,
      effective,
      previewVersionId,
      previewVersion,
      exitVersionPreview,
      restoreVersion,
      hasVersionSnapshot,
      snapshotVersion,
      feedbackToast,
      showFeedbackToast,
      hasUnsavedChanges,
      markSaved,
    ]
  )

  return (
    <LayoutBuilderContext.Provider value={value}>
      {children}
      <ConfirmationDialog
        open={pendingDeleteLayer !== null}
        onOpenChange={(open) => {
          if (!open) {
            cancelDeleteLayer()
          }
        }}
        title="Delete element"
        description="Are you sure you want to delete this element? You can undo this action from the toolbar"
        confirmLabel={DELETE_CONFIRMATION_LABEL}
        cancelLabel={DELETE_CANCEL_LABEL}
        variant="destructive"
        onConfirm={confirmDeleteLayer}
        onCancel={cancelDeleteLayer}
      />
    </LayoutBuilderContext.Provider>
  )
}

export function useLayoutBuilder(): LayoutBuilderContextValue {
  const context = useContext(LayoutBuilderContext)

  if (!context) {
    throw new Error("useLayoutBuilder must be used within LayoutBuilderProvider")
  }

  return context
}
