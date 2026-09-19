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
import { detectBuilderMediumFromText, getDefaultBuilderMediumId } from "@/lib/mediums-data"
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
import { resolveGenerationPrompt } from "@/lib/composer-copy"
import {
  appendAttachments,
  attachmentFeedbackMessages,
  imageAttachmentsForSubmission,
  imagePreviewForAttachment,
  removeAttachmentById,
  revokeAttachmentUrls,
  revokePreviewUrl,
} from "@/lib/prompt-attachments"
import {
  fileForPrimaryAnalysis,
  primaryAfterAppend,
  primaryAfterRemove,
  resolvePrimaryReferenceId,
} from "@/lib/reference-roles"
import { snapshotComposerAttachments } from "@/lib/builder-attachments"
import {
  analyzeReferenceImage,
  type ReferenceAnalysis,
} from "@/lib/reference-layout"

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
  primaryReferenceId: string | null
  setPrimaryReferenceId: (id: string) => void
  mediumId: string
  setMediumId: (id: string) => void
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
  const [primaryReferenceId, setPrimaryReferenceIdState] = useState<
    string | null
  >(null)
  const [mediumId, setMediumId] = useState(() => getDefaultBuilderMediumId())

  attachmentsRef.current = attachments

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((current) => !current), [])

  const addAttachments = useCallback((files: File[]) => {
    if (files.length === 0) {
      return
    }

    const result = appendAttachments(
      attachmentsRef.current,
      files,
      imagePreviewForAttachment
    )
    setAttachments(result.next)
    setPrimaryReferenceIdState((current) =>
      primaryAfterAppend(current, result.next)
    )
    for (const message of attachmentFeedbackMessages(result)) {
      showError(message)
    }
  }, [showError])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const { next, removed } = removeAttachmentById(current, id)
      revokePreviewUrl(removed?.previewUrl)
      setPrimaryReferenceIdState((primary) => primaryAfterRemove(primary, next))
      return next
    })
  }, [])

  const setPrimaryReferenceId = useCallback((id: string) => {
    setPrimaryReferenceIdState((current) =>
      resolvePrimaryReferenceId(attachmentsRef.current, id) ?? current
    )
  }, [])

  const generateLayout = useCallback(
    async ({ mediumId: requestedMediumId, modelId }: CreateWithAiGenerateRequest) => {
      const imageAttachments = imageAttachmentsForSubmission(attachments)
      const trimmedPrompt = resolveGenerationPrompt(
        prompt,
        imageAttachments.length > 0
      )

      if (!trimmedPrompt) {
        return
      }

      const resolvedPickerId = requestedMediumId || mediumId
      if (!resolvedPickerId) {
        showError(CREATE_WITH_AI_MEDIUM_REQUIRED_MESSAGE)
        return
      }

      const resolvedPrimaryId = resolvePrimaryReferenceId(
        attachments,
        primaryReferenceId
      )

      const payload: CreateWithAiGenerateInput = {
        prompt: trimmedPrompt,
        referenceImages: imageAttachments.map((attachment) => attachment.file),
        primaryReferenceId: resolvedPrimaryId,
        mediumId: resolvedPickerId,
        modelId,
      }

      void payload

      primeCompletionSound()

      const resolvedMediumId =
        detectBuilderMediumFromText(trimmedPrompt) ?? resolvedPickerId

      let referenceAnalysis: ReferenceAnalysis | undefined
      const primaryFile = fileForPrimaryAnalysis(attachments, resolvedPrimaryId)
      if (primaryFile) {
        try {
          referenceAnalysis = await analyzeReferenceImage(primaryFile)
        } catch {
          referenceAnalysis = undefined
        }
      }

      const submitted = await snapshotComposerAttachments(attachments)

      pendingGenerationRef.current = {
        prompt: trimmedPrompt,
        mediumId: resolvedMediumId,
        modelId,
        references: submitted
          .filter((attachment) => attachment.kind === "image")
          .map((attachment) => ({
            id: attachment.id,
            name: attachment.name,
            previewUrl: attachment.previewUrl,
          })),
        attachments: submitted,
        primaryReferenceId: resolvedPrimaryId,
        referenceAnalysis,
      }

      revokeAttachmentUrls(attachments)
      setAttachments([])
      setPrimaryReferenceIdState(null)
      setPrompt("")
      setIsOpen(false)

      router.push(LAYOUT_BUILDER_ROUTE)
    },
    [attachments, mediumId, primaryReferenceId, prompt, router, showError]
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
      primaryReferenceId,
      setPrimaryReferenceId,
      mediumId,
      setMediumId,
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
      mediumId,
      open,
      primaryReferenceId,
      prompt,
      removeAttachment,
      setPrimaryReferenceId,
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
