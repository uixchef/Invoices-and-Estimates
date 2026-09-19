"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
  buildEditSummary,
  buildPostReasoning,
  buildReasoning,
  buildRecommendations,
  buildTodoLabels,
  buildWorkingNarrative,
  type NarrativeRequest,
} from "@/lib/builder-narrative"
import {
  defaultColumnContents,
  insertPlacedElement,
  inspectorTabForKind,
  nextPlacedId,
  nextPlacedLabel,
  resolveTableAdd,
} from "@/lib/placed-elements"
import { applyBlockPrompt } from "@/lib/placed-element-prompt"
import {
  endDocumentAction,
  executeDocumentAction,
  matchDocumentAction,
  tryBeginDocumentAction,
  type DocumentActionExtras,
  type DocumentActionGate,
} from "@/lib/document-actions"
import {
  applyStyleOverride,
  clearMergedLayerRule,
  effectiveInspectorTab,
  inspectorPropertyGroups,
  mergeLayerRule,
  parseScopedStylePrompt,
} from "@/lib/element-properties"
import {
  insertChildAt,
  insertRootAt,
  relocatePlacedElement as relocatePlacedTree,
  removePlacedTree,
  canNestInside,
  type DropDest,
} from "@/lib/placed-tree"
import {
  getDefaultPlacedContent,
  getPlacedElementLayerKind,
  getPlacedElementSeed,
} from "@/lib/placed-element-defaults"
import { demoPaymentDetails } from "@/lib/demo-payment"
import { applyPromptEdit, mergeLayoutContent } from "@/lib/layout-prompt-edit"
import {
  loadCustomBoards,
  saveCustomBoards,
  resolveFamilyBrand,
  selectionFromBoard,
  brandLayoutEditsFromSelection,
  isBrandApplyNoop,
  resolvePaintedLayout,
  type BrandBoard,
  type BrandSelection,
  type ResolvedFamilyBrand,
} from "@/lib/brand-boards"
import {
  createSavedDefinition,
  deleteSavedDefinition,
  duplicateSavedDefinition,
  duplicatePlacedDocument,
  findPlacedByInspectKey,
  insertSavedIntoDocument,
  loadSavedItems,
  persistSavedItems,
  renameSavedDefinition,
  replaceAvailabilityFor,
  replaceSelectedWithSaved,
  serializeSelection,
  type SavedItemDefinition,
  type SavedItemNode,
  type SavePopoverAnchor,
} from "@/lib/saved-items"
import {
  addComposerDraftFiles,
  discardComposerDraft,
  emptyComposerDraft,
  removeComposerDraftAttachment,
  setComposerDraftPrimary as nextComposerDraftPrimary,
  setComposerDraftText as nextComposerDraftText,
  setComposerDraftModelId as nextComposerDraftModelId,
  type ComposerDraft,
} from "@/lib/composer-draft"
import type { PromptAttachment } from "@/lib/create-with-ai-types"
import { attachmentFeedbackMessages } from "@/lib/prompt-attachments"
import {
  appendDocumentVersion,
  canRestoreDocumentVersion,
  currentDocumentVersionId,
  findDocumentVersion,
  fingerprintDocumentSnapshot,
  historyToUndoSnapshot,
  matchingDocumentVersionId,
  MAX_DOCUMENT_VERSIONS,
  nextDocumentVersionId,
  persistableDocumentVersions,
  syncDocumentVersionIdCounter,
  type DocumentVersion,
  type DocumentVersionMeta,
  type DocumentVersionSnapshot,
} from "@/lib/document-versions"
import { documentMutationsLocked as documentMutationsLockedState } from "@/lib/document-edit-guard"
import { PRODUCT_UNREACHABLE } from "@/lib/product-name"
import {
  imageReferencesFromSubmitted,
  persistableUserMessage,
  resolveBuilderGenerationPrompt,
} from "@/lib/builder-attachments"
import {
  canCompareReferenceResult,
  creationComparisonSource,
  creationUsedVisualReference,
} from "@/lib/reference-comparison"
import { getDefaultBuilderMediumId, getMediumName } from "@/lib/mediums-data"
import { findDocumentSource } from "@/lib/invoice-sources"
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
  type BuilderUserMessage,
  type BuilderReceivedAnswer,
  type BuilderSelection,
  type BuilderStatus,
  type BuilderSubmittedAttachment,
  type BuilderVisualStyle,
  type GeneratedLayout,
  type LayoutBuilderEditSeed,
  PAGE_LAYER_LABEL,
  type PlacedElement,
  type PlacedElementZone,
} from "@/lib/layout-builder-types"
import { authoredKeyFromId, compatibilityKeys, displayLabelForSlot, isHiddenLayer } from "@/lib/native-instance-id"
import type { LayoutRow } from "@/lib/layouts-data"
import { layoutEditSeedFromRow } from "@/lib/layout-edit-seed"
import { useLayoutCatalogOptional } from "@/lib/layout-catalog-context"
import {
  catalogRowFromDocument,
  loadSavedLayoutRecords,
  newSavedLayoutId,
  previewLayoutForRow,
  stripEphemeralDocument,
} from "@/lib/layout-document-store"
import {
  DRAFT_IDENTITY_BY_ID,
  identityForFamily,
  lineItemsForFamily,
} from "@/lib/document-identities"
import {
  FAMILY_PROMPT_PHRASE,
  dashboardFamilyForLayoutId,
  normalizeLayoutStyle,
  resolveAccentColor,
  resolveInitialVisualStyle,
} from "@/lib/layout-family"
import {
  acknowledgementForAnswer,
  interpretFreeformAnswer,
  type ClarificationSurface,
} from "@/lib/clarification-copy"
import {
  applyClarificationLayoutEffects,
  answersToDecisions,
  applyAnswersToDecisions,
  DECIDE_VALUE,
  decisionsToAnswers,
  discountRateFromValue,
  inferClarificationKind,
  planClarification,
  questionsOrNull,
  resolvedForScopedClarification,
  type ResolvedDecision,
} from "@/lib/clarification"
import {
  reconstructLayoutFromReference,
  type ReferenceAnalysis,
} from "@/lib/reference-layout"
import {
  activatePortfolioCapture,
  getBuilderNow,
  getCaptureBlueprint,
  getReasoningDelayMs,
  getThinkingDelayMs,
  isIntendedCaptureMounted,
  isPortfolioCaptureActive,
  nextCaptureMessageId,
  primeCaptureMessageCounter,
  readPortfolioCaptureRequest,
  shouldPersistBuilderSession,
  shouldSkipSimulatedTimers,
  syncCaptureDom,
} from "@/lib/portfolio-capture"

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
  catalogId?: string | null
  /** Per-turn version snapshots so eye/undo stay functional after a reload. */
  versionSnapshots: Record<string, VersionSnapshot>
  /** Document version timeline (not chat, not undo). */
  documentVersions?: DocumentVersion[]
  // Unsent Invoice AI composer drafts (text + File blobs) stay in memory only.
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
  /**
   * Frozen base document set when reverting to an earlier version. When non-null
   * it replaces the message-composed base, so reverting rolls the rendered
   * layout back (not just the manual-edit overlays). Cleared by the next prompt.
   */
  baseLayout: GeneratedLayout | null
}

function cloneHistorySnapshot(
  snapshot: BuilderHistorySnapshot
): BuilderHistorySnapshot {
  return structuredClone(snapshot)
}

function documentVersionTarget(label: string) {
  const authored = authoredKeyFromId(label)
  if (authored) {
    const slot = authored.split("/").pop() ?? authored
    return displayLabelForSlot(slot)
  }
  return label
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

function questionsForPrompt(
  prompt: string,
  options: {
    hasReference?: boolean
    generatedOnce?: boolean
    isScopedElement?: boolean
    hasBrandBoard?: boolean
    resolved?: ResolvedDecision[]
    askedCount?: number
    round?: number
  } = {}
): {
  questions: AiQuestion[] | null
  resolved: ResolvedDecision[]
  askableCount: number
} {
  const kind = inferClarificationKind({
    hasGeneratedOnce: options.generatedOnce ?? false,
    hasReference: options.hasReference ?? false,
    isScopedElement: options.isScopedElement ?? false,
    prompt,
  })
  const resolvedForPlan = options.isScopedElement
    ? resolvedForScopedClarification(options.resolved ?? [])
    : (options.resolved ?? [])
  const plan = planClarification({
    prompt,
    kind,
    hasReference: options.hasReference ?? false,
    hasBrandBoard: options.hasBrandBoard ?? false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: options.generatedOnce ?? false,
    resolved: resolvedForPlan,
    askedCount: options.askedCount ?? 0,
    round: options.round ?? 0,
  })
  return {
    questions: questionsOrNull(plan),
    resolved: plan.resolved,
    askableCount: plan.askableCount,
  }
}

function narrativeRequestFromTurn(
  messages: BuilderMessage[],
  mediumId: string | null,
  answers: AiAnswers | null,
  layout?: GeneratedLayout | null
): NarrativeRequest {
  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const firstUser = messages.find((message) => message.role === "user")
  const userCount = messages.filter((message) => message.role === "user").length
  const prompt = lastUser?.text ?? ""
  return {
    prompt,
    hasReference: (firstUser?.references.length ?? 0) > 0,
    isFollowUp: userCount > 1,
    paperName: mediumId ? getMediumName(mediumId) : "A4",
    family:
      layout?.style ??
      resolveInitialVisualStyle(firstUser?.text ?? prompt, answers?.style),
  }
}

const CURRENCY_BY_ID: Record<string, { code: string; symbol: string }> = {
  usd: { code: "USD", symbol: "$" },
  eur: { code: "EUR", symbol: "€" },
  gbp: { code: "GBP", symbol: "£" },
  inr: { code: "INR", symbol: "₹" },
}

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
  const style = resolveInitialVisualStyle(prompt, answers?.style)
  const identity = identityForFamily(style)
  const extractedName = deriveBusinessName(prompt)

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
    ? Math.min(Math.max(countAnswer, 1), identity.lineItems.length)
    : 3

  const emphasis =
    typeof answers?.focus === "string" && answers.focus.trim()
      ? answers.focus.trim()
      : null

  const now = getBuilderNow()
  const due = new Date(now)
  due.setDate(due.getDate() + 14)

  const documentNumber = `${DOC_PREFIX[documentType]}-${now.getFullYear()}-${pad(
    142,
    4
  )}`
  const businessName =
    extractedName === "Your Business" ? identity.businessName : extractedName

  return applyClarificationLayoutEffects(
    {
      documentType,
      businessName,
      clientName: identity.clientName,
      emphasis,
      style,
      accent: resolveAccentColor(prompt, style),
      currencyCode: currency.code,
      currencySymbol: currency.symbol,
      sections,
      lineItems: lineItemsForFamily(style, itemCount),
      taxRate: 0.1,
      discountRate: 0.1,
      documentNumber,
      issueDate: formatDate(now),
      dueDate: formatDate(due),
      payment: demoPaymentDetails({ businessName, documentNumber }),
    },
    answers
  )
}

function extrasFromAnswers(answers: AiAnswers | null): DocumentActionExtras | undefined {
  if (typeof answers?.discountType !== "string") {
    return undefined
  }
  const rate = discountRateFromValue(answers.discountType)
  return rate != null ? { discountRate: rate } : undefined
}

function answersWithoutDiscountCommit(answers: AiAnswers | null): AiAnswers | null {
  if (!answers) {
    return null
  }
  if (answers.discountType == null && answers.discountRate == null) {
    return answers
  }
  const next = { ...answers }
  delete next.discountType
  delete next.discountRate
  return next
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
  layoutEdits: Partial<GeneratedLayout>,
  fromReference = false,
  referenceAnalysis: ReferenceAnalysis | null = null
): GeneratedLayout {
  let composed = fromReference
    ? reconstructLayoutFromReference(
        userPrompts[0] ?? "",
        documentType,
        referenceAnalysis
      )
    : deriveLayout(userPrompts[0] ?? "", answersWithoutDiscountCommit(answers), documentType)
  composed = applyClarificationLayoutEffects(
    composed,
    answersWithoutDiscountCommit(answers)
  )
  const extras = extrasFromAnswers(answers)
  for (let i = 1; i < userPrompts.length && i <= maxFollowUps; i++) {
    composed = applyPromptEdit(composed, userPrompts[i], extras)
  }
  return mergeLayoutContent(composed, layoutEdits)
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

const EDIT_STYLE_PHRASE = FAMILY_PROMPT_PHRASE

function indefiniteArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "an" : "a"
}

/**
 * Resolves the exact `GeneratedLayout` the builder reconstructs when a dashboard
 * row is opened via "Edit" — the single source of truth shared by the builder
 * canvas and the dashboard card/preview thumbnails, so a card always depicts the
 * layout the user will land on. Deterministic from the row's id (its seed).
 */
export function layoutFromRow(row: LayoutRow): GeneratedLayout {
  const storedPreview = previewLayoutForRow(row.id)
  if (storedPreview) {
    return storedPreview
  }
  const editSeed = layoutEditSeedFromRow(row)
  const session = deriveEditSession(editSeed)
  return composeLayout(
    [session.prompt],
    0,
    session.answers,
    editSeed.documentType,
    { businessName: session.businessName }
  )
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
  const currencies = ["usd", "eur", "gbp", "inr"]
  const seed = Math.max(0, editSeed.seed)

  const style = dashboardFamilyForLayoutId(editSeed.layoutId)
  const identity = identityForFamily(style)
  const currency = currencies[Math.floor(seed / 4) % currencies.length]
  const business =
    DRAFT_IDENTITY_BY_ID[editSeed.layoutId] !== undefined
      ? identity.businessName
      : EDIT_BUSINESSES[seed % EDIT_BUSINESSES.length]

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
function generationPromptTexts(messages: BuilderMessage[]): string[] {
  return messages
    .filter(
      (message): message is BuilderUserMessage =>
        message.role === "user" &&
        message.kind !== "clarification-answer" &&
        parseScopedStylePrompt(message.text) === null
    )
    .map((message) => message.text)
}

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
      const raw = Array.isArray(value) ? values.join(", ") : String(value)
      result.push({
        prompt: question.prompt,
        values,
        acknowledgement: acknowledgementForAnswer(question, raw),
      })
    }
  }
  return result
}

type ElementDragSession = {
  mode: "insert" | "move"
  kind: string
  label: string
  elementId?: string
  savedItemId?: string
  x: number
  y: number
  hoverKey: string | null
  dest: DropDest | null
  overPaper: boolean
}

export type SaveItemDraft = {
  node: SavedItemNode
  defaultName: string
  anchor: SavePopoverAnchor | null
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
   * Data source the document preview is rendered against — a built-in sample or
   * an actual invoice (or null for the layout's own generated content). Selecting
   * one overlays its content onto the live layout; manual edits still win.
   */
  previewSourceId: string | null
  setPreviewSourceId: (value: string | null) => void

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
  /** Commits a detached-code edit as one Version-history row (blur/commit). */
  commitCodeOverrideVersion: () => void
  /** True while Reference compare or version preview must reject document edits. */
  documentEditingLocked: boolean

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
  /** Opens the Page properties overlay and enables visual edit mode. */
  openPageProperties: () => void
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
  hiddenLayers: string[]
  layerDuplicates: Record<string, number>

  /** True when the layer has any user edits (content / style / rules / copies)
   *  beyond the baseline captured when it was first inspected. */
  hasLayerChanges: (label: string) => boolean
  /** Reverts a layer's edits back to that captured baseline. */
  resetLayer: (label: string) => void

  /** True when the layer has been deleted (hidden) via its selector control. */
  isLayerHidden: (label: string) => boolean
  /** Number of inline copies a layer currently has from the duplicate control. */
  layerDuplicateCount: (label: string) => number
  /** Adds an inline copy of the layer. */
  duplicateLayer: (label: string) => void
  /** Opens the delete confirmation for a layer (hide on confirm). */
  requestDeleteLayer: (label: string) => void

  /**
   * In-app element clipboard powering the inspector's "More options" menu
   * (Figma 3350:64356 / 3350:65267). Copying a layer (or just its properties)
   * enables the paste actions; until something is copied they read disabled.
   */
  /** Copies the layer's content + style onto the clipboard. */
  copyLayer: (label: string) => void
  /** Copies just the layer's style properties onto the clipboard. */
  copyLayerProperties: (label: string) => void
  /** Replaces the layer's content + style with the clipboard's (no-op if empty). */
  pasteToReplace: (label: string) => void
  /** Inserts a copy of the layer immediately after it (no-op if clipboard empty). */
  pasteAfter: (label: string) => void
  /** Applies the clipboard's style properties to the layer (no-op if empty). */
  pasteLayerProperties: (label: string) => void
  /** True when a layer is on the clipboard (enables Paste to replace / Paste after). */
  canPasteLayer: boolean
  /** True when layer properties are on the clipboard (enables Paste properties). */
  canPasteProperties: boolean

  /**
   * Section reorder bridge so the inspector's "More options" menu can drive the
   * same up/down reordering the on-canvas section selector grips use. Sections
   * register their handlers; non-reorderable layers report `false` so the menu
   * disables Move up / Move down for them.
   */
  canMoveLayer: (label: string, direction: "up" | "down") => boolean
  moveLayer: (label: string, direction: "up" | "down") => void
  registerLayerMover: (
    label: string,
    mover:
      | { canUp: boolean; canDown: boolean; up: () => void; down: () => void }
      | null
  ) => void

  /**
   * The layer whose Visual edits inspector is open (replaces the chat). Null
   * shows the normal AI conversation.
   */
  inspectingLayer: string | null
  /** Human-facing title for the inspected native node. Independent of instance ID. */
  inspectingDisplayLabel: string | null
  inspectLayer: (label: string | null, kind?: BuilderLayerKind) => void

  /**
   * Whether the inspected layer is an individual text layer or a
   * section/container. Drives text-only controls (e.g. the Style tab's
   * "Content" field, which only applies to editable text). Null when nothing is
   * inspected.
   */
  inspectingLayerKind: BuilderLayerKind | null

  /** Which Edits sub-tab the inspector shows. */
  editsTab: "content" | "style" | "advanced"
  setEditsTab: (tab: "content" | "style" | "advanced") => void

  /**
   * Whether the edits panel is docked as a full-height right column (vs. the
   * default floating overlay anchored beside the selection). Docked, it becomes
   * part of the builder layout so the canvas reflows (Figma 3181:33796).
   */
  editsDocked: boolean
  setEditsDocked: (docked: boolean) => void

  /** Selects a layer for inspection — opens its Visual edits panel + chip. */
  selectLayer: (
    label: string,
    kind?: BuilderLayerKind,
    options?: {
      keepAddElements?: boolean
      tab?: "content" | "style" | "advanced"
      chipLabel?: string
      authoredKey?: string
    }
  ) => void

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
  revealSavedItems: boolean
  openAddElements: (options?: { revealSaved?: boolean }) => void
  closeAddElements: () => void
  browsingSavedItems: boolean
  openSavedItems: () => void
  closeSavedItems: () => void
  browsingBrand: boolean
  openBrandBoards: () => void
  closeBrandBoards: () => void
  browsingVersionHistory: boolean
  openVersionHistory: () => void
  closeVersionHistory: () => void
  /**
   * Unsent Invoice AI composer draft. Survives left-panel switches in memory.
   * Not part of document versions, undo, restore, or sessionStorage.
   */
  composerDraftText: string
  composerDraftAttachments: PromptAttachment[]
  composerDraftModelId: string
  composerDraftPrimaryReferenceId: string | null
  setComposerDraftText: (text: string) => void
  setComposerDraftModelId: (modelId: string) => void
  addComposerDraftFiles: (files: File[]) => void
  removeComposerDraftAttachment: (id: string) => void
  setComposerDraftPrimary: (id: string) => void
  clearComposerDraft: () => void
  brandDraft: BrandSelection | null
  brandHasPreview: boolean
  previewBrandSelection: (selection: BrandSelection) => void
  applyBrandSelection: () => void
  cancelBrandPreview: () => void
  customBoards: BrandBoard[]
  brandCatalog: BrandBoard[]
  upsertCustomBoard: (board: BrandBoard, apply: boolean) => void
  removeCustomBoard: (id: string) => void
  previewUnsavedBoard: (board: BrandBoard) => void
  brandTokens: ResolvedFamilyBrand
  resetLayerToBrand: (label: string) => void
  /** True while a palette tile is being dragged, so drop seams can expand. */
  paletteDragging: boolean
  setPaletteDragging: (dragging: boolean) => void
  elementDrag: ElementDragSession | null
  beginElementDrag: (session: Omit<ElementDragSession, "hoverKey" | "dest" | "overPaper">) => void
  updateElementDragPointer: (next: {
    x: number
    y: number
    hoverKey: string | null
    dest: DropDest | null
    overPaper: boolean
  }) => void
  commitElementDrag: () => void
  cancelElementDrag: () => void
  relocatePlacedElement: (id: string, dest: DropDest) => void

  /** Placeholder entities dropped onto the invoice from the Add elements palette. */
  placedElements: PlacedElement[]
  addPlacedElement: (input: {
    kind: string
    label: string
    zone: PlacedElementZone
    /** Insert position in the placed-element order (blank page). Appends if omitted. */
    index?: number
    parentId?: string
    slot?: number
    dest?: DropDest
  }) => void
  updatePlacedElementContent: (id: string, content: string) => void
  updatePlacedElement: (id: string, patch: Partial<PlacedElement>) => void
  removePlacedElement: (id: string) => void
  /** Inserts a copy of a placed element directly after the original. */
  duplicatePlacedElement: (id: string) => void
  canMovePlacedElement: (id: string, direction: "up" | "down") => boolean
  movePlacedElement: (id: string, direction: "up" | "down") => void
  /** Drops a dragged placed element before the target within the same zone. */
  reorderPlacedElement: (draggedId: string, targetId: string) => void

  savedItems: SavedItemDefinition[]
  saveItemDraft: SaveItemDraft | null
  beginSaveSelected: (anchor?: SavePopoverAnchor | null) => void
  confirmSaveItem: (name: string) => void
  cancelSaveItem: () => void
  saveAvailability: (label: string | null) => { ok: true } | { ok: false; reason: string }
  insertSavedItem: (id: string, dest?: DropDest) => void
  replaceSelectedWithSavedItem: (id: string) => void
  replaceAvailability: (id: string) => { ok: true } | { ok: false; reason: string }
  renameSavedItem: (id: string, name: string) => void
  duplicateSavedItem: (id: string) => void
  deleteSavedItem: (id: string) => void

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
  /** First-turn generation is reconstructing a visual reference, not exploring families. */
  isReferenceReconstruction: boolean
  /** True when a usable Primary preview can be compared with the native result. */
  canCompareReferenceResult: boolean
  /** Object URL of the creation Primary reference, if still available. */
  referencePreviewUrl: string | null
  /** Filename of the creation Primary, for truthful comparison alt text. */
  referenceSourceName: string | null
  /** Attachment id of the creation Primary shown in Reference view. */
  referenceSourceId: string | null
  /** Sampled colour from the reference, used by the reconstruction field. */
  referenceMoodHex: string | null
  /** When true, the canvas shows the original reference instead of the native result. */
  compareWithReference: boolean
  setCompareWithReference: (value: boolean) => void
  /** Duration of the pre-question reasoning pass. */
  preThoughtDurationSec: number | null
  /** Collapsed recap text from before clarifying questions. */
  preReasoning: string | null
  /** Duration of the post-answer generation pass. */
  thoughtDurationSec: number | null
  todos: AiTodoItem[]
  /** Clarifying questions shown while `status === "asking"`. */
  questions: AiQuestion[]
  clarificationAskedCount: number
  clarificationAskableCount: number
  clarificationSurface: ClarificationSurface
  clarificationTargetId: string | null
  /** Answers captured for the active turn (null when none were asked). */
  receivedAnswers: BuilderReceivedAnswer[] | null
  /** Resolved layout to render once `status === "ready"`. */
  generatedLayout: GeneratedLayout
  sendMessage: (
    text: string,
    attachments?: BuilderSubmittedAttachment[],
    options?: {
      scoped?: boolean
      referenceAnalysis?: ReferenceAnalysis
      primaryReferenceId?: string | null
    }
  ) => boolean
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
  /** Uses inferred defaults for the active clarification round. */
  skipQuestions: () => void
  submitFreeformClarification: (text: string) => void
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

  documentVersions: DocumentVersion[]
  /** The version whose snapshot matches the live document, or null. */
  currentVersionId: string | null
  previewingHistoricalVersion: boolean
  previewDocumentVersion: (id: string) => void
  restoreDocumentVersion: (id: string) => void
  closeVersionHistoryPreview: () => void

  /** Transient confirmation toast above the composer; null when hidden. */
  feedbackToast: string | null
  /** Shows a toast above the composer for a few seconds (AI answer feedback). */
  showFeedbackToast: (message: string) => void

  /** Transient confirmation toast centered over the canvas; null when hidden. */
  canvasToast: string | null
  /** Shows a toast at the horizontal center of the canvas (edit confirmations). */
  showCanvasToast: (message: string) => void

  /**
   * True once the session has edits that haven't been persisted — drives the
   * "Unsaved changes?" guard when leaving the builder. Set by any document
   * mutation, a generation, or a rename; cleared by Save / Publish.
   */
  hasUnsavedChanges: boolean
  /** Clears the unsaved-changes flag after a successful Save / Publish. */
  markSaved: () => void
  /**
   * Commits the current document into the prototype layout catalog.
   * Draft stays in the builder; Published is the same commit with Published status.
   */
  saveLayout: (status: "Draft" | "Published") => { id: string; name: string } | null
}

const LayoutBuilderContext = createContext<LayoutBuilderContextValue | null>(null)

let messageCounter = 0
function nextMessageId() {
  if (isPortfolioCaptureActive()) {
    return nextCaptureMessageId()
  }
  messageCounter += 1
  return `builder-msg-${Date.now()}-${messageCounter}`
}

export function LayoutBuilderProvider({ children }: { children: ReactNode }) {
  const { consumePendingGeneration, consumePendingEdit, consumePendingBlank } =
    useCreateWithAi()
  const catalog = useLayoutCatalogOptional()

  const [name, setName] = useState(DEFAULT_LAYOUT_NAME)
  const [draftName, setDraftName] = useState(DEFAULT_LAYOUT_NAME)
  const [isEditingName, setIsEditingName] = useState(false)
  const [catalogId, setCatalogId] = useState<string | null>(null)
  const catalogIdRef = useRef<string | null>(null)

  const [mediumId, setMediumId] = useState<string | null>(null)
  const [modelId, setModelId] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<BuilderDocumentType>(
    BUILDER_DOCUMENT_TYPES[0]
  )
  // Null = preview the layout's own generated content. A non-null id overlays a
  // sample / actual-invoice dataset onto the document (see `generatedLayout`).
  const [previewSourceId, setPreviewSourceId] = useState<string | null>(null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [codeOverride, setCodeOverrideState] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const [editMode, setEditMode] = useState(false)
  const [layoutEdits, setLayoutEdits] = useState<Partial<GeneratedLayout>>({})
  // Non-null after reverting to a version: replaces the message-composed base so
  // the rendered layout matches that version. Cleared by the next prompt.
  const [baseLayout, setBaseLayout] = useState<GeneratedLayout | null>(null)
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
  // Snapshot of each layer's content + style as first seeded on inspect, so the
  // inspector can offer a per-layer "reset changes" against this baseline.
  const layerBaselineRef = useRef<
    Record<string, { content: string; style: BuilderLayerStyle }>
  >({})
  // In-app element clipboard for the inspector's "More options" menu. `null`
  // until the user copies, which is what gates the paste actions' disabled
  // state (Figma 3350:65267).
  const [copiedLayer, setCopiedLayer] = useState<{
    content: string
    style: BuilderLayerStyle
  } | null>(null)
  const [copiedProperties, setCopiedProperties] =
    useState<BuilderLayerStyle | null>(null)
  // Section reorder handlers registered by each reorderable SelectableSection,
  // keyed by layer label, so the inspector menu can move the inspected section.
  const layerMoversRef = useRef<
    Record<
      string,
      { canUp: boolean; canDown: boolean; up: () => void; down: () => void }
    >
  >({})
  // Bumped when a registered mover's up/down availability changes so consumers
  // re-read `canMoveLayer` (the handlers themselves live in the ref).
  const [moverVersion, setMoverVersion] = useState(0)
  const [inspectingLayer, setInspectingLayer] = useState<string | null>(null)
  const [inspectingDisplayLabel, setInspectingDisplayLabel] = useState<
    string | null
  >(null)
  const [inspectingLayerKind, setInspectingLayerKind] =
    useState<BuilderLayerKind | null>(null)
  const [pendingDeleteLayer, setPendingDeleteLayer] = useState<string | null>(
    null
  )
  const [editsTab, setEditsTab] = useState<"content" | "style" | "advanced">(
    "style"
  )
  const [editsDocked, setEditsDocked] = useState(false)
  const [addingElement, setAddingElement] = useState(false)
  const [revealSavedItems, setRevealSavedItems] = useState(false)
  const [browsingSavedItems, setBrowsingSavedItems] = useState(false)
  const [savedItems, setSavedItems] = useState<SavedItemDefinition[]>([])
  const [saveItemDraft, setSaveItemDraft] = useState<SaveItemDraft | null>(null)
  const [browsingBrand, setBrowsingBrand] = useState(false)
  const [browsingVersionHistory, setBrowsingVersionHistory] = useState(false)
  const [composerDraft, setComposerDraft] = useState<ComposerDraft>(emptyComposerDraft)
  const composerDraftRef = useRef<ComposerDraft>(composerDraft)
  composerDraftRef.current = composerDraft
  const [brandDraft, setBrandDraft] = useState<BrandSelection | null>(null)
  const [customBoards, setCustomBoards] = useState<BrandBoard[]>([])
  const [unsavedBoard, setUnsavedBoard] = useState<BrandBoard | null>(null)
  const [paletteDragging, setPaletteDragging] = useState(false)
  const [elementDrag, setElementDrag] = useState<ElementDragSession | null>(null)
  const elementDragRef = useRef<ElementDragSession | null>(null)
  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([])
  const [aiEditingLayer, setAiEditingLayer] = useState<string | null>(null)

  useEffect(() => {
    setCustomBoards(loadCustomBoards())
    setSavedItems(loadSavedItems())
  }, [])

  // Per-turn document snapshots (message id → frozen state) and the turn the
  // user is currently previewing on the canvas (null = live/current version).
  const versionSnapshotsRef = useRef<Record<string, VersionSnapshot>>({})
  // Bumped whenever the snapshot map changes (capture or restore) so the persist
  // effect re-runs and consumers re-evaluate `hasVersionSnapshot`.
  const [snapshotVersion, setSnapshotVersion] = useState(0)
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([])
  const documentVersionsRef = useRef<DocumentVersion[]>([])
  const pendingDocumentVersionRef = useRef<DocumentVersionMeta | null>(null)
  const restoringDocumentRef = useRef(false)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)
  const previewVersionIdRef = useRef<string | null>(null)

  useEffect(() => {
    previewVersionIdRef.current = previewVersionId
  }, [previewVersionId])

  useEffect(() => {
    documentVersionsRef.current = documentVersions
  }, [documentVersions])

  const closeVersionHistoryPreview = useCallback(() => {
    const previewId = previewVersionIdRef.current
    if (
      previewId &&
      documentVersionsRef.current.some((version) => version.id === previewId)
    ) {
      setPreviewVersionId(null)
    }
  }, [])

  useEffect(() => {
    return () => {
      discardComposerDraft(composerDraftRef.current)
    }
  }, [])

  // Transient confirmation toast shown just above the composer (e.g. after
  // submitting answer feedback). Auto-clears.
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const feedbackToastTimerRef = useRef<number | null>(null)
  const [canvasToast, setCanvasToast] = useState<string | null>(null)
  const canvasToastTimerRef = useRef<number | null>(null)

  const placedElementCounterRef = useRef(0)
  /** Opens the inspector after the dropped element commits to the canvas. */
  const pendingPlacedInspectRef = useRef<PlacedElement | null>(null)
  const documentActionGateRef = useRef<DocumentActionGate>({ busy: false })
  const inspectingLayerRef = useRef<string | null>(null)

  useEffect(() => {
    inspectingLayerRef.current = inspectingLayer
  }, [inspectingLayer])
  const historyPastRef = useRef<BuilderHistorySnapshot[]>([])
  const historyFutureRef = useRef<BuilderHistorySnapshot[]>([])
  const applyingHistoryRef = useRef(false)
  const generatedLayoutRef = useRef<GeneratedLayout | null>(null)
  const committedLayoutRef = useRef<GeneratedLayout | null>(null)
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
    baseLayout: null,
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
  const [referenceAnalysis, setReferenceAnalysis] =
    useState<ReferenceAnalysis | null>(null)
  const [compareWithReference, setCompareWithReference] = useState(false)
  const compareWithReferenceRef = useRef(false)
  compareWithReferenceRef.current = compareWithReference
  const documentMutationsLocked = () =>
    documentMutationsLockedState({
      previewingVersion: Boolean(previewVersionIdRef.current),
      compareWithReference: compareWithReferenceRef.current,
    })
  const [questions, setQuestions] = useState<AiQuestion[]>([])
  const [clarificationAskedCount, setClarificationAskedCount] = useState(0)
  const [clarificationAskableCount, setClarificationAskableCount] = useState(0)
  const [clarificationSurface, setClarificationSurface] =
    useState<ClarificationSurface>("global")
  const [clarificationTargetId, setClarificationTargetId] = useState<
    string | null
  >(null)
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
  const pendingAskableCountRef = useRef(0)
  const clarificationResolvedRef = useRef<ResolvedDecision[]>([])
  const clarificationAskedRef = useRef(0)
  const clarificationRoundRef = useRef(0)
  const clarificationPromptRef = useRef("")
  const clarificationSurfaceRef = useRef<ClarificationSurface>("global")
  const clarificationTargetIdRef = useRef<string | null>(null)
  const referenceUrlsRef = useRef<string[]>([])
  const initializedRef = useRef(false)
  const captureAppliedRef = useRef(false)

  useLayoutEffect(() => {
    const request = readPortfolioCaptureRequest()
    if (!request) {
      captureAppliedRef.current = false
      syncCaptureDom(null)
      return
    }
    activatePortfolioCapture(request)
    const blueprint = getCaptureBlueprint(request.state)
    const applied = captureAppliedRef.current
    const ready = isIntendedCaptureMounted({
      applied,
      live: request.live,
      status,
      stillStatus: blueprint.stillStatus,
      liveKickoff: request.live ? blueprint.liveKickoff : "none",
    })
    syncCaptureDom(request, { status, applied, ready })
  }, [status])

  useEffect(() => {
    documentStateRef.current = {
      layoutEdits,
      layerText,
      layerStyles,
      hiddenLayers,
      layerDuplicates,
      placedElements,
      codeOverride,
      baseLayout,
    }
  }, [
    layoutEdits,
    layerText,
    layerStyles,
    hiddenLayers,
    layerDuplicates,
    placedElements,
    codeOverride,
    baseLayout,
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
      const inspected = inspectingLayerRef.current
      const matchesInspect = (element: PlacedElement) =>
        element.id === inspected || element.label === inspected
      const wasPlaced = inspected
        ? documentStateRef.current.placedElements.some(matchesInspect)
        : false
      applyingHistoryRef.current = true
      setLayoutEdits(snapshot.layoutEdits)
      setLayerTextState(snapshot.layerText)
      setLayerStyles(snapshot.layerStyles)
      setHiddenLayers(snapshot.hiddenLayers)
      setLayerDuplicates(snapshot.layerDuplicates)
      setPlacedElements(snapshot.placedElements)
      setCodeOverrideState(snapshot.codeOverride)
      setBaseLayout(snapshot.baseLayout ?? null)
      applyingHistoryRef.current = false
      if (
        inspected &&
        wasPlaced &&
        !snapshot.placedElements.some(matchesInspect)
      ) {
        setInspectingLayer(null)
        setInspectingLayerKind(null)
        setSelections((current) =>
          current.filter((selection) => selection.label !== inspected)
        )
      }
    },
    []
  )

  const pushHistory = useCallback(
    (
      frozenBase?: GeneratedLayout,
      version: DocumentVersionMeta | false = { origin: "manual" }
    ) => {
      if (applyingHistoryRef.current) {
        return
      }
      if (compareWithReferenceRef.current) {
        return
      }
      if (
        previewVersionIdRef.current &&
        !restoringDocumentRef.current
      ) {
        return
      }

      // Any edit that records history is an unsaved change.
      setHasUnsavedChanges(true)

      const snapshot = cloneHistorySnapshot(documentStateRef.current)
      if (frozenBase) {
        snapshot.baseLayout = structuredClone(frozenBase)
      }
      historyPastRef.current.push(snapshot)
      if (historyPastRef.current.length > HISTORY_LIMIT) {
        historyPastRef.current.shift()
      }
      historyFutureRef.current = []
      syncHistoryFlags()
      if (version !== false && !pendingDocumentVersionRef.current) {
        pendingDocumentVersionRef.current = version
      }
    },
    [syncHistoryFlags]
  )

  const undo = useCallback(() => {
    if (documentMutationsLocked()) {
      return
    }
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
    if (documentMutationsLocked()) {
      return
    }
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

  // First generation invalidates edit history. Follow-up AI actions keep the
  // snapshot recorded at send so one undo reverts the whole mutation.
  useEffect(() => {
    if (status === "reasoning" || status === "thinking") {
      if (!hasGeneratedOnce) {
        clearHistory()
      }
      setHasUnsavedChanges(true)
    }
  }, [status, clearHistory, hasGeneratedOnce])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [undo, redo])

  const startThinking = useCallback(() => {
    thinkingStartedAtRef.current = Date.now()
    setThoughtDurationSec(null)
    setStatus("thinking")
  }, [])

  // Kicks off the brief reasoning pass. `pending` holds the questions to ask
  // afterwards (or null to go straight to generation once reasoning settles).
  const startReasoning = useCallback((pending: AiQuestion[] | null, askableCount = 0) => {
    pendingQuestionsRef.current = pending && pending.length > 0 ? pending : null
    pendingAskableCountRef.current =
      pending && pending.length > 0 ? askableCount : 0
    reasoningStartedAtRef.current = Date.now()
    setPreThoughtDurationSec(null)
    setPreReasoning(null)
    setThoughtDurationSec(null)
    setStatus("reasoning")
  }, [])

  const presentClarification = useCallback(
    (pending: AiQuestion[], askableCount: number) => {
      setQuestions(pending)
      setClarificationAskedCount(clarificationAskedRef.current)
      setClarificationAskableCount(askableCount)
    },
    []
  )

  // After a couple of seconds of "thinking", either surface clarifying
  // questions or move straight into generation.
  useEffect(() => {
    if (status !== "reasoning") {
      return
    }
    if (shouldSkipSimulatedTimers()) {
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
        setPreReasoning(
          buildReasoning(prompt, {
            ...narrativeRequestFromTurn(messages, mediumId, answers),
            phase: "interpret",
          })
        )
        presentClarification(pending, pendingAskableCountRef.current)
        setStatus("asking")
      } else {
        startThinking()
      }
    }, getReasoningDelayMs(REASONING_MS))

    return () => window.clearTimeout(timer)
  }, [status, startThinking, messages, mediumId, answers, presentClarification])

  // Drives the simulated generation latency. Owning the timer in an effect keyed
  // on `status` keeps it resilient to Strict Mode's mount/cleanup/mount cycle.
  useEffect(() => {
    if (status !== "thinking") {
      return
    }
    if (shouldSkipSimulatedTimers()) {
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
    }, getThinkingDelayMs(SIMULATED_THINKING_MS))

    return () => window.clearTimeout(timer)
  }, [status])

  // Tick the plan forward while generating; complete it once ready.
  useEffect(() => {
    const labels = buildTodoLabels(
      narrativeRequestFromTurn(messages, mediumId, answers)
    )

    if (status === "ready") {
      setCompletedTodoCount(labels.length)
      return
    }

    // No plan while idle or gathering answers.
    if (status !== "thinking") {
      return
    }

    if (shouldSkipSimulatedTimers()) {
      return
    }

    setCompletedTodoCount(0)
    const interval = window.setInterval(() => {
      setCompletedTodoCount((current) =>
        current < labels.length - 1 ? current + 1 : current
      )
    }, getThinkingDelayMs(SIMULATED_THINKING_MS) / (labels.length + 1))

    return () => window.clearInterval(interval)
  }, [messages, status, mediumId, answers])

  // Seed the session from the prompt the user submitted on the list page.
  useEffect(() => {
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    const captureRequest = readPortfolioCaptureRequest()
    if (captureRequest) {
      activatePortfolioCapture(captureRequest)
      syncCaptureDom(captureRequest)
      const blueprint = getCaptureBlueprint(captureRequest.state)
      primeCaptureMessageCounter(blueprint.lastMessageIndex)

      setName(DEFAULT_LAYOUT_NAME)
      setDraftName(DEFAULT_LAYOUT_NAME)
      setMediumId(getDefaultBuilderMediumId())
      setModelId(null)
      setDocumentType(BUILDER_DOCUMENT_TYPES[0])
      setIsBlankSession(blueprint.isBlankSession)
      setMessages(blueprint.messages)
      setAnswers(null)
      setReceivedAnswers(null)
      setLayoutEdits({})
      setLayerTextState(
        blueprint.inspectingLayer === "Business name"
          ? { "Business name": "Your Business" }
          : {}
      )
      setLayerStyles({})
      setHiddenLayers([])
      setLayerDuplicates({})
      setPlacedElements([])
      setCodeOverrideState(blueprint.codeOverride)
      setCodeOpen(blueprint.codeOpen)
      setPreviewOpen(blueprint.previewOpen)
      setEditMode(blueprint.editMode)
      setInspectingLayer(blueprint.inspectingLayer)
      setInspectingLayerKind(blueprint.inspectingLayerKind)
      setSelections(blueprint.selections)
      setAiEditingLayer(blueprint.aiEditingLayer)
      setPreviewSourceId(blueprint.previewSourceId)
      setEditsTab(blueprint.editsTab)
      setAddingElement(false)
      setPanelOpen(true)
      setHasUnsavedChanges(!blueprint.isBlankSession)
      setCompletedTodoCount(blueprint.completedTodoCount)
      versionSnapshotsRef.current = {}
      setDocumentVersions([])
      documentVersionsRef.current = []
      pendingDocumentVersionRef.current = null
      captureAppliedRef.current = true

      const liveKickoff =
        captureRequest.live ? blueprint.liveKickoff : "none"
      const hasGeneratedOnce =
        liveKickoff === "initial-generation" ? false : blueprint.hasGeneratedOnce
      setHasGeneratedOnce(hasGeneratedOnce)

      if (liveKickoff === "none") {
        setThoughtDurationSec(blueprint.thoughtDurationSec)
        setPreThoughtDurationSec(blueprint.preThoughtDurationSec)
        if (blueprint.stillStatus === "asking") {
          const planned = questionsForPrompt(blueprint.seedPrompt, {
            generatedOnce: false,
          })
          pendingQuestionsRef.current = planned.questions
          pendingAskableCountRef.current = planned.askableCount
          clarificationResolvedRef.current = planned.resolved
          setQuestions(planned.questions ?? [])
          setClarificationAskedCount(0)
          setClarificationAskableCount(planned.askableCount)
          setPreReasoning(
            buildReasoning(blueprint.seedPrompt, {
              phase: "interpret",
              paperName: getMediumName(getDefaultBuilderMediumId()),
            })
          )
          setPreThoughtDurationSec(blueprint.preThoughtDurationSec)
        } else {
          setQuestions([])
          setPreReasoning(null)
        }
        if (blueprint.stillStatus === "thinking") {
          thinkingStartedAtRef.current = Date.now()
        }
        setStatus(blueprint.stillStatus)
      } else if (liveKickoff === "initial-generation") {
        setThoughtDurationSec(null)
        setPreThoughtDurationSec(null)
        setPreReasoning(null)
        const kickoffPlan = questionsForPrompt(blueprint.seedPrompt, {
          generatedOnce: false,
        })
        startReasoning(kickoffPlan.questions, kickoffPlan.askableCount)
      } else {
        const lastUser = [...blueprint.messages]
          .reverse()
          .find((message) => message.role === "user")
        setThoughtDurationSec(null)
        setPreThoughtDurationSec(null)
        setPreReasoning(null)
        const followPlan = questionsForPrompt(lastUser?.text ?? "", {
          generatedOnce: true,
        })
        startReasoning(followPlan.questions, followPlan.askableCount)
      }
      return
    }

    syncCaptureDom(null)

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
      clarificationResolvedRef.current = answersToDecisions(saved.answers ?? null)
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
      setCatalogId(saved.catalogId ?? null)
      catalogIdRef.current = saved.catalogId ?? null
      setHasUnsavedChanges(saved.hasUnsavedChanges ?? false)
      // Restore per-turn snapshots so the eye/undo controls on earlier turns
      // keep working after a reload (they live in a ref, lost on refresh).
      versionSnapshotsRef.current = saved.versionSnapshots ?? {}
      const restoredVersions = Array.isArray(saved.documentVersions)
        ? saved.documentVersions
        : []
      syncDocumentVersionIdCounter(restoredVersions)
      documentVersionsRef.current = restoredVersions
      setDocumentVersions(restoredVersions)
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
    // element. The chosen medium comes from the dashboard picker modal.
    const blankMediumId = consumePendingBlank()
    if (blankMediumId) {
      setIsBlankSession(true)
      setMediumId(blankMediumId)
      setCatalogId(null)
      catalogIdRef.current = null
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
      setCatalogId(editSeed.layoutId)
      catalogIdRef.current = editSeed.layoutId
      setAnswers(session.answers)
      clarificationResolvedRef.current = answersToDecisions(session.answers)
      setThoughtDurationSec(session.durationSec)

      const stored =
        catalog?.getRecord(editSeed.layoutId) ??
        loadSavedLayoutRecords().find((record) => record.row.id === editSeed.layoutId) ??
        null

      if (stored) {
        setBaseLayout(stored.document.generatedLayout)
        setLayoutEdits(stored.document.layoutEdits)
        setLayerTextState(stored.document.layerText)
        setLayerStyles(stored.document.layerStyles)
        setHiddenLayers(stored.document.hiddenLayers)
        setLayerDuplicates(stored.document.layerDuplicates)
        setPlacedElements(stored.document.placedElements)
        setCodeOverrideState(stored.document.codeOverride)
        setHasUnsavedChanges(false)
      } else {
        setLayoutEdits({ businessName: session.businessName })
      }

      // Rebuild the original turn so the transcript reads exactly like the
      // session that produced this layout: prompt → clarifying answers →
      // reasoning → completed plan → recap. Seeding both messages means the
      // ready-effect leaves the history untouched (no duplicate turn).
      const restoredLayout: GeneratedLayout = stored
        ? stored.document.generatedLayout
        : {
            ...deriveLayout(session.prompt, session.answers, editSeed.documentType),
            businessName: session.businessName,
          }
      const receivedEditAnswers = formatReceivedAnswers(
        [
          {
            id: "style",
            type: "single-select",
            prompt: "What should it feel like?",
            options: [
              {
                id:
                  typeof session.answers.style === "string"
                    ? session.answers.style
                    : "studio",
                label:
                  typeof session.answers.style === "string"
                    ? session.answers.style
                    : "studio",
              },
            ],
          },
        ],
        session.answers
      )
      const completedTodos: AiTodoItem[] = buildTodoLabels({
        prompt: session.prompt,
        family:
          typeof session.answers.style === "string"
            ? session.answers.style
            : undefined,
        paperName: editSeed.mediumId
          ? getMediumName(editSeed.mediumId)
          : "A4",
      }).map((label, index) => ({
        id: `builder-todo-${index}`,
        label,
        status: "done",
      }))

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
          preReasoning: buildReasoning(session.gist, {
            phase: "interpret",
            family: restoredLayout.style,
            paperName: editSeed.mediumId
              ? getMediumName(editSeed.mediumId)
              : "A4",
          }),
          preDurationSec: session.preDurationSec,
          reasoning: buildPostReasoning(session.gist, receivedEditAnswers, {
            family: restoredLayout.style,
            paperName: editSeed.mediumId
              ? getMediumName(editSeed.mediumId)
              : "A4",
          }),
          durationSec: session.durationSec,
          todos: completedTodos,
          summary: buildCompletionSummary(restoredLayout, {
            prompt: session.prompt,
            paperName: editSeed.mediumId
              ? getMediumName(editSeed.mediumId)
              : "A4",
          }),
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

    setCatalogId(null)
    catalogIdRef.current = null
    setMediumId(seed.mediumId)
    setModelId(seed.modelId)
    referenceUrlsRef.current = seed.references.map((ref) => ref.previewUrl)
    setReferenceAnalysis(seed.referenceAnalysis ?? null)
    setCompareWithReference(false)

    const text = resolveBuilderGenerationPrompt(seed.prompt, {
      generatedOnce: false,
      hasImageReference: seed.references.length > 0,
    })

    const creationAttachments =
      seed.attachments && seed.attachments.length > 0
        ? seed.attachments
        : seed.references.map((reference) => ({
            id: reference.id,
            name: reference.name,
            mimeType: "image/*",
            kind: "image" as const,
            previewUrl: reference.previewUrl,
          }))

    setMessages([
      {
        id: nextMessageId(),
        role: "user",
        text,
        references: seed.references,
        attachments: creationAttachments,
        primaryReferenceId:
          seed.primaryReferenceId ?? seed.references[0]?.id ?? null,
      },
    ])

    // Think first, then clarify only the gaps the prompt left open — a detailed
    // brief (or a reference image) goes straight to generation.
    const planned = questionsForPrompt(seed.prompt, {
      hasReference: seed.references.length > 0,
      generatedOnce: false,
    })
    clarificationResolvedRef.current = planned.resolved
    clarificationAskedRef.current = 0
    clarificationRoundRef.current = 0
    clarificationPromptRef.current = seed.prompt
    startReasoning(planned.questions, planned.askableCount)
  }, [
    consumePendingGeneration,
    consumePendingEdit,
    consumePendingBlank,
    startReasoning,
    catalog,
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
    if (!shouldPersistBuilderSession()) {
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
      messages: messages.map((message) =>
        message.role === "user" ? persistableUserMessage(message) : message
      ),
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
      catalogId,
      versionSnapshots: versionSnapshotsRef.current,
      documentVersions: persistableDocumentVersions(documentVersions),
    }
    const persist = (payload: PersistedBuilderSession) => {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
    }
    try {
      persist(snapshot)
    } catch {
      try {
        persist({
          ...snapshot,
          documentVersions: persistableDocumentVersions(
            documentVersions.slice(-8)
          ),
        })
      } catch {
        try {
          persist({ ...snapshot, documentVersions: [] })
        } catch {
          // Storage full / unavailable — persistence is best-effort.
        }
      }
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
    catalogId,
    snapshotVersion,
    documentVersions,
  ])

  const focusPrompt = useCallback(() => {
    // Bring the AI composer forward: open the panel and dismiss whatever else is
    // occupying it (Add elements palette / Visual edits inspector), mirroring how
    // `openAddElements` surfaces the palette. Then focus the prompt input.
    setPanelOpen(true)
    setAddingElement(false)
    setBrowsingSavedItems(false)
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
        // Fresh edit session — no stale inspector or selection chips.
        setInspectingLayer(null)
        setInspectingLayerKind(null)
        setSelections([])
      } else {
        setInspectingLayer(null)
        setInspectingLayerKind(null)
        setSelections([])
      }
      return next
    })
  }, [codeOverride])

  /** Enter visual edit mode without clearing the current inspector selection. */
  const enterEditMode = useCallback(
    (options?: { keepAddElements?: boolean }) => {
      if (codeOverride !== null) {
        return
      }
      setPreviewOpen(true)
      setEditMode(true)
      if (!options?.keepAddElements) {
        setAddingElement(false)
      }
    },
    [codeOverride]
  )

  // Detaching snapshots the current generated code as the editable buffer and
  // tears down structured-edit affordances so the two models can't silently
  // diverge while the user edits raw code.
  const detachCode = useCallback((code: string) => {
    if (documentMutationsLocked()) {
      return
    }
    pushHistory(undefined, { origin: "code" })
    setCodeOverrideState(code)
    setEditMode(false)
    setInspectingLayer(null)
    setAddingElement(false)
    setBrowsingSavedItems(false)
    setSelections([])
    setCodeOpen(true)
  }, [pushHistory])

  const updateCodeOverride = useCallback((code: string) => {
    if (documentMutationsLocked()) {
      return
    }
    if (!applyingHistoryRef.current) {
      if (!codeEditSessionRef.current) {
        pushHistory(undefined, false)
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
    if (documentMutationsLocked()) {
      return
    }
    pushHistory(undefined, { origin: "code", target: "Revert" })
    setCodeOverrideState(null)
  }, [pushHistory])

  const [codeVersionCommit, setCodeVersionCommit] = useState(0)
  const commitCodeOverrideVersion = useCallback(() => {
    if (documentMutationsLocked()) {
      return
    }
    if (documentStateRef.current.codeOverride === null) {
      return
    }
    pendingDocumentVersionRef.current = { origin: "code" }
    setCodeVersionCommit((value) => value + 1)
  }, [])

  const updateLayout = useCallback((patch: Partial<GeneratedLayout>) => {
    if (documentMutationsLocked()) {
      return
    }
    pushHistory()
    setLayoutEdits((current) => ({ ...current, ...patch }))
  }, [pushHistory])

  // Single-selection: picking a layer replaces any existing chip so only one
  // element is ever attached to the composer at a time.
  const addSelection = useCallback((label: string, inspectKey = label) => {
    setSelections((current) => {
      if (
        current.length === 1 &&
        current[0].label === label &&
        (current[0].layer ?? current[0].label) === inspectKey
      ) {
        return current
      }
      return [{ id: nextMessageId(), label, layer: inspectKey }]
    })
  }, [])

  const removeSelection = useCallback((id: string) => {
    setSelections((current) => {
      const removed = current.find((selection) => selection.id === id)
      if (removed) {
        // Closing the chip for the inspected layer also closes its inspector.
        setInspectingLayer((open) =>
          open === removed.label || open === removed.layer ? null : open
        )
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
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, {
        origin: "manual-text",
        target: documentVersionTarget(label),
      })
      setLayerTextState((current) => ({ ...current, [label]: value }))
      setPlacedElements((current) => {
        const matchesId = current.some((element) => element.id === label)
        return current.map((element) => {
          const match = matchesId
            ? element.id === label
            : element.label === label
          return match ? { ...element, content: value } : element
        })
      })
    },
    [pushHistory]
  )

  const setLayerStyle = useCallback(
    (label: string, patch: Partial<BuilderLayerStyle>) => {
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, {
        origin: "manual-style",
        target: documentVersionTarget(label),
      })
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
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, {
        origin: "duplicate",
        target: documentVersionTarget(label),
      })
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
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, {
        origin: "delete",
        target: documentVersionTarget(label),
      })
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

  // Element clipboard: copying captures the layer's content + style overrides
  // (or just the style), which in turn enables the paste actions in the menu.
  const copyLayer = useCallback(
    (label: string) => {
      setCopiedLayer({
        content: layerText[label] ?? "",
        style: { ...(layerStyles[label] ?? {}) },
      })
    },
    [layerText, layerStyles]
  )

  const copyLayerProperties = useCallback(
    (label: string) => {
      setCopiedProperties({ ...(layerStyles[label] ?? {}) })
    },
    [layerStyles]
  )

  const pasteToReplace = useCallback(
    (label: string) => {
      if (!copiedLayer || documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, { origin: "manual" })
      setLayerTextState((current) => ({
        ...current,
        [label]: copiedLayer.content,
      }))
      setLayerStyles((current) => ({
        ...current,
        [label]: { ...copiedLayer.style },
      }))
    },
    [copiedLayer, pushHistory]
  )

  // "Paste after" inserts a copy of the layer directly after it (the closest
  // structural match to inserting the clipboard's element in the next slot).
  const pasteAfter = useCallback(
    (label: string) => {
      if (!copiedLayer || documentMutationsLocked()) {
        return
      }
      duplicateLayer(label)
    },
    [copiedLayer, duplicateLayer]
  )

  const pasteLayerProperties = useCallback(
    (label: string) => {
      if (!copiedProperties || documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, { origin: "manual" })
      setLayerStyles((current) => ({
        ...current,
        [label]: { ...current[label], ...copiedProperties },
      }))
    },
    [copiedProperties, pushHistory]
  )

  // Reorder bridge — sections register their up/down handlers here so the
  // inspector menu can drive the same reordering as the on-canvas grips.
  const registerLayerMover = useCallback(
    (
      label: string,
      mover:
        | { canUp: boolean; canDown: boolean; up: () => void; down: () => void }
        | null
    ) => {
      const prev = layerMoversRef.current[label]
      if (mover) {
        layerMoversRef.current[label] = mover
        // Only force a re-read when availability actually changes (the handler
        // identities churn every render and must not trigger update loops).
        if (
          !prev ||
          prev.canUp !== mover.canUp ||
          prev.canDown !== mover.canDown
        ) {
          setMoverVersion((value) => value + 1)
        }
      } else if (prev) {
        delete layerMoversRef.current[label]
        setMoverVersion((value) => value + 1)
      }
    },
    []
  )

  const canMoveLayer = useCallback(
    (label: string, direction: "up" | "down") => {
      const mover = layerMoversRef.current[label]
      if (!mover) {
        return false
      }
      return direction === "up" ? mover.canUp : mover.canDown
    },
    // `moverVersion` is the cache-buster: re-derive when availability changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moverVersion]
  )

  const moveLayer = useCallback((label: string, direction: "up" | "down") => {
    if (documentMutationsLocked()) {
      return
    }
    const mover = layerMoversRef.current[label]
    if (!mover) {
      return
    }
    if (direction === "up") {
      mover.up()
    } else {
      mover.down()
    }
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
    (label: string) => isHiddenLayer(hiddenLayers, label),
    [hiddenLayers]
  )

  const layerDuplicateCount = useCallback(
    (label: string) => {
      for (const key of compatibilityKeys(label)) {
        const count = layerDuplicates[key]
        if (count) {
          return count
        }
      }
      return 0
    },
    [layerDuplicates]
  )

  const inspectLayer = useCallback(
    (label: string | null, kind: BuilderLayerKind = "text") => {
      setInspectingLayer(label)
      setInspectingLayerKind(label === null ? null : kind)
      if (label === null) {
        setInspectingDisplayLabel(null)
        return
      }
      const placed = placedElements.find(
        (element) => element.id === label || element.label === label
      )
      const authoredKey = placed ? undefined : authoredKeyFromId(label)
      setInspectingDisplayLabel(placed?.label ?? displayLabelForSlot(authoredKey ?? label))
      const groups = inspectorPropertyGroups({
        layerId: label,
        authoredKey,
        kind,
        placed,
      })
      setEditsTab(effectiveInspectorTab("style", groups))
      setAddingElement(false)
    },
    [placedElements]
  )

  const selectLayer = useCallback(
    (
      label: string,
      kind: BuilderLayerKind = "container",
      options?: {
        keepAddElements?: boolean
        tab?: "content" | "style" | "advanced"
        chipLabel?: string
        authoredKey?: string
      }
    ) => {
      addSelection(options?.chipLabel ?? label, label)
      setInspectingLayer(label)
      inspectingLayerRef.current = label
      setInspectingLayerKind(kind)
      const placed = placedElements.find(
        (element) => element.id === label || element.label === label
      )
      const authoredKey = options?.authoredKey ?? (placed ? undefined : authoredKeyFromId(label))
      setInspectingDisplayLabel(
        options?.chipLabel ?? placed?.label ?? displayLabelForSlot(authoredKey ?? label)
      )
      const groups = inspectorPropertyGroups({
        layerId: label,
        authoredKey,
        kind,
        placed,
      })
      setEditsTab(
        effectiveInspectorTab(options?.tab ?? "style", groups)
      )
      if (!options?.keepAddElements) {
        setAddingElement(false)
      }
    },
    [addSelection, placedElements]
  )

  // Opening the add-elements palette takes over the left panel, so make sure the
  // panel is visible. The inspector overlay is an independent surface and stays
  // open until the user closes it, so we deliberately leave it untouched here.
  const openAddElements = useCallback((options?: { revealSaved?: boolean }) => {
    setPanelOpen(true)
    setBrowsingBrand(false)
    setBrowsingSavedItems(false)
    setBrowsingVersionHistory(false)
    closeVersionHistoryPreview()
    setBrandDraft(null)
    setAddingElement(true)
    setRevealSavedItems(Boolean(options?.revealSaved))
  }, [closeVersionHistoryPreview])

  const closeAddElements = useCallback(() => {
    setAddingElement(false)
    setRevealSavedItems(false)
  }, [])

  const openSavedItems = useCallback(() => {
    setPanelOpen(true)
    setAddingElement(false)
    setRevealSavedItems(false)
    setBrowsingBrand(false)
    setBrowsingVersionHistory(false)
    closeVersionHistoryPreview()
    setBrandDraft(null)
    setBrowsingSavedItems(true)
  }, [closeVersionHistoryPreview])

  const closeSavedItems = useCallback(() => {
    setBrowsingSavedItems(false)
  }, [])

  const brandCatalog = useMemo(
    () => (unsavedBoard ? [unsavedBoard, ...customBoards] : customBoards),
    [customBoards, unsavedBoard]
  )

  const openBrandBoards = useCallback(() => {
    setPanelOpen(true)
    setAddingElement(false)
    setBrowsingSavedItems(false)
    setRevealSavedItems(false)
    setBrowsingVersionHistory(false)
    closeVersionHistoryPreview()
    setBrowsingBrand(true)
  }, [closeVersionHistoryPreview])

  const closeBrandBoards = useCallback(() => {
    setBrandDraft(null)
    setUnsavedBoard(null)
    setBrowsingBrand(false)
  }, [])

  const openVersionHistory = useCallback(() => {
    setPanelOpen(true)
    setAddingElement(false)
    setRevealSavedItems(false)
    setBrowsingSavedItems(false)
    setBrowsingBrand(false)
    setBrandDraft(null)
    setBrowsingVersionHistory(true)
  }, [])

  const closeVersionHistory = useCallback(() => {
    setBrowsingVersionHistory(false)
    closeVersionHistoryPreview()
  }, [closeVersionHistoryPreview])

  const cancelBrandPreview = useCallback(() => {
    setBrandDraft(null)
    setUnsavedBoard(null)
  }, [])

  const previewBrandSelection = useCallback((selection: BrandSelection) => {
    setUnsavedBoard(null)
    setBrandDraft(selection)
  }, [])

  const previewUnsavedBoard = useCallback((board: BrandBoard) => {
    setUnsavedBoard(board)
    setBrandDraft(selectionFromBoard(board))
  }, [])

  const applyBrandSelection = useCallback(() => {
    if (!brandDraft || documentMutationsLocked()) {
      return
    }
    let catalog = brandCatalog
    if (unsavedBoard && brandDraft.boardId === unsavedBoard.id) {
      setCustomBoards((current) => {
        const next = current.some((entry) => entry.id === unsavedBoard.id)
          ? current.map((entry) =>
              entry.id === unsavedBoard.id ? unsavedBoard : entry
            )
          : [...current, unsavedBoard]
        saveCustomBoards(next)
        return next
      })
      catalog = [
        unsavedBoard,
        ...customBoards.filter((board) => board.id !== unsavedBoard.id),
      ]
    }
    const committed = committedLayoutRef.current ?? generatedLayoutRef.current
    if (committed && isBrandApplyNoop(committed, brandDraft, catalog)) {
      setBrandDraft(null)
      setUnsavedBoard(null)
      return
    }
    pushHistory(undefined, { origin: "brand" })
    const family = normalizeLayoutStyle(committed?.style ?? "studio")
    const patch = brandLayoutEditsFromSelection(family, brandDraft, catalog)
    setLayoutEdits((current) => ({
      ...current,
      ...patch,
    }))
    setBrandDraft(null)
    setUnsavedBoard(null)
  }, [brandCatalog, brandDraft, customBoards, pushHistory, unsavedBoard])

  const upsertCustomBoard = useCallback(
    (board: BrandBoard, apply: boolean) => {
      setCustomBoards((current) => {
        const next = current.some((entry) => entry.id === board.id)
          ? current.map((entry) => (entry.id === board.id ? board : entry))
          : [...current, board]
        saveCustomBoards(next)
        return next
      })
      const selection = {
        boardId: board.id,
        themeId: board.themeId,
        typeId: board.typeId,
      }
      if (apply) {
        const catalog = [
          board,
          ...customBoards.filter((entry) => entry.id !== board.id),
        ]
        const committed = committedLayoutRef.current ?? generatedLayoutRef.current
        if (committed && isBrandApplyNoop(committed, selection, catalog)) {
          setBrandDraft(null)
          setUnsavedBoard(null)
        } else {
          pushHistory(undefined, { origin: "brand" })
          const family = normalizeLayoutStyle(committed?.style ?? "studio")
          const patch = brandLayoutEditsFromSelection(family, selection, catalog)
          setLayoutEdits((current) => ({
            ...current,
            ...patch,
          }))
          setBrandDraft(null)
          setUnsavedBoard(null)
        }
      } else {
        setBrandDraft(selection)
      }
    },
    [customBoards, pushHistory]
  )

  const removeCustomBoard = useCallback(
    (id: string) => {
      if (documentMutationsLocked()) {
        return
      }
      setCustomBoards((current) => {
        const next = current.filter((board) => board.id !== id)
        saveCustomBoards(next)
        return next
      })
      const applied = generatedLayoutRef.current?.brand
      if (applied?.boardId === id) {
        pushHistory(undefined, { origin: "brand" })
        setLayoutEdits((current) => {
          const next = { ...current }
          delete next.brand
          return next
        })
      }
      if (brandDraft?.boardId === id) {
        setBrandDraft(null)
      }
    },
    [brandDraft, pushHistory]
  )

  const updatePlacedElementContent = useCallback(
    (id: string, content: string) => {
      if (documentMutationsLocked()) {
        return
      }
      const target = documentStateRef.current.placedElements.find(
        (element) => element.id === id
      )
      pushHistory(undefined, {
        origin: "manual-text",
        target: target?.label ?? id,
      })
      setPlacedElements((current) =>
        current.map((element) =>
          element.id === id ? { ...element, content } : element
        )
      )
      if (target) {
        setLayerTextState((current) => ({ ...current, [id]: content }))
      }
    },
    [pushHistory]
  )

  const updatePlacedElement = useCallback(
    (id: string, patch: Partial<PlacedElement>) => {
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, { origin: "manual" })
      setPlacedElements((current) =>
        current.map((element) =>
          element.id === id ? { ...element, ...patch } : element
        )
      )
    },
    [pushHistory]
  )

  const removePlacedElement = useCallback(
    (id: string) => {
      if (documentMutationsLocked()) {
        return
      }
      const removed = placedElements.find((element) => element.id === id)
      pushHistory(undefined, {
        origin: "delete",
        target: removed?.label ?? id,
      })
      setPlacedElements((current) => removePlacedTree(current, id))
      if (removed && inspectingLayerRef.current === removed.label) {
        setInspectingLayer(null)
        setInspectingLayerKind(null)
        setSelections((current) =>
          current.filter((selection) => selection.label !== removed.label)
        )
      }
    },
    [placedElements, pushHistory]
  )

  const duplicatePlacedElement = useCallback(
    (id: string) => {
      const result = duplicatePlacedDocument(
        {
          placedElements: documentStateRef.current.placedElements,
          layerStyles: documentStateRef.current.layerStyles,
          layerText: documentStateRef.current.layerText,
        },
        id,
        () => {
          placedElementCounterRef.current += 1
          return `placed-${placedElementCounterRef.current}`
        }
      )
      if (!result.ok) {
        setCanvasToast(result.reason)
        return
      }
      pushHistory(undefined, {
        origin: "duplicate",
        target: result.root.label,
      })
      setLayerStyles(result.doc.layerStyles)
      setLayerTextState(result.doc.layerText)
      pendingPlacedInspectRef.current = result.root
    },
    [pushHistory]
  )

  const placedElementZonePosition = useCallback(
    (elements: PlacedElement[], id: string) => {
      const index = elements.findIndex((element) => element.id === id)
      if (index === -1) {
        return null
      }
      const zone = elements[index].zone
      const zoneIndices = elements
        .map((element, elementIndex) => ({ element, elementIndex }))
        .filter(({ element }) => element.zone === zone)
        .map(({ elementIndex }) => elementIndex)
      const indexInZone = zoneIndices.indexOf(index)
      if (indexInZone === -1) {
        return null
      }
      return { zoneIndices, indexInZone }
    },
    []
  )

  const canMovePlacedElement = useCallback(
    (id: string, direction: "up" | "down") => {
      const position = placedElementZonePosition(placedElements, id)
      if (!position) {
        return false
      }
      const { zoneIndices, indexInZone } = position
      return direction === "up"
        ? indexInZone > 0
        : indexInZone < zoneIndices.length - 1
    },
    [placedElementZonePosition, placedElements]
  )

  const movePlacedElement = useCallback(
    (id: string, direction: "up" | "down") => {
      pushHistory(undefined, { origin: "manual" })
      setPlacedElements((current) => {
        const position = placedElementZonePosition(current, id)
        if (!position) {
          return current
        }
        const { zoneIndices, indexInZone } = position
        const targetInZone =
          direction === "up" ? indexInZone - 1 : indexInZone + 1
        if (targetInZone < 0 || targetInZone >= zoneIndices.length) {
          return current
        }
        const index = zoneIndices[indexInZone]
        const otherIndex = zoneIndices[targetInZone]
        const next = [...current]
        ;[next[index], next[otherIndex]] = [next[otherIndex], next[index]]
        return next
      })
    },
    [placedElementZonePosition, pushHistory]
  )

  const seedLayer = useCallback(
    (label: string, seed: { content: string; style: BuilderLayerStyle }) => {
      if (!(label in layerBaselineRef.current)) {
        layerBaselineRef.current[label] = {
          content: seed.content,
          style: {},
        }
      }
      setLayerTextState((current) =>
        label in current ? current : { ...current, [label]: seed.content }
      )
    },
    []
  )

  const openPlacedElementInspector = useCallback(
    (element: PlacedElement) => {
      const keepToolPanel =
        messages.length === 0 || addingElement || browsingSavedItems
      enterEditMode({ keepAddElements: keepToolPanel })
      seedLayer(element.id, getPlacedElementSeed(element.kind, element.content))
      selectLayer(element.id, getPlacedElementLayerKind(element.kind), {
        keepAddElements: keepToolPanel,
        tab: inspectorTabForKind(element.kind),
        chipLabel: element.label,
      })
    },
    [addingElement, browsingSavedItems, enterEditMode, messages.length, selectLayer, seedLayer]
  )

  const openPageProperties = useCallback(() => {
    if (codeOverride !== null || documentMutationsLocked()) {
      return
    }
    enterEditMode()
    selectLayer(PAGE_LAYER_LABEL, "page")
  }, [codeOverride, enterEditMode, selectLayer])

  const addPlacedElement = useCallback(
    ({
      kind,
      label,
      zone,
      index,
      parentId,
      slot,
      dest,
    }: {
      kind: string
      label: string
      zone: PlacedElementZone
      index?: number
      parentId?: string
      slot?: number
      dest?: DropDest
    }) => {
      if (documentMutationsLocked()) {
        return
      }
      const drop = dest ?? (parentId
        ? {
            kind: "child" as const,
            parentId,
            parentKind:
              documentStateRef.current.placedElements.find(
                (element) => element.id === parentId
              )?.kind ?? "container",
            slot: slot ?? 0,
            index: index ?? Number.MAX_SAFE_INTEGER,
          }
        : undefined)

      if (kind === "table" && drop?.kind !== "child") {
        const live = generatedLayoutRef.current
        const resolution = resolveTableAdd({
          isBlankSession,
          itemsVisible: Boolean(live?.sections.items),
        })
        if (resolution.action === "select-existing") {
          setCanvasToast(resolution.message)
          enterEditMode()
          selectLayer("Items table", "container", { tab: "content" })
          return
        }
        if (resolution.action === "enable-items") {
          pushHistory(undefined, {
            origin: "insert",
            target: "Items table",
          })
          if (live?.sections) {
            setLayoutEdits((current) => ({
              ...current,
              sections: { ...live.sections, ...current.sections, items: true },
            }))
          }
          setCanvasToast(resolution.message)
          enterEditMode()
          selectLayer("Items table", "container", { tab: "content" })
          return
        }
      }

      if (kind === "table" && drop?.kind === "child") {
        setCanvasToast("Line items stay at the document level")
        return
      }
      if (drop?.kind === "child") {
        const parent = documentStateRef.current.placedElements.find(
          (element) => element.id === drop.parentId
        )
        if (parent && !canNestInside(kind, parent.kind)) {
          setCanvasToast("Containers and columns only accept one level of content")
          return
        }
      }

      pushHistory(undefined, {
        origin: "insert",
        target: label,
      })
      const id = `placed-${placedElementCounterRef.current}`

      const current = documentStateRef.current.placedElements
      const displayLabel = nextPlacedLabel(current, kind, label)
      const resolvedZone =
        drop?.kind === "root"
          ? drop.zone
          : drop?.kind === "child"
            ? (current.find((element) => element.id === drop.parentId)?.zone ?? zone)
            : zone
      const created: PlacedElement = {
        id,
        kind,
        label: displayLabel,
        zone: resolvedZone,
        content: getDefaultPlacedContent(kind),
        columns: defaultColumnContents(kind),
        href: kind === "button" ? "" : undefined,
        bindToLineItems: kind === "table",
        parentId: drop?.kind === "child" ? drop.parentId : undefined,
        slot: drop?.kind === "child" ? drop.slot : undefined,
      }

      if (created.bindToLineItems) {
        const live = generatedLayoutRef.current
        if (!live || live.lineItems.length === 0) {
          setLayoutEdits((edits) => ({
            ...edits,
            lineItems:
              edits.lineItems ??
              live?.lineItems ?? [
                { description: "Item name", qty: 1, rate: 0 },
              ],
          }))
        }
      }

      pendingPlacedInspectRef.current = created

      setPlacedElements((existing) => {
        if (drop?.kind === "child") {
          return insertChildAt(existing, created, drop)
        }
        if (drop?.kind === "root") {
          return insertRootAt(existing, created, drop)
        }
        return insertPlacedElement(existing, created, index)
      })
    },
    [enterEditMode, isBlankSession, pushHistory, selectLayer]
  )

  const nextPlacedElementId = useCallback(() => {
    placedElementCounterRef.current += 1
    return `placed-${placedElementCounterRef.current}`
  }, [])

  const applySavedSlice = useCallback(
    (slice: {
      placedElements: PlacedElement[]
      layerStyles: Record<string, BuilderLayerStyle>
      layerText: Record<string, string>
    }, root: PlacedElement) => {
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, { origin: "saved-item" })
      setLayerStyles(slice.layerStyles)
      setLayerTextState(slice.layerText)
      pendingPlacedInspectRef.current = root
      enterEditMode({
        keepAddElements:
          addingElement || browsingSavedItems || messages.length === 0,
      })
    },
    [addingElement, browsingSavedItems, enterEditMode, messages.length, pushHistory]
  )

  const insertSavedItem = useCallback(
    (id: string, dest?: DropDest) => {
      if (documentMutationsLocked()) {
        return
      }
      const item = savedItems.find((entry) => entry.id === id)
      if (!item) {
        return
      }
      const target =
        dest ??
        ({
          kind: "root",
          zone: "end",
          index: Number.MAX_SAFE_INTEGER,
        } as const)
      const result = insertSavedIntoDocument(
        {
          placedElements: documentStateRef.current.placedElements,
          layerStyles: documentStateRef.current.layerStyles,
          layerText: documentStateRef.current.layerText,
        },
        item.root,
        target,
        nextPlacedElementId
      )
      if (!result.ok) {
        setCanvasToast(result.reason)
        return
      }
      applySavedSlice(result.doc, result.root)
    },
    [applySavedSlice, nextPlacedElementId, savedItems]
  )

  const replaceAvailability = useCallback(
    (id: string) => {
      const item = savedItems.find((entry) => entry.id === id)
      if (!item) {
        return { ok: false as const, reason: "That saved item is no longer available." }
      }
      const target = findPlacedByInspectKey(
        documentStateRef.current.placedElements,
        inspectingLayer
      )
      return replaceAvailabilityFor(item.root, {
        inspectingKey: inspectingLayer,
        target,
        all: documentStateRef.current.placedElements,
      })
    },
    [inspectingLayer, placedElements, savedItems]
  )

  const replaceSelectedWithSavedItem = useCallback(
    (id: string) => {
      if (documentMutationsLocked()) {
        return
      }
      const item = savedItems.find((entry) => entry.id === id)
      if (!item) {
        return
      }
      const target = findPlacedByInspectKey(
        documentStateRef.current.placedElements,
        inspectingLayerRef.current
      )
      if (!target) {
        setCanvasToast("Select a placed block on the canvas to replace it.")
        return
      }
      const result = replaceSelectedWithSaved(
        {
          placedElements: documentStateRef.current.placedElements,
          layerStyles: documentStateRef.current.layerStyles,
          layerText: documentStateRef.current.layerText,
        },
        item.root,
        target.id,
        nextPlacedElementId
      )
      if (!result.ok) {
        setCanvasToast(result.reason)
        return
      }
      applySavedSlice(result.doc, result.root)
    },
    [applySavedSlice, nextPlacedElementId, savedItems]
  )

  const renameSavedItem = useCallback((id: string, name: string) => {
    setSavedItems((current) => {
      const next = renameSavedDefinition(current, id, name)
      persistSavedItems(next)
      return next
    })
  }, [])

  const duplicateSavedItem = useCallback((id: string) => {
    setSavedItems((current) => {
      const next = duplicateSavedDefinition(current, id)
      persistSavedItems(next)
      return next
    })
  }, [])

  const deleteSavedItem = useCallback((id: string) => {
    setSavedItems((current) => {
      const next = deleteSavedDefinition(current, id)
      persistSavedItems(next)
      return next
    })
  }, [])

  useEffect(() => {
    const pending = pendingPlacedInspectRef.current
    if (!pending) {
      return
    }
    if (!placedElements.some((element) => element.id === pending.id)) {
      return
    }
    pendingPlacedInspectRef.current = null
    openPlacedElementInspector(pending)
  }, [placedElements, openPlacedElementInspector])

  const beginElementDrag = useCallback(
    (
      session: Omit<ElementDragSession, "hoverKey" | "dest" | "overPaper">
    ) => {
      const next: ElementDragSession = {
        ...session,
        hoverKey: null,
        dest: null,
        overPaper: false,
      }
      elementDragRef.current = next
      setElementDrag(next)
      setPaletteDragging(true)
    },
    []
  )

  const updateElementDragPointer = useCallback(
    (patch: {
      x: number
      y: number
      hoverKey: string | null
      dest: DropDest | null
      overPaper: boolean
    }) => {
      setElementDrag((current) => {
        if (!current) {
          return current
        }
        const next = { ...current, ...patch }
        elementDragRef.current = next
        return next
      })
    },
    []
  )

  const cancelElementDrag = useCallback(() => {
    elementDragRef.current = null
    setElementDrag(null)
    setPaletteDragging(false)
  }, [])

  const relocatePlacedElement = useCallback(
    (id: string, dest: DropDest) => {
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, { origin: "manual" })
      setPlacedElements((current) => {
        const next = relocatePlacedTree(current, id, dest)
        const moved = next.find((element) => element.id === id)
        if (moved) {
          pendingPlacedInspectRef.current = moved
        }
        return next
      })
    },
    [pushHistory]
  )

  const commitElementDrag = useCallback(() => {
    const drag = elementDragRef.current
    elementDragRef.current = null
    setElementDrag(null)
    setPaletteDragging(false)
    if (!drag?.dest) {
      return
    }
    if (drag.mode === "move" && drag.elementId) {
      relocatePlacedElement(drag.elementId, drag.dest)
      return
    }
    if (drag.savedItemId) {
      insertSavedItem(drag.savedItemId, drag.dest)
      return
    }
    addPlacedElement({
      kind: drag.kind,
      label: drag.label,
      zone: drag.dest.kind === "root" ? drag.dest.zone : "end",
      dest: drag.dest,
    })
  }, [addPlacedElement, insertSavedItem, relocatePlacedElement])

  const reorderPlacedElement = useCallback(
    (draggedId: string, targetId: string) => {
      if (documentMutationsLocked() || draggedId === targetId) {
        return
      }
      const dragged = placedElements.find((element) => element.id === draggedId)
      pushHistory(undefined, { origin: "manual" })
      setPlacedElements((current) => {
        const draggedIndex = current.findIndex((element) => element.id === draggedId)
        const targetIndex = current.findIndex((element) => element.id === targetId)
        if (draggedIndex === -1 || targetIndex === -1) {
          return current
        }
        if (current[draggedIndex].zone !== current[targetIndex].zone) {
          return current
        }
        const draggedElement = current[draggedIndex]
        const next = current.filter((element) => element.id !== draggedId)
        const newTargetIndex = next.findIndex((element) => element.id === targetId)
        next.splice(newTargetIndex < 0 ? next.length : newTargetIndex, 0, draggedElement)
        return next
      })
      if (dragged) {
        openPlacedElementInspector(dragged)
      }
    },
    [openPlacedElementInspector, placedElements, pushHistory]
  )

  // Compares a layer's live content/style/rules/copies against the seeded
  // baseline so the inspector can show a reset affordance only when dirty.
  const hasLayerChanges = useCallback(
    (label: string) => {
      const baseline = layerBaselineRef.current[label]
      if ((layerDuplicates[label] ?? 0) > 0) {
        return true
      }
      const rules = layerRules[label]
      if (rules && Object.keys(rules).length > 0) {
        return true
      }
      if (!baseline) {
        return false
      }
      if (label in layerText && layerText[label] !== baseline.content) {
        return true
      }
      const style = layerStyles[label]
      if (style && style !== baseline.style) {
        const keys = new Set([
          ...Object.keys(style),
          ...Object.keys(baseline.style),
        ]) as Set<keyof BuilderLayerStyle>
        for (const key of keys) {
          if (style[key] !== baseline.style[key]) {
            return true
          }
        }
      }
      return false
    },
    [layerDuplicates, layerRules, layerText, layerStyles]
  )

  const resetLayer = useCallback(
    (label: string) => {
      if (documentMutationsLocked()) {
        return
      }
      const baseline = layerBaselineRef.current[label]
      pushHistory(undefined, { origin: "manual" })
      if (baseline) {
        setLayerTextState((current) => ({
          ...current,
          [label]: baseline.content,
        }))
        setLayerStyles((current) => ({
          ...current,
          [label]: { ...baseline.style },
        }))
      }
      setLayerRules((current) => {
        if (!(label in current)) {
          return current
        }
        const { [label]: _removed, ...rest } = current
        return rest
      })
      setLayerDuplicates((current) => {
        if (!(current[label] ?? 0)) {
          return current
        }
        return { ...current, [label]: 0 }
      })
      setHiddenLayers((current) => current.filter((hidden) => hidden !== label))
      setHasUnsavedChanges(true)
    },
    [pushHistory]
  )

  const resetLayerToBrand = useCallback(
    (label: string) => {
      if (documentMutationsLocked()) {
        return
      }
      pushHistory(undefined, {
        origin: "manual-style",
        target: documentVersionTarget(label),
      })
      setLayerStyles((current) => {
        const style = current[label]
        if (!style) {
          return current
        }
        const next = { ...style }
        delete next.color
        delete next.fontFamily
        delete next.backgroundColor
        return { ...current, [label]: next }
      })
    },
    [pushHistory]
  )

  // Saves (or replaces) an Advanced-tab rule for a layer. Persisted in session
  // state so reopening the card shows the applied configuration.
  const setLayerRule = useCallback(
    (label: string, kind: BuilderRuleKind, rule: BuilderConditionRule) => {
      if (documentMutationsLocked()) {
        return
      }
      setLayerRules((current) => mergeLayerRule(current, label, kind, rule))
      setHasUnsavedChanges(true)
    },
    []
  )

  const clearLayerRule = useCallback(
    (label: string, kind: BuilderRuleKind) => {
      if (documentMutationsLocked()) {
        return
      }
      setLayerRules((current) => clearMergedLayerRule(current, label, kind))
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

  const saveLayout = useCallback(
    (status: "Draft" | "Published") => {
      const layout = generatedLayoutRef.current
      if (!layout) {
        return null
      }
      const id = catalogIdRef.current ?? newSavedLayoutId()
      catalogIdRef.current = id
      setCatalogId(id)
      const record = {
        row: catalogRowFromDocument({
          id,
          name,
          mediumId: mediumId ?? getDefaultBuilderMediumId(),
          documentType,
          status,
        }),
        document: stripEphemeralDocument({
          generatedLayout: layout,
          layoutEdits,
          layerText,
          layerStyles,
          hiddenLayers,
          layerDuplicates,
          placedElements,
          codeOverride,
        }),
      }
      catalog?.upsertRecord(record)
      setHasUnsavedChanges(false)
      return { id, name }
    },
    [
      catalog,
      codeOverride,
      documentType,
      hiddenLayers,
      layerDuplicates,
      layerStyles,
      layerText,
      layoutEdits,
      mediumId,
      name,
      placedElements,
    ]
  )

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
        setPreReasoning(
          buildReasoning(lastUser?.text ?? "", {
            ...narrativeRequestFromTurn(messages, mediumId, answers),
            phase: "interpret",
          })
        )
        presentClarification(pending, pendingAskableCountRef.current)
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
  }, [status, messages, mediumId, answers])

  const submitAnswers = useCallback(
    (submitted: AiAnswers) => {
      primeCompletionSound()
      const prompt = clarificationPromptRef.current
      const nextResolved = applyAnswersToDecisions(
        clarificationResolvedRef.current,
        questions,
        submitted,
        prompt
      )
      clarificationResolvedRef.current = nextResolved
      clarificationAskedRef.current += questions.length
      clarificationRoundRef.current += 1

      const merged = {
        ...(answers ?? {}),
        ...submitted,
        ...decisionsToAnswers(nextResolved),
      }
      setAnswers(merged)
      setReceivedAnswers((current) => [
        ...(current ?? []),
        ...formatReceivedAnswers(questions, submitted),
      ])

      const planned = questionsForPrompt(prompt, {
        generatedOnce: hasGeneratedOnce,
        hasBrandBoard: Boolean(brandDraft),
        resolved: nextResolved,
        askedCount: clarificationAskedRef.current,
        round: clarificationRoundRef.current,
      })
      if (planned.questions && planned.questions.length > 0) {
        pendingQuestionsRef.current = planned.questions
        pendingAskableCountRef.current = planned.askableCount
        presentClarification(planned.questions, planned.askableCount)
        setStatus("asking")
        return
      }
      startThinking()
    },
    [questions, answers, startThinking, hasGeneratedOnce, brandDraft, presentClarification]
  )

  const skipQuestions = useCallback(() => {
    const submitted: AiAnswers = {}
    for (const question of questions) {
      submitted[question.id] = DECIDE_VALUE
    }
    submitAnswers(submitted)
  }, [questions, submitAnswers])

  const submitFreeformClarification = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || questions.length === 0) {
        return
      }
      const active = questions[0]
      const interpreted = interpretFreeformAnswer(active, trimmed)
      const submitted: AiAnswers = { [active.id]: interpreted }
      submitAnswers(submitted)
    },
    [questions, submitAnswers]
  )

  // Marks the current turn as failed. The status effect plays the error cue on
  // entry; the panel surfaces the reason with a retry affordance.
  const failGeneration = useCallback((message: string) => {
    setErrorMessage(message)
    setQuestions([])
    setStatus("error")
  }, [])

  const sendMessage = useCallback(
    (
      text: string,
      attachments: BuilderSubmittedAttachment[] = [],
      options?: {
        scoped?: boolean
        referenceAnalysis?: ReferenceAnalysis
        primaryReferenceId?: string | null
      }
    ) => {
      const trimmed = text.trim()
      const references = imageReferencesFromSubmitted(attachments)
      if (!trimmed && attachments.length === 0) {
        return false
      }
      if (documentMutationsLocked()) {
        return false
      }

      if (status === "asking" && trimmed) {
        if (!matchDocumentAction(trimmed) && !matchDocumentAction(text)) {
          submitFreeformClarification(trimmed)
          return false
        }
        setQuestions([])
        pendingQuestionsRef.current = null
      }

      if (status === "thinking" || status === "reasoning") {
        return false
      }

      if (matchDocumentAction(trimmed) || matchDocumentAction(text)) {
        if (!tryBeginDocumentAction(documentActionGateRef.current)) {
          return false
        }
      }

      // Warm the audio context under this click so the completion/error cue is
      // allowed to play once the turn settles (timer-driven, no gesture).
      primeCompletionSound()

      setPreviewVersionId(null)
      previewVersionIdRef.current = null

      const actionId = matchDocumentAction(trimmed) ?? matchDocumentAction(text)
      if (hasGeneratedOnce && generatedLayoutRef.current) {
        pushHistory(
          generatedLayoutRef.current,
          actionId ? false : { origin: "ai-edit" }
        )
      }

      // The first prompt ends the blank empty state; the generate flow takes over.
      setIsBlankSession(false)

      // Leaving a version preview — a new turn always acts on the live document.
      setPreviewVersionId(null)
      // A new turn recomposes from the full transcript, so drop any reverted base.
      setBaseLayout(null)

      // A new turn supersedes any prior failure.
      setErrorMessage(null)

      // New turn — clear any prior answer recap until this turn asks again.
      setReceivedAnswers(null)
      setPreThoughtDurationSec(null)
      setPreReasoning(null)

      if (options?.referenceAnalysis && !hasGeneratedOnce) {
        setReferenceAnalysis(options.referenceAnalysis)
      }

      const promptText = resolveBuilderGenerationPrompt(trimmed, {
        generatedOnce: hasGeneratedOnce,
        hasImageReference: references.length > 0,
      })

      if (!options?.scoped) {
        clarificationSurfaceRef.current = "global"
        clarificationTargetIdRef.current = null
        setClarificationSurface("global")
        setClarificationTargetId(null)
      }

      referenceUrlsRef.current = [
        ...referenceUrlsRef.current,
        ...references.map((ref) => ref.previewUrl),
      ]

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "user",
          text: promptText,
          references,
          attachments,
          primaryReferenceId: hasGeneratedOnce
            ? undefined
            : options?.primaryReferenceId ?? references[0]?.id ?? null,
        },
      ])

      // Can't reach the model offline — fail the turn so the user gets a clear
      // error (and the error cue) instead of a generation that never resolves.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        failGeneration(
          PRODUCT_UNREACHABLE
        )
        return true
      }

      const planned = questionsForPrompt(promptText, {
        hasReference: references.length > 0,
        generatedOnce: hasGeneratedOnce,
        isScopedElement: Boolean(options?.scoped),
        hasBrandBoard: Boolean(brandDraft),
        resolved: clarificationResolvedRef.current,
        askedCount: 0,
        round: 0,
      })
      clarificationResolvedRef.current = planned.resolved
      clarificationAskedRef.current = 0
      clarificationRoundRef.current = 0
      clarificationPromptRef.current = promptText
      setAnswers((current) => ({
        ...(current ?? {}),
        ...decisionsToAnswers(planned.resolved),
      }))
      startReasoning(planned.questions, planned.askableCount)
      return true
    },
    [
      startReasoning,
      failGeneration,
      hasGeneratedOnce,
      pushHistory,
      brandDraft,
      status,
      submitFreeformClarification,
    ]
  )

  // Prompt-box edit scoped to a specific layer/section: tag the active turn so
  // the working glow renders inside that container only, then hand off to the
  // normal turn pipeline (prefixing the layer keeps the transcript readable).
  const sendScopedEdit = useCallback(
    (label: string, text: string    ) => {
      const trimmed = text.trim()
      if (!trimmed) {
        return
      }
      if (documentMutationsLocked()) {
        return
      }
      clarificationSurfaceRef.current = "inspector"
      clarificationTargetIdRef.current = label
      setClarificationSurface("inspector")
      setClarificationTargetId(label)
      setAiEditingLayer(label)
      sendMessage(`${label}: ${trimmed}`, [], { scoped: true })
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
        PRODUCT_UNREACHABLE
      )
      return
    }

    const retryPlan = questionsForPrompt(prompt, {
      generatedOnce: hasGeneratedOnce,
      hasBrandBoard: Boolean(brandDraft),
      resolved: clarificationResolvedRef.current,
    })
    startReasoning(
      retryPlan.questions,
      retryPlan.askableCount
    )
  }, [messages, startReasoning, failGeneration, hasGeneratedOnce, brandDraft])

  const dismissError = useCallback(() => {
    setErrorMessage(null)
    setStatus(hasGeneratedOnce ? "ready" : "idle")
  }, [hasGeneratedOnce])

  const generatedLayout = useMemo<GeneratedLayout>(() => {
    const userPrompts = generationPromptTexts(messages)
    const settledTurns = messages.filter(
      (message) => message.role === "assistant"
    ).length

    // A selected preview source overlays its content (business, client,
    // currency, line items, dates…) onto the generated structure/style. Applied
    // before manual edits so hand edits always win, and after the base so the
    // template still reflects AI/structure changes.
    const sourceOverlay = findDocumentSource(previewSourceId)?.data ?? {}

    // Reverted to an earlier version: that frozen layout is the base, so the
    // rendered document matches the version exactly. Manual edits still win last.
    if (baseLayout) {
      const merged = mergeLayoutContent(baseLayout, sourceOverlay, layoutEdits)
      const withBlocks = { ...merged, blocks: placedElements }
      committedLayoutRef.current = withBlocks
      const branded = resolvePaintedLayout(withBlocks, brandDraft, brandCatalog)
      generatedLayoutRef.current = branded
      return branded
    }
    // The first prompt → assistant #1 → base layout; each later prompt folds in
    // once its assistant turn has settled (so the change lands on completion,
    // not the instant the user hits send). Manual edits still win last.
    const firstUser = messages.find((message) => message.role === "user")
    const fromReference = (firstUser?.references.length ?? 0) > 0
    const composed = composeLayout(
      userPrompts,
      settledTurns - 1,
      answers,
      documentType,
      layoutEdits,
      fromReference,
      referenceAnalysis
    )
    const merged = mergeLayoutContent(composed, sourceOverlay, layoutEdits)
    const withBlocks = {
      ...merged,
      blocks:
        placedElements.length > 0 ? placedElements : merged.blocks ?? placedElements,
    }
    committedLayoutRef.current = withBlocks
    const branded = resolvePaintedLayout(withBlocks, brandDraft, brandCatalog)
    generatedLayoutRef.current = branded
    return branded
  }, [messages, answers, documentType, layoutEdits, baseLayout, previewSourceId, referenceAnalysis, placedElements, brandDraft, brandCatalog])

  const brandTokens = useMemo(
    () =>
      resolveFamilyBrand(
        generatedLayout.style,
        brandDraft ?? generatedLayout.brand ?? null,
        brandCatalog,
        brandDraft ? undefined : generatedLayout.brandTheme
      ),
    [brandDraft, brandCatalog, generatedLayout]
  )

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
      // Chat-turn restore uses the same canonical restore transaction as
      // toolbar Version history: push undo, apply snapshot, and register a
      // document-version event so the timeline stays truthful.
      restoringDocumentRef.current = true
      pendingDocumentVersionRef.current = {
        origin: "restore",
        restoredId: messageId,
      }
      pushHistory()
      applyHistorySnapshot({
        layoutEdits: snapshot.layoutEdits,
        layerText: snapshot.layerText,
        layerStyles: snapshot.layerStyles,
        hiddenLayers: snapshot.hiddenLayers,
        layerDuplicates: snapshot.layerDuplicates,
        placedElements: snapshot.placedElements,
        codeOverride: snapshot.codeOverride,
        baseLayout: snapshot.generatedLayout,
      })
      setPreviewVersionId(null)
      restoringDocumentRef.current = false
    },
    [pushHistory, applyHistorySnapshot]
  )

  const hasVersionSnapshot = useCallback(
    (messageId: string) => Boolean(versionSnapshotsRef.current[messageId]),
    []
  )

  // Live document fingerprint — recomputed only when document fields change.
  const liveDocumentFingerprint = useMemo(() => {
    if (!generatedLayout) {
      return ""
    }
    return fingerprintDocumentSnapshot({
      layoutEdits,
      layerText,
      layerStyles,
      hiddenLayers,
      layerDuplicates,
      placedElements,
      codeOverride,
      baseLayout,
      generatedLayout,
    })
  }, [
    layoutEdits,
    layerText,
    layerStyles,
    hiddenLayers,
    layerDuplicates,
    placedElements,
    codeOverride,
    baseLayout,
    generatedLayout,
  ])

  // The truthful "Current": the latest version whose snapshot matches the
  // live document, or null when the live state matches no committed version
  // (e.g. mid-coalesce, or after undo of a normal edit to an un-snapshotted
  // intermediate state).
  const currentVersionId = useMemo(
    () =>
      liveDocumentFingerprint
        ? matchingDocumentVersionId(
            documentVersions,
            liveDocumentFingerprint
          )
        : null,
    [documentVersions, liveDocumentFingerprint]
  )
  const currentVersionIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentVersionIdRef.current = currentVersionId
  }, [currentVersionId])

  const previewDocumentVersion = useCallback((id: string) => {
    const matchId = currentVersionIdRef.current
    if (id === matchId || id === "current") {
      setPreviewVersionId(null)
      return
    }
    if (!findDocumentVersion(documentVersionsRef.current, id)) {
      return
    }
    setPreviewVersionId(id)
  }, [])

  const restoreDocumentVersion = useCallback(
    (id: string) => {
      if (documentMutationsLocked()) {
        return
      }
      const versions = documentVersionsRef.current
      const matchId = currentVersionIdRef.current
      if (!canRestoreDocumentVersion(versions, id, matchId)) {
        return
      }
      const version = findDocumentVersion(versions, id)
      if (!version) {
        return
      }
      restoringDocumentRef.current = true
      pendingDocumentVersionRef.current = {
        origin: "restore",
        restoredId: id,
      }
      pushHistory()
      applyHistorySnapshot(historyToUndoSnapshot(version.snapshot))
      setPreviewVersionId(null)
      restoringDocumentRef.current = false
    },
    [applyHistorySnapshot, pushHistory]
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

  const setComposerDraftText = useCallback((text: string) => {
    setComposerDraft((current) => nextComposerDraftText(current, text))
  }, [])

  const setComposerDraftModelId = useCallback((modelId: string) => {
    setComposerDraft((current) => nextComposerDraftModelId(current, modelId))
  }, [])

  const addComposerDraftFilesToSession = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return
      }
      const result = addComposerDraftFiles(composerDraftRef.current, files)
      setComposerDraft(result.next)
      for (const message of attachmentFeedbackMessages({
        next: result.next.attachments,
        added: result.added,
        rejected: result.rejected,
        truncated: result.truncated,
      })) {
        showFeedbackToast(message)
      }
    },
    [showFeedbackToast]
  )

  const removeComposerDraftAttachmentFromSession = useCallback((id: string) => {
    setComposerDraft((current) => removeComposerDraftAttachment(current, id))
  }, [])

  const setComposerDraftPrimary = useCallback((id: string) => {
    setComposerDraft((current) => nextComposerDraftPrimary(current, id))
  }, [])

  const clearComposerDraft = useCallback(() => {
    setComposerDraft((current) => discardComposerDraft(current))
  }, [])

  const showCanvasToast = useCallback((message: string) => {
    setCanvasToast(message)
    if (canvasToastTimerRef.current) {
      window.clearTimeout(canvasToastTimerRef.current)
    }
    canvasToastTimerRef.current = window.setTimeout(
      () => setCanvasToast(null),
      2600
    )
  }, [])

  const saveAvailability = useCallback(
    (label: string | null) => {
      if (!label) {
        return { ok: false as const, reason: "Select a block to save it." }
      }
      const result = serializeSelection({
        label,
        placedElements: documentStateRef.current.placedElements,
        layerText: documentStateRef.current.layerText,
        layerStyles: documentStateRef.current.layerStyles,
        layout: generatedLayoutRef.current,
        brandTokens,
      })
      return result.ok
        ? { ok: true as const }
        : { ok: false as const, reason: result.reason }
    },
    [brandTokens]
  )

  const beginSaveSelected = useCallback((anchor?: SavePopoverAnchor | null) => {
    const label = inspectingLayerRef.current
    if (!label) {
      showCanvasToast("Select a block to save it.")
      return
    }
    const result = serializeSelection({
      label,
      placedElements: documentStateRef.current.placedElements,
      layerText: documentStateRef.current.layerText,
      layerStyles: documentStateRef.current.layerStyles,
      layout: generatedLayoutRef.current,
      brandTokens,
    })
    if (!result.ok) {
      showCanvasToast(result.reason)
      return
    }
    setSaveItemDraft({
      node: result.node,
      defaultName: result.defaultName,
      anchor: anchor ?? null,
    })
  }, [brandTokens, showCanvasToast])

  const cancelSaveItem = useCallback(() => {
    setSaveItemDraft(null)
  }, [])

  const confirmSaveItem = useCallback(
    (name: string) => {
      if (!saveItemDraft) {
        return
      }
      const created = createSavedDefinition(name, saveItemDraft.node)
      setSavedItems((current) => {
        const next = [created, ...current]
        persistSavedItems(next)
        return next
      })
      setSaveItemDraft(null)
      showCanvasToast(`Saved “${created.name}”`)
    },
    [saveItemDraft, showCanvasToast]
  )

  useEffect(() => {
    return () => {
      if (feedbackToastTimerRef.current) {
        window.clearTimeout(feedbackToastTimerRef.current)
      }
      if (canvasToastTimerRef.current) {
        window.clearTimeout(canvasToastTimerRef.current)
      }
    }
  }, [])

  // The snapshot currently being previewed (if any) drives read-only canvas
  // overrides below.
  const previewSnapshot = useMemo(() => {
    if (!previewVersionId) {
      return null
    }
    const fromChat = versionSnapshotsRef.current[previewVersionId]
    if (fromChat) {
      return fromChat
    }
    return findDocumentVersion(documentVersions, previewVersionId)?.snapshot ?? null
  }, [previewVersionId, documentVersions, snapshotVersion])

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
        inspectingDisplayLabel,
        isLayerHidden,
        layerDuplicateCount,
        hiddenLayers,
        layerDuplicates,
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
      inspectingDisplayLabel: null,
      isLayerHidden: (label: string) =>
        previewSnapshot.hiddenLayers.includes(label),
      layerDuplicateCount: (label: string) =>
        previewSnapshot.layerDuplicates[label] ?? 0,
      hiddenLayers: previewSnapshot.hiddenLayers,
      layerDuplicates: previewSnapshot.layerDuplicates,
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
    inspectingDisplayLabel,
    isLayerHidden,
    layerDuplicateCount,
    hiddenLayers,
    layerDuplicates,
  ])

  // Latch once the first generation settles; follow-up prompts then keep the
  // existing layout visible instead of re-showing the generating animation.
  useEffect(() => {
    if (status === "ready") {
      setHasGeneratedOnce(true)
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

    if (status === "ready" || status === "error") {
      endDocumentAction(documentActionGateRef.current)
    }

    // A scoped prompt-box edit only owns the working glow while the turn is
    // actively running; once it settles, release it so the container returns
    // to its resting state.
    if (
      wasGenerating &&
      status !== "thinking" &&
      status !== "reasoning" &&
      status !== "asking"
    ) {
      setAiEditingLayer(null)
      if (status === "ready" || status === "error") {
        clarificationSurfaceRef.current = "global"
        clarificationTargetIdRef.current = null
        setClarificationSurface("global")
        setClarificationTargetId(null)
      }
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

  const appliedBlockTurnsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (status !== "ready") {
      return
    }
    if (compareWithReferenceRef.current) {
      return
    }
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") {
      return
    }
    const alreadyApplied = appliedBlockTurnsRef.current.has(last.id)
    const user = [...messages].reverse().find((message) => message.role === "user")
    if (!user) {
      return
    }
    const current = documentStateRef.current.placedElements
    const layout = generatedLayoutRef.current
    if (!layout) {
      return
    }
    const actionId = matchDocumentAction(user.text)
    if (actionId) {
      const lastVersion = documentVersionsRef.current[documentVersionsRef.current.length - 1]
      const baselineLayout = lastVersion?.snapshot.generatedLayout ?? layout
      const baselinePlaced = lastVersion?.snapshot.placedElements ?? current
      const result = executeDocumentAction(
        actionId,
        {
          layout: baselineLayout,
          placed: baselinePlaced,
        },
        extrasFromAnswers(answers)
      )
      const inspectMissing = Boolean(
        result.inspect && !current.some((element) => element.id === result.inspect?.id)
      )
      if (alreadyApplied && !inspectMissing) {
        return
      }
      appliedBlockTurnsRef.current.add(last.id)
      if ((result.changed && result.placed !== current) || inspectMissing) {
        const maxId = result.placed.reduce((max, element) => {
          const value = Number.parseInt(element.id.replace(/^placed-/, ""), 10)
          return Number.isFinite(value) ? Math.max(max, value) : max
        }, placedElementCounterRef.current)
        placedElementCounterRef.current = maxId
        setPlacedElements(result.placed)
      }
      if (result.inspect) {
        pendingPlacedInspectRef.current = result.inspect
      }
      if (result.changed || inspectMissing) {
        const snap: DocumentVersionSnapshot = {
          ...cloneHistorySnapshot(documentStateRef.current),
          placedElements: structuredClone(result.placed),
          generatedLayout: structuredClone(result.layout),
        }
        const next = appendDocumentVersion(
          documentVersionsRef.current,
          { origin: "document-action", actionId },
          snap,
          {
            id: nextDocumentVersionId(),
            createdAt: Date.now(),
            max: MAX_DOCUMENT_VERSIONS,
          }
        )
        documentVersionsRef.current = next
        setDocumentVersions(next)
      }
      return
    }
    if (alreadyApplied) {
      return
    }
    appliedBlockTurnsRef.current.add(last.id)
    const result = applyBlockPrompt(current, layout, user.text)
    const styleEdit = parseScopedStylePrompt(user.text)
    let recorded = false
    const record = () => {
      if (!recorded) {
        pushHistory(undefined, { origin: "ai-edit" })
        recorded = true
      }
    }
    if (styleEdit) {
      const placed = current.find(
        (element) =>
          element.id === styleEdit.layerId || element.label === styleEdit.layerId
      )
      const key = placed?.id ?? styleEdit.layerId
      record()
      setLayerStyles((styles) =>
        applyStyleOverride(styles, key, styleEdit.patch)
      )
      return
    }
    if (result.handled) {
      const maxId = result.placed.reduce((max, element) => {
        const value = Number.parseInt(element.id.replace(/^placed-/, ""), 10)
        return Number.isFinite(value) ? Math.max(max, value) : max
      }, placedElementCounterRef.current)
      placedElementCounterRef.current = maxId
      if (result.placed !== current) {
        record()
        setPlacedElements(result.placed)
      }
      if (result.inspect) {
        pendingPlacedInspectRef.current = result.inspect
      }
    }
  }, [messages, status, pushHistory, answers])

  useEffect(() => {
    const meta = pendingDocumentVersionRef.current
    if (!meta || !generatedLayout) {
      return
    }
    if (
      (meta.origin === "ai-edit" || meta.origin === "document-action") &&
      status !== "ready"
    ) {
      return
    }
    pendingDocumentVersionRef.current = null
    const snap: DocumentVersionSnapshot = {
      ...cloneHistorySnapshot(documentStateRef.current),
      generatedLayout: structuredClone(generatedLayout),
    }
    const last = documentVersionsRef.current[documentVersionsRef.current.length - 1]
    if (
      meta.origin !== "restore" &&
      last &&
      JSON.stringify(last.snapshot) === JSON.stringify(snap)
    ) {
      return
    }
    const next = appendDocumentVersion(documentVersionsRef.current, meta, snap, {
      id: nextDocumentVersionId(),
      createdAt: Date.now(),
      max: MAX_DOCUMENT_VERSIONS,
    })
    documentVersionsRef.current = next
    setDocumentVersions(next)
  }, [
    layoutEdits,
    layerText,
    layerStyles,
    hiddenLayers,
    layerDuplicates,
    placedElements,
    codeOverride,
    baseLayout,
    generatedLayout,
    status,
    codeVersionCommit,
  ])

  useEffect(() => {
    if (status !== "ready" || !generatedLayout) {
      return
    }
    if (documentVersionsRef.current.length > 0) {
      return
    }
    if (pendingDocumentVersionRef.current) {
      return
    }
    const snap: DocumentVersionSnapshot = {
      ...cloneHistorySnapshot(documentStateRef.current),
      generatedLayout: structuredClone(generatedLayout),
    }
    const next = appendDocumentVersion(
      [],
      { origin: "generated" },
      snap,
      { id: nextDocumentVersionId(), createdAt: Date.now() }
    )
    documentVersionsRef.current = next
    setDocumentVersions(next)
  }, [status, generatedLayout])

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
      const userPrompts = generationPromptTexts(current)
      const settledTurns = current.filter(
        (message) => message.role === "assistant"
      ).length
      const firstUser = current.find((message) => message.role === "user")
      const fromReference = (firstUser?.references.length ?? 0) > 0
      const turnLayout = composeLayout(
        userPrompts,
        settledTurns,
        answers,
        documentType,
        layoutEdits,
        fromReference,
        referenceAnalysis
      )

      const turnRequest: NarrativeRequest = {
        prompt,
        hasReference: fromReference,
        isFollowUp: settledTurns >= 1,
        paperName: mediumId ? getMediumName(mediumId) : "A4",
        family: turnLayout.style,
        receivedAnswers,
      }
      const completedTodos: AiTodoItem[] = buildTodoLabels(turnRequest).map(
        (label, index) => ({
          id: `builder-todo-${index}`,
          label,
          status: "done" as const,
        })
      )

      const hasAnswers = receivedAnswers && receivedAnswers.length > 0
      const isFollowUp = settledTurns >= 1
      const previousLayout = isFollowUp
        ? composeLayout(
            userPrompts.slice(0, -1),
            settledTurns - 1,
            answers,
            documentType,
            layoutEdits,
            fromReference,
            referenceAnalysis
          )
        : null

      const actionId = matchDocumentAction(prompt)
      const actionResult =
        actionId && previousLayout
          ? executeDocumentAction(
              actionId,
              {
                layout: previousLayout,
                placed: previousLayout.blocks ?? [],
              },
              extrasFromAnswers(answers)
            )
          : null

      return [
        ...current,
        {
          id: nextMessageId(),
          role: "assistant",
          receivedAnswers,
          preReasoning: hasAnswers ? preReasoning : null,
          preDurationSec: hasAnswers ? (preThoughtDurationSec ?? 0) : null,
          reasoning: hasAnswers
            ? buildPostReasoning(prompt, receivedAnswers, {
                ...turnRequest,
                phase: "implement",
              })
            : buildWorkingNarrative({ ...turnRequest, phase: "implement" }),
          durationSec: thoughtDurationSec ?? 0,
          todos: completedTodos,
          summary: actionResult
            ? actionResult.summary
            : previousLayout
              ? buildEditSummary(previousLayout, turnLayout)
              : buildCompletionSummary(turnLayout, turnRequest),
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
    referenceAnalysis,
    mediumId,
  ])

  const isReferenceReconstruction = creationUsedVisualReference(messages)
  const comparisonSource = creationComparisonSource(messages)
  const canCompareReference = canCompareReferenceResult(messages)
  const referencePreviewUrl = comparisonSource?.previewUrl ?? null
  const referenceSourceName = comparisonSource?.name ?? null
  const referenceSourceId = comparisonSource?.id ?? null

  useEffect(() => {
    if (!canCompareReference && compareWithReference) {
      setCompareWithReference(false)
    }
  }, [canCompareReference, compareWithReference])

  const todos = useMemo<AiTodoItem[]>(() => {
    if (status !== "thinking" && status !== "ready") {
      return []
    }

    const labels = buildTodoLabels(
      narrativeRequestFromTurn(messages, mediumId, answers, generatedLayout)
    )

    return labels.map((label, index) => {
      let itemStatus: AiTodoItem["status"] = "pending"
      if (index < completedTodoCount) {
        itemStatus = "done"
      } else if (index === completedTodoCount && status === "thinking") {
        itemStatus = "in-progress"
      }

      return { id: `builder-todo-${index}`, label, status: itemStatus }
    })
  }, [
    answers,
    completedTodoCount,
    generatedLayout,
    mediumId,
    messages,
    status,
  ])

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
      previewSourceId,
      setPreviewSourceId,
      codeOpen,
      previewOpen,
      toggleCode,
      togglePreview,
      codeOverride: effective.codeOverride,
      isCodeDetached: effective.isCodeDetached,
      detachCode,
      updateCodeOverride,
      reattachCode,
      commitCodeOverrideVersion,
      documentEditingLocked: documentMutationsLocked(),
      panelOpen,
      setPanelOpen,
      panelWidth,
      setPanelWidth,
      panelMinWidth: PANEL_MIN_WIDTH,
      panelMaxWidth: PANEL_MAX_WIDTH,
      editMode: effective.editMode,
      toggleEditMode,
      openPageProperties,
      updateLayout,
      selections,
      addSelection,
      removeSelection,
      clearSelections,
      layerText: effective.layerText,
      setLayerText,
      layerStyles: effective.layerStyles,
      hiddenLayers: effective.hiddenLayers,
      layerDuplicates: effective.layerDuplicates,
      setLayerStyle,
      hasLayerChanges,
      resetLayer,
      resetLayerToBrand,
      isLayerHidden: effective.isLayerHidden,
      layerDuplicateCount: effective.layerDuplicateCount,
      duplicateLayer,
      requestDeleteLayer,
      copyLayer,
      copyLayerProperties,
      pasteToReplace,
      pasteAfter,
      pasteLayerProperties,
      canPasteLayer: copiedLayer !== null,
      canPasteProperties: copiedProperties !== null,
      canMoveLayer,
      moveLayer,
      registerLayerMover,
      inspectingLayer: effective.inspectingLayer,
      inspectingDisplayLabel,
      inspectLayer,
      inspectingLayerKind,
      editsTab,
      setEditsTab,
      editsDocked,
      setEditsDocked,
      selectLayer,
      seedLayer,
      layerRules,
      setLayerRule,
      clearLayerRule,
      addingElement,
      revealSavedItems,
      openAddElements,
      closeAddElements,
      browsingSavedItems,
      openSavedItems,
      closeSavedItems,
      browsingBrand,
      openBrandBoards,
      closeBrandBoards,
      browsingVersionHistory,
      openVersionHistory,
      closeVersionHistory,
      composerDraftText: composerDraft.text,
      composerDraftAttachments: composerDraft.attachments,
      composerDraftModelId: composerDraft.modelId,
      composerDraftPrimaryReferenceId: composerDraft.primaryReferenceId,
      setComposerDraftText,
      setComposerDraftModelId,
      addComposerDraftFiles: addComposerDraftFilesToSession,
      removeComposerDraftAttachment: removeComposerDraftAttachmentFromSession,
      setComposerDraftPrimary,
      clearComposerDraft,
      brandDraft,
      brandHasPreview: Boolean(brandDraft),
      previewBrandSelection,
      applyBrandSelection,
      cancelBrandPreview,
      customBoards,
      brandCatalog,
      upsertCustomBoard,
      removeCustomBoard,
      previewUnsavedBoard,
      brandTokens,
      paletteDragging,
      setPaletteDragging,
      elementDrag,
      beginElementDrag,
      updateElementDragPointer,
      commitElementDrag,
      cancelElementDrag,
      relocatePlacedElement,
      placedElements: effective.placedElements,
      addPlacedElement,
      updatePlacedElementContent,
      updatePlacedElement,
      removePlacedElement,
      duplicatePlacedElement,
      canMovePlacedElement,
      movePlacedElement,
      reorderPlacedElement,
      savedItems,
      saveItemDraft,
      beginSaveSelected,
      confirmSaveItem,
      cancelSaveItem,
      saveAvailability,
      insertSavedItem,
      replaceSelectedWithSavedItem,
      replaceAvailability,
      renameSavedItem,
      duplicateSavedItem,
      deleteSavedItem,
      isBlankSession,
      promptFocusToken,
      focusPrompt,
      messages,
      status,
      errorMessage,
      retryGeneration,
      dismissError,
      hasGeneratedOnce,
      isReferenceReconstruction,
      canCompareReferenceResult: canCompareReference,
      referencePreviewUrl,
      referenceSourceName,
      referenceSourceId,
      referenceMoodHex: referenceAnalysis?.dominantHex ?? null,
      compareWithReference,
      setCompareWithReference,
      preThoughtDurationSec,
      preReasoning,
      thoughtDurationSec,
      todos,
      questions,
      clarificationAskedCount,
      clarificationAskableCount,
      clarificationSurface,
      clarificationTargetId,
      receivedAnswers,
      generatedLayout: effective.generatedLayout,
      sendMessage,
      sendScopedEdit,
      isLayerEditing,
      aiEditingLayer,
      submitAnswers,
      skipQuestions,
      submitFreeformClarification,
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
      documentVersions,
      currentVersionId,
      previewingHistoricalVersion: Boolean(
        previewVersionId &&
          documentVersions.some((version) => version.id === previewVersionId)
      ),
      previewDocumentVersion,
      restoreDocumentVersion,
      closeVersionHistoryPreview,
      feedbackToast,
      showFeedbackToast,
      canvasToast,
      showCanvasToast,
      hasUnsavedChanges,
      markSaved,
      saveLayout,
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
      previewSourceId,
      codeOpen,
      previewOpen,
      toggleCode,
      togglePreview,
      codeOverride,
      detachCode,
      updateCodeOverride,
      reattachCode,
      commitCodeOverrideVersion,
      compareWithReference,
      previewVersionId,
      panelOpen,
      panelWidth,
      editMode,
      toggleEditMode,
      openPageProperties,
      updateLayout,
      selections,
      addSelection,
      removeSelection,
      clearSelections,
      layerText,
      setLayerText,
      layerStyles,
      hiddenLayers,
      layerDuplicates,
      setLayerStyle,
      hasLayerChanges,
      resetLayer,
      resetLayerToBrand,
      isLayerHidden,
      layerDuplicateCount,
      duplicateLayer,
      requestDeleteLayer,
      copyLayer,
      copyLayerProperties,
      pasteToReplace,
      pasteAfter,
      pasteLayerProperties,
      copiedLayer,
      copiedProperties,
      canMoveLayer,
      moveLayer,
      registerLayerMover,
      inspectingLayer,
      inspectingDisplayLabel,
      inspectLayer,
      inspectingLayerKind,
      editsTab,
      setEditsTab,
      editsDocked,
      setEditsDocked,
      selectLayer,
      seedLayer,
      layerRules,
      setLayerRule,
      clearLayerRule,
      addingElement,
      revealSavedItems,
      openAddElements,
      closeAddElements,
      browsingSavedItems,
      openSavedItems,
      closeSavedItems,
      browsingBrand,
      openBrandBoards,
      closeBrandBoards,
      browsingVersionHistory,
      openVersionHistory,
      closeVersionHistory,
      composerDraft,
      setComposerDraftText,
      setComposerDraftModelId,
      addComposerDraftFilesToSession,
      removeComposerDraftAttachmentFromSession,
      setComposerDraftPrimary,
      clearComposerDraft,
      brandDraft,
      previewBrandSelection,
      applyBrandSelection,
      cancelBrandPreview,
      customBoards,
      brandCatalog,
      upsertCustomBoard,
      removeCustomBoard,
      previewUnsavedBoard,
      brandTokens,
      paletteDragging,
      setPaletteDragging,
      elementDrag,
      beginElementDrag,
      updateElementDragPointer,
      commitElementDrag,
      cancelElementDrag,
      relocatePlacedElement,
      placedElements,
      addPlacedElement,
      updatePlacedElementContent,
      updatePlacedElement,
      removePlacedElement,
      duplicatePlacedElement,
      canMovePlacedElement,
      movePlacedElement,
      reorderPlacedElement,
      savedItems,
      saveItemDraft,
      beginSaveSelected,
      confirmSaveItem,
      cancelSaveItem,
      saveAvailability,
      insertSavedItem,
      replaceSelectedWithSavedItem,
      replaceAvailability,
      renameSavedItem,
      duplicateSavedItem,
      deleteSavedItem,
      isBlankSession,
      promptFocusToken,
      focusPrompt,
      messages,
      status,
      errorMessage,
      retryGeneration,
      dismissError,
      hasGeneratedOnce,
      isReferenceReconstruction,
      canCompareReference,
      referencePreviewUrl,
      referenceSourceName,
      referenceSourceId,
      referenceAnalysis,
      compareWithReference,
      preThoughtDurationSec,
      preReasoning,
      thoughtDurationSec,
      todos,
      questions,
      clarificationAskedCount,
      clarificationAskableCount,
      clarificationSurface,
      clarificationTargetId,
      receivedAnswers,
      generatedLayout,
      sendMessage,
      sendScopedEdit,
      isLayerEditing,
      aiEditingLayer,
      submitAnswers,
      skipQuestions,
      submitFreeformClarification,
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
      documentVersions,
      currentVersionId,
      previewDocumentVersion,
      restoreDocumentVersion,
      closeVersionHistoryPreview,
      snapshotVersion,
      feedbackToast,
      showFeedbackToast,
      canvasToast,
      showCanvasToast,
      hasUnsavedChanges,
      markSaved,
      saveLayout,
      elementDrag,
      beginElementDrag,
      updateElementDragPointer,
      commitElementDrag,
      cancelElementDrag,
      relocatePlacedElement,
      previewUnsavedBoard,
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

export function useLayoutBuilderOptional(): LayoutBuilderContextValue | null {
  return useContext(LayoutBuilderContext)
}

export function useLayoutBuilder(): LayoutBuilderContextValue {
  const context = useContext(LayoutBuilderContext)

  if (!context) {
    throw new Error("useLayoutBuilder must be used within LayoutBuilderProvider")
  }

  return context
}
