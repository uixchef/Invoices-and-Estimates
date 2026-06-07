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
import { buildCompletionSummary, buildReasoning } from "@/lib/builder-narrative"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import {
  BUILDER_DOCUMENT_TYPES,
  DEFAULT_LAYOUT_NAME,
  type BuilderDocumentType,
  type BuilderLayerStyle,
  type BuilderMessage,
  type BuilderReferenceImage,
  type BuilderReceivedAnswer,
  type BuilderSelection,
  type BuilderStatus,
  type BuilderVisualStyle,
  type GeneratedLayout,
  type GeneratedLineItem,
} from "@/lib/layout-builder-types"

/** Simulated generation latency until the layout-generation API is wired in. */
const SIMULATED_THINKING_MS = 7000

/** Invoice AI side-panel resize bounds (Figma: 3181:33796). */
const PANEL_MIN_WIDTH = 360
const PANEL_MAX_WIDTH = 640
const PANEL_DEFAULT_WIDTH = 360

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

  const isUncertain = wordCount < 5 || (hasVague && !hasConcrete)
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
    documentNumber: `${DOC_PREFIX[documentType]}-${now.getFullYear()}-${pad(
      142,
      4
    )}`,
    issueDate: formatDate(now),
    dueDate: formatDate(due),
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

  /**
   * The layer whose Visual edits inspector is open (replaces the chat). Null
   * shows the normal AI conversation.
   */
  inspectingLayer: string | null
  inspectLayer: (label: string | null) => void

  /** Selects a layer for inspection — opens its Visual edits panel + chip. */
  selectLayer: (label: string) => void

  /** Seeds a layer's content/style overrides from the DOM on first inspect. */
  seedLayer: (
    label: string,
    seed: { content: string; style: BuilderLayerStyle }
  ) => void

  messages: BuilderMessage[]
  status: BuilderStatus
  thoughtDurationSec: number | null
  todos: AiTodoItem[]
  /** Clarifying questions shown while `status === "asking"`. */
  questions: AiQuestion[]
  /** Answers captured for the active turn (null when none were asked). */
  receivedAnswers: BuilderReceivedAnswer[] | null
  /** Resolved layout to render once `status === "ready"`. */
  generatedLayout: GeneratedLayout
  sendMessage: (text: string, references?: BuilderReferenceImage[]) => void
  /** Records the answers and kicks off generation. */
  submitAnswers: (answers: AiAnswers) => void
  /** Skips the clarifying questions and kicks off generation. */
  skipQuestions: () => void
  /** Halts the in-progress generation and settles the session. */
  stopGeneration: () => void
}

const LayoutBuilderContext = createContext<LayoutBuilderContextValue | null>(null)

let messageCounter = 0
function nextMessageId() {
  messageCounter += 1
  return `builder-msg-${Date.now()}-${messageCounter}`
}

export function LayoutBuilderProvider({ children }: { children: ReactNode }) {
  const { consumePendingGeneration } = useCreateWithAi()

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
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH)
  const [editMode, setEditMode] = useState(false)
  const [layoutEdits, setLayoutEdits] = useState<Partial<GeneratedLayout>>({})
  const [selections, setSelections] = useState<BuilderSelection[]>([])
  const [layerText, setLayerTextState] = useState<Record<string, string>>({})
  const [layerStyles, setLayerStyles] = useState<
    Record<string, BuilderLayerStyle>
  >({})
  const [inspectingLayer, setInspectingLayer] = useState<string | null>(null)

  const [messages, setMessages] = useState<BuilderMessage[]>([])
  const [status, setStatus] = useState<BuilderStatus>("idle")
  const [questions, setQuestions] = useState<AiQuestion[]>(BUILDER_QUESTIONS)
  const [answers, setAnswers] = useState<AiAnswers | null>(null)
  const [receivedAnswers, setReceivedAnswers] = useState<
    BuilderReceivedAnswer[] | null
  >(null)
  const [thoughtDurationSec, setThoughtDurationSec] = useState<number | null>(
    null
  )
  const [completedTodoCount, setCompletedTodoCount] = useState(0)

  const thinkingStartedAtRef = useRef<number | null>(null)
  const reasoningStartedAtRef = useRef<number | null>(null)
  const pendingQuestionsRef = useRef<AiQuestion[] | null>(null)
  const referenceUrlsRef = useRef<string[]>([])
  const initializedRef = useRef(false)

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
      setThoughtDurationSec(
        Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      )

      const pending = pendingQuestionsRef.current
      if (pending) {
        setQuestions(pending)
        setStatus("asking")
      } else {
        startThinking()
      }
    }, REASONING_MS)

    return () => window.clearTimeout(timer)
  }, [status, startThinking])

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

    const seed = consumePendingGeneration()
    if (!seed) {
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

    // Think first, then surface clarifying questions before the first draft.
    startReasoning(BUILDER_QUESTIONS)
  }, [consumePendingGeneration, startReasoning])

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
  // Leaving edit mode also closes any open inspector.
  const toggleEditMode = useCallback(() => {
    setEditMode((on) => {
      const next = !on
      if (next) {
        setPreviewOpen(true)
      } else {
        setInspectingLayer(null)
      }
      return next
    })
  }, [])

  const updateLayout = useCallback((patch: Partial<GeneratedLayout>) => {
    setLayoutEdits((current) => ({ ...current, ...patch }))
  }, [])

  const addSelection = useCallback((label: string) => {
    setSelections((current) => {
      if (current.some((selection) => selection.label === label)) {
        return current
      }
      return [...current, { id: nextMessageId(), label }]
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

  const setLayerText = useCallback((label: string, value: string) => {
    setLayerTextState((current) => ({ ...current, [label]: value }))
  }, [])

  const setLayerStyle = useCallback(
    (label: string, patch: Partial<BuilderLayerStyle>) => {
      setLayerStyles((current) => ({
        ...current,
        [label]: { ...current[label], ...patch },
      }))
    },
    []
  )

  const inspectLayer = useCallback((label: string | null) => {
    setInspectingLayer(label)
  }, [])

  const selectLayer = useCallback(
    (label: string) => {
      addSelection(label)
      setInspectingLayer(label)
    },
    [addSelection]
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

  const startNameEdit = useCallback(() => {
    setDraftName(name)
    setIsEditingName(true)
  }, [name])

  const commitName = useCallback(() => {
    const trimmed = draftName.trim()
    setName(trimmed || DEFAULT_LAYOUT_NAME)
    setIsEditingName(false)
  }, [draftName])

  const cancelNameEdit = useCallback(() => {
    setDraftName(name)
    setIsEditingName(false)
  }, [name])

  const stopGeneration = useCallback(() => {
    // Stopping mid-reasoning jumps straight to the questions (or settles if
    // there are none); stopping mid-generation settles the layout.
    if (status === "reasoning") {
      const startedAt = reasoningStartedAtRef.current ?? Date.now()
      setThoughtDurationSec(
        Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      )
      const pending = pendingQuestionsRef.current
      if (pending) {
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
  }, [status])

  const submitAnswers = useCallback(
    (submitted: AiAnswers) => {
      setAnswers(submitted)
      setReceivedAnswers(formatReceivedAnswers(questions, submitted))
      startThinking()
    },
    [questions, startThinking]
  )

  const skipQuestions = useCallback(() => {
    setReceivedAnswers(null)
    startThinking()
  }, [startThinking])

  const sendMessage = useCallback(
    (text: string, references: BuilderReferenceImage[] = []) => {
      const trimmed = text.trim()
      if (!trimmed && references.length === 0) {
        return
      }

      // New turn — clear any prior answer recap until this turn asks again.
      setReceivedAnswers(null)

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

      // Always think first; only interrupt with questions when the request
      // reads as ambiguous, otherwise reasoning rolls into generation.
      startReasoning(buildFollowUpQuestions(trimmed))
    },
    [startReasoning]
  )

  const generatedLayout = useMemo<GeneratedLayout>(() => {
    const firstUser = messages.find((message) => message.role === "user")
    const prompt = firstUser?.text ?? ""
    const base = deriveLayout(prompt, answers, documentType)
    // Manual visual edits win over the derived layout.
    return { ...base, ...layoutEdits }
  }, [messages, answers, documentType, layoutEdits])

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

      const completedTodos: AiTodoItem[] = BUILDER_TODO_LABELS.map(
        (label, index) => ({
          id: `builder-todo-${index}`,
          label,
          status: "done",
        })
      )

      return [
        ...current,
        {
          id: nextMessageId(),
          role: "assistant",
          receivedAnswers,
          reasoning: buildReasoning(lastUser?.text ?? ""),
          durationSec: thoughtDurationSec ?? 0,
          todos: completedTodos,
          summary: buildCompletionSummary(generatedLayout),
        },
      ]
    })
  }, [status, thoughtDurationSec, generatedLayout, receivedAnswers])

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
      panelOpen,
      setPanelOpen,
      panelWidth,
      setPanelWidth,
      panelMinWidth: PANEL_MIN_WIDTH,
      panelMaxWidth: PANEL_MAX_WIDTH,
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
      inspectingLayer,
      inspectLayer,
      selectLayer,
      seedLayer,
      messages,
      status,
      thoughtDurationSec,
      todos,
      questions,
      receivedAnswers,
      generatedLayout,
      sendMessage,
      submitAnswers,
      skipQuestions,
      stopGeneration,
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
      inspectingLayer,
      inspectLayer,
      selectLayer,
      seedLayer,
      messages,
      status,
      thoughtDurationSec,
      todos,
      questions,
      receivedAnswers,
      generatedLayout,
      sendMessage,
      submitAnswers,
      skipQuestions,
      stopGeneration,
    ]
  )

  return (
    <LayoutBuilderContext.Provider value={value}>
      {children}
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
