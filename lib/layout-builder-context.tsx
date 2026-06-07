"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { AiAnswers, AiQuestion } from "@/components/ai/ai-questions"
import type { AiTodoItem } from "@/components/ai/ai-todo-list"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import {
  BUILDER_DOCUMENT_TYPES,
  DEFAULT_LAYOUT_NAME,
  type BuilderDocumentType,
  type BuilderMessage,
  type BuilderReferenceImage,
  type BuilderStatus,
  type BuilderViewMode,
} from "@/lib/layout-builder-types"

/** Simulated generation latency until the layout-generation API is wired in. */
const SIMULATED_THINKING_MS = 7000

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

  viewMode: BuilderViewMode
  setViewMode: (value: BuilderViewMode) => void

  messages: BuilderMessage[]
  status: BuilderStatus
  thoughtDurationSec: number | null
  todos: AiTodoItem[]
  /** Clarifying questions shown while `status === "asking"`. */
  questions: AiQuestion[]
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
  const [viewMode, setViewMode] = useState<BuilderViewMode>("preview")

  const [messages, setMessages] = useState<BuilderMessage[]>([])
  const [status, setStatus] = useState<BuilderStatus>("idle")
  const [questions, setQuestions] = useState<AiQuestion[]>(BUILDER_QUESTIONS)
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
    (_answers: AiAnswers) => {
      // Answers will feed the generation request once the API is wired in.
      startThinking()
    },
    [startThinking]
  )

  const skipQuestions = useCallback(() => {
    startThinking()
  }, [startThinking])

  const sendMessage = useCallback(
    (text: string, references: BuilderReferenceImage[] = []) => {
      const trimmed = text.trim()
      if (!trimmed && references.length === 0) {
        return
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
      viewMode,
      setViewMode,
      messages,
      status,
      thoughtDurationSec,
      todos,
      questions,
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
      viewMode,
      messages,
      status,
      thoughtDurationSec,
      todos,
      questions,
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
