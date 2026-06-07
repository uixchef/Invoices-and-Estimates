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
  sendMessage: (text: string, references?: BuilderReferenceImage[]) => void
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
  const [thoughtDurationSec, setThoughtDurationSec] = useState<number | null>(
    null
  )

  const thinkingStartedAtRef = useRef<number | null>(null)
  const referenceUrlsRef = useRef<string[]>([])
  const initializedRef = useRef(false)

  const startThinking = useCallback(() => {
    thinkingStartedAtRef.current = Date.now()
    setThoughtDurationSec(null)
    setStatus("thinking")
  }, [])

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

    startThinking()
  }, [consumePendingGeneration, startThinking])

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

      startThinking()
    },
    [startThinking]
  )

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
      sendMessage,
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
      sendMessage,
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
