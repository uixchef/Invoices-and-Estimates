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

import { useRouter } from "next/navigation"

import { useHubToast } from "@/components/payment-hub/hub-toast"
import { primeCompletionSound } from "@/lib/completion-sound"
import { detectBuilderMediumFromText } from "@/lib/mediums-data"
import {
  CREATE_WITH_AI_MEDIUM_REQUIRED_MESSAGE,
  type CreateWithAiGenerateInput,
  type CreateWithAiGenerateRequest,
  type PromptAttachment,
} from "@/lib/create-with-ai-types"
import {
  LAYOUT_BUILDER_ROUTE,
  type LayoutBuilderEditSeed,
  type LayoutBuilderSeed,
} from "@/lib/layout-builder-types"

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const MAX_ATTACHMENTS = 5

function createAttachment(file: File): PromptAttachment {
  const usedForGeneration = IMAGE_MIME_TYPES.has(file.type)

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: usedForGeneration ? URL.createObjectURL(file) : "",
    name: file.name,
    mimeType: file.type,
    usedForGeneration,
  }
}

function revokeAttachmentUrls(attachments: PromptAttachment[]) {
  for (const attachment of attachments) {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl)
    }
  }
}

type CreateWithAiContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  prompt: string
  setPrompt: (value: string) => void
  attachments: PromptAttachment[]
  addAttachments: (files: File[]) => void
  removeAttachment: (id: string) => void
  generateLayout: (input: CreateWithAiGenerateRequest) => void
  /** Reads and clears the generation request queued for the builder route. */
  consumePendingGeneration: () => LayoutBuilderSeed | null
  /** Opens an existing layout in the builder (dashboard "Edit" action). */
  requestLayoutEdit: (seed: LayoutBuilderEditSeed) => void
  /** Reads and clears the edit request queued for the builder route. */
  consumePendingEdit: () => LayoutBuilderEditSeed | null
  /** "Start from blank" — opens the builder on its empty state (no seed prompt). */
  startBlankLayout: (mediumId: string) => void
  /** Reads and clears the blank-session medium queued for the builder route. */
  consumePendingBlank: () => string | null
}

const CreateWithAiContext = createContext<CreateWithAiContextValue | null>(null)

export function CreateWithAiProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { showError } = useHubToast()
  const attachmentsRef = useRef<PromptAttachment[]>([])
  const pendingGenerationRef = useRef<LayoutBuilderSeed | null>(null)
  const pendingEditRef = useRef<LayoutBuilderEditSeed | null>(null)
  const pendingBlankMediumRef = useRef<string | null>(null)

  // The create-with-AI hero opens by default and stays open until the user
  // explicitly collapses it (or a generation hands off to the builder).
  const [isOpen, setIsOpen] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [attachments, setAttachments] = useState<PromptAttachment[]>([])

  attachmentsRef.current = attachments

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((current) => !current), [])

  const addAttachments = useCallback((files: File[]) => {
    if (files.length === 0) {
      return
    }

    setAttachments((current) => {
      const remaining = MAX_ATTACHMENTS - current.length
      if (remaining <= 0) {
        return current
      }

      return [...current, ...files.slice(0, remaining).map(createAttachment)]
    })
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }

      return current.filter((attachment) => attachment.id !== id)
    })
  }, [])

  const generateLayout = useCallback(
    ({ mediumId, modelId }: CreateWithAiGenerateRequest) => {
      const trimmedPrompt = prompt.trim()
      const imageAttachments = attachments.filter(
        (attachment) => attachment.usedForGeneration
      )

      if (!trimmedPrompt && imageAttachments.length === 0) {
        return
      }

      if (!mediumId) {
        showError(CREATE_WITH_AI_MEDIUM_REQUIRED_MESSAGE)
        return
      }

      const payload: CreateWithAiGenerateInput = {
        prompt: trimmedPrompt,
        referenceImages: imageAttachments.map((attachment) => attachment.file),
        mediumId,
        modelId,
      }

      // Generation API will consume prompt + referenceImages as multimodal input.
      void payload

      // Warm the audio context under this click so the builder's completion
      // cue can play once the (timer-driven) first generation settles.
      primeCompletionSound()

      // An explicit paper size in the prompt ("US letter", "legal size", …)
      // wins over the picker selection: the prompt is the stronger signal of
      // intent, so the builder opens on the size the user actually described.
      const resolvedMediumId =
        detectBuilderMediumFromText(trimmedPrompt) ?? mediumId

      // Hand the prompt off to the builder. Preview URLs are transferred to the
      // builder session, so clear attachments without revoking them here.
      pendingGenerationRef.current = {
        prompt: trimmedPrompt,
        mediumId: resolvedMediumId,
        modelId,
        references: imageAttachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          previewUrl: attachment.previewUrl,
        })),
      }

      setAttachments([])
      setPrompt("")
      setIsOpen(false)

      router.push(LAYOUT_BUILDER_ROUTE)
    },
    [attachments, prompt, router, showError]
  )

  const consumePendingGeneration = useCallback(() => {
    const seed = pendingGenerationRef.current
    pendingGenerationRef.current = null
    return seed
  }, [])

  const requestLayoutEdit = useCallback(
    (seed: LayoutBuilderEditSeed) => {
      // A queued edit takes precedence over any stale generation request.
      pendingGenerationRef.current = null
      pendingEditRef.current = seed
      router.push(LAYOUT_BUILDER_ROUTE)
    },
    [router]
  )

  const consumePendingEdit = useCallback(() => {
    const seed = pendingEditRef.current
    pendingEditRef.current = null
    return seed
  }, [])

  const startBlankLayout = useCallback(
    (mediumId: string) => {
      // A blank start supersedes any queued generation/edit — the builder should
      // open on its empty state, not a stale seed.
      pendingGenerationRef.current = null
      pendingEditRef.current = null
      pendingBlankMediumRef.current = mediumId
      setIsOpen(false)
      router.push(LAYOUT_BUILDER_ROUTE)
    },
    [router]
  )

  const consumePendingBlank = useCallback(() => {
    const mediumId = pendingBlankMediumRef.current
    pendingBlankMediumRef.current = null
    return mediumId
  }, [])

  useEffect(() => {
    return () => {
      revokeAttachmentUrls(attachmentsRef.current)
    }
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      prompt,
      setPrompt,
      attachments,
      addAttachments,
      removeAttachment,
      generateLayout,
      consumePendingGeneration,
      requestLayoutEdit,
      consumePendingEdit,
      startBlankLayout,
      consumePendingBlank,
    }),
    [
      addAttachments,
      attachments,
      close,
      consumePendingGeneration,
      consumePendingEdit,
      requestLayoutEdit,
      generateLayout,
      isOpen,
      open,
      prompt,
      removeAttachment,
      toggle,
      startBlankLayout,
      consumePendingBlank,
    ]
  )

  return (
    <CreateWithAiContext.Provider value={value}>
      {children}
    </CreateWithAiContext.Provider>
  )
}

export function useCreateWithAi() {
  const context = useContext(CreateWithAiContext)

  if (!context) {
    throw new Error("useCreateWithAi must be used within CreateWithAiProvider")
  }

  return context
}
