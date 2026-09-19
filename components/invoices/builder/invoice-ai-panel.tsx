"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Link2,
  Send,
  Square,
  X,
} from "lucide-react"

import { VisualEditToggle } from "@/components/invoices/builder/visual-edit-toggle"
import { AiAnswer } from "@/components/ai/ai-answer"
import { AiInAction } from "@/components/ai/ai-in-action"
import { AiQuestions } from "@/components/ai/ai-questions"
import { AiTodoList } from "@/components/ai/ai-todo-list"
import { StreamingText } from "@/components/ai/streaming-text"
import { AddElementsPanel } from "@/components/invoices/builder/add-elements-panel"
import { BrandBoardsPanel } from "@/components/invoices/builder/brand-boards-panel"
import { SavedItemsPanel } from "@/components/invoices/builder/saved-items-panel"
import { VersionHistoryPanel, PreviewVersionBanner } from "@/components/invoices/builder/version-history-panel"
import { AiWelcomeState } from "@/components/invoices/builder/ai-welcome-state"
import {
  BuilderAttachMenu,
  BuilderAttachmentStrip,
  BuilderComposerDropTarget,
  MEDIA_LIBRARY_UNAVAILABLE_MESSAGE,
} from "@/components/invoices/builder/builder-composer-attachments"
import { SubmittedAttachmentChip } from "@/components/invoices/prompt-attachment-chips"
import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AI_MODELS } from "@/lib/ai-models"
import {
  buildPostReasoning,
  buildReasoning,
  buildRecommendations,
  buildWorkingNarrative,
  workingPhaseFor,
} from "@/lib/builder-narrative"
import { getMediumName } from "@/lib/mediums-data"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import {
  PRODUCT_CLOSE_LABEL,
  PRODUCT_DISCLAIMER,
  PRODUCT_MESSAGE_LABEL,
  PRODUCT_NAME,
} from "@/lib/product-name"
import { cn } from "@/lib/utils"
import {
  builderComposerCanSend,
  planBuilderComposerSend,
  snapshotComposerAttachments,
  submittedAttachmentsForTurn,
} from "@/lib/builder-attachments"
import { analyzeReferenceImage } from "@/lib/reference-layout"
import { fileForPrimaryAnalysis } from "@/lib/reference-roles"
import type {
  BuilderAssistantMessage,
  BuilderMessage,
  BuilderReceivedAnswer,
  BuilderUserMessage,
} from "@/lib/layout-builder-types"
import {
  APPROACH_LABEL,
  CLARIFICATION_COMPOSER_PLACEHOLDER,
  NEEDS_CLARIFICATION_LABEL,
  UNDERSTANDING_LABEL,
  showsGlobalClarification,
} from "@/lib/clarification-copy"
import {
  applyConversationScroll,
  conversationOnContentChange,
  conversationOnEntry,
  conversationOnSubmit,
  conversationOnUserScroll,
  type ConversationScrollMetrics,
} from "@/lib/conversation-scroll"

/**
 * Figma: Sent (User chat message blob) — "Sent" (5625:23886) and
 * "Sent + Active" (5625:23889).
 *
 * The current turn ("active") gets a white surface with a purple border and
 * shadow; resting messages use the muted gray-blue surface. Long messages clamp
 * with a bottom fade.
 */
function UserMessageBubble({
  text,
  active,
}: {
  text: string
  active: boolean
}) {
  const clampRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  useLayoutEffect(() => {
    const node = clampRef.current
    if (!node) {
      return
    }
    setOverflowing(node.scrollHeight > node.clientHeight + 1)
  }, [text])

  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current)
      }
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current)
      }
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked (permissions / insecure context); ignore.
    }
  }, [text])

  return (
    // Hovering (or focusing the copy control) lifts the bubble and reveals the
    // copy affordance below it — Figma "Sent" hover state. The bubble hugs its
    // content and stays left-aligned rather than spanning the panel width.
    <div className="group/bubble flex w-fit max-w-full flex-col">
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border p-2 transition-all duration-150",
          "group-hover/bubble:-translate-y-0.5 group-focus-within/bubble:-translate-y-0.5",
          active
            ? "border-[#bdb4fe] bg-white shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)] group-hover/bubble:shadow-[0px_8px_16px_-4px_rgba(16,24,40,0.12),0px_4px_8px_-2px_rgba(16,24,40,0.08)]"
            : "border-[#d0d5dd] bg-[#fcfcfd] group-hover/bubble:border-[#bdb4fe] group-hover/bubble:shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]"
        )}
      >
        {/* Hugs content, then locks to exactly 3 lines (3 × 20px) once it
            overflows — Figma "Sent" bubble (32:448013). */}
        <div ref={clampRef} className="max-h-[60px] overflow-hidden">
          <p className="whitespace-pre-wrap font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#101828]">
            {text}
          </p>
        </div>
        {overflowing ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent",
              active ? "to-white" : "to-[#fcfcfd]"
            )}
          />
        ) : null}
      </div>
      {/* No reserved height at rest — the row collapses (0fr) so the bubble
          doesn't carry dead whitespace, and expands on hover/focus to reveal the
          copy control. */}
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-150 group-hover/bubble:grid-rows-[1fr] group-focus-within/bubble:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="flex justify-end pt-1 opacity-0 transition-opacity duration-150 group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100">
            <button
              type="button"
              aria-label={copied ? "Copied" : "Copy prompt"}
              onClick={handleCopy}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-[4px] outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5",
                copied
                  ? "text-[#5925dc]"
                  : "text-[#667085] hover:bg-[#f2f4f7] hover:text-[#101828]"
              )}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Asking-phase indicator (Figma 73:37885 / 7013:103918). When the assistant
 * pauses to ask, it first shows the clarification status with processing dots,
 * then settles while the docked questions await input.
 */
function AskingIndicator() {
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setWaiting(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  if (waiting) {
    return <AiInAction type="asking" label={NEEDS_CLARIFICATION_LABEL} />
  }

  return (
    <>
      <AiInAction type="asking" label={NEEDS_CLARIFICATION_LABEL} />
      <AiInAction type="processing" />
    </>
  )
}

/**
 * Live "in-action" status for the turn currently being generated: a streaming
 * "Thinking…" block. Completed turns persist their own static recap via
 * `AssistantTurn`, so this only handles the active reasoning/thinking phases.
 */
function AiStatusIndicator() {
  const {
    status,
    preReasoning,
    receivedAnswers,
    messages,
    todos,
    generatedLayout,
    mediumId,
  } = useLayoutBuilder()

  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const firstUser = messages.find((message) => message.role === "user")
  const userCount = messages.filter((message) => message.role === "user").length
  const isFollowUp = userCount > 1
  const prompt = lastUser?.text ?? ""
  const completedTodos = todos.filter((item) => item.status === "done").length
  const phase = workingPhaseFor(
    status,
    completedTodos,
    todos.length,
    isFollowUp
  )
  const request = {
    prompt,
    hasReference: (firstUser?.references.length ?? 0) > 0,
    isFollowUp,
    paperName: mediumId ? getMediumName(mediumId) : "A4",
    family: generatedLayout.style,
    receivedAnswers,
    phase,
  }
  const preThoughtText =
    preReasoning ??
    buildReasoning(prompt, { ...request, phase: "interpret" })
  const thinkingPhase =
    receivedAnswers && receivedAnswers.length > 0 && phase === "interpret"
      ? "decide"
      : phase
  const postThoughtText =
    receivedAnswers && receivedAnswers.length > 0
      ? buildPostReasoning(prompt, receivedAnswers, {
          ...request,
          phase: thinkingPhase,
        })
      : buildWorkingNarrative({ ...request, phase: thinkingPhase })

  // Stream while actively reasoning/thinking; once it pauses to ask questions,
  // collapse to the "Thought for Xs" summary above the docked questions.
  if (status === "reasoning") {
    return (
      <AiInAction type="thinking" defaultExpanded>
        <StreamingText text={preThoughtText} streaming viewportHeight={150} />
      </AiInAction>
    )
  }

  if (status === "asking") {
    return (
      <>
        <AiInAction type="thought" label={UNDERSTANDING_LABEL}>
          <StreamingText text={preThoughtText} />
        </AiInAction>
        <AskingIndicator />
      </>
    )
  }

  if (status === "thinking") {
    return (
      <AiInAction type="thinking" defaultExpanded>
        <StreamingText text={postThoughtText} streaming viewportHeight={150} />
      </AiInAction>
    )
  }

  return null
}

/**
 * Figma: AI in Action / "Received Answers" (7350:340337).
 *
 * A collapsible recap of the clarifying questions the user answered, behaving
 * like the "Thought for Ns" row — collapsed by default, expanding to a numbered
 * list of prompts with the chosen answers italicized beneath each one.
 */
function ClarificationAcknowledgement({
  items,
}: {
  items: BuilderReceivedAnswer[]
}) {
  const lines = items
    .map((item) => item.acknowledgement)
    .filter((line): line is string => Boolean(line))
  if (lines.length === 0) {
    return null
  }

  return (
    <p className="font-[family-name:var(--font-inter)] text-[13px] font-medium leading-[18px] text-[#3e1c96]">
      {lines[lines.length - 1]}
    </p>
  )
}

/**
 * A completed assistant turn rendered into the transcript: the answer recap (if
 * the turn asked questions), the collapsible reasoning recap, the finished plan,
 * and the streamed closing response — so the full context stays on screen after
 * the to-dos finish.
 */
function AssistantTurn({
  message,
  isCurrent,
}: {
  message: BuilderAssistantMessage
  isCurrent: boolean
}) {
  const {
    sendMessage,
    status,
    generatedLayout,
    previewVersionId,
    previewVersion,
    exitVersionPreview,
    restoreVersion,
    hasVersionSnapshot,
    showFeedbackToast,
    showCanvasToast,
  } = useLayoutBuilder()
  const hasAnswers =
    message.receivedAnswers && message.receivedAnswers.length > 0
  const isPreviewing = previewVersionId === message.id
  const canPreviewVersion = hasVersionSnapshot(message.id)
  // The current turn's chips are derived live from the document so a suggestion
  // that's already been applied (e.g. notes added) never lingers; older turns
  // keep their frozen list (and don't render chips anyway).
  const recommendations = isCurrent
    ? buildRecommendations(generatedLayout)
    : (message.recommendations ?? [])

  return (
    <div className="flex flex-col gap-3">
      {hasAnswers && message.preReasoning ? (
        <AiInAction type="thought" label={UNDERSTANDING_LABEL}>
          <StreamingText text={message.preReasoning} />
        </AiInAction>
      ) : null}
      {hasAnswers ? (
        <ClarificationAcknowledgement items={message.receivedAnswers!} />
      ) : null}
      <AiInAction type="thought" label={APPROACH_LABEL}>
        <StreamingText text={message.reasoning} />
      </AiInAction>
      <AiTodoList items={message.todos} />
      {/* Next-step suggestion tags render inside the answer, between the body
          and the toolbar (Figma 3312:63712) — only on the latest settled turn so
          stale suggestions from earlier turns don't linger. */}
      <AiAnswer
        text={message.summary}
        streaming
        isCurrentVersion={isCurrent}
        isPreviewing={isPreviewing}
        canPreviewVersion={canPreviewVersion}
        onPreviewVersion={() => previewVersion(message.id)}
        onExitPreview={exitVersionPreview}
        onRestoreVersion={() => {
          restoreVersion(message.id)
          showCanvasToast("Reverted to this version")
        }}
        onFeedback={showFeedbackToast}
        recommendations={
          isCurrent && status === "ready" ? recommendations : undefined
        }
        onSelectRecommendation={sendMessage}
      />
    </div>
  )
}

/**
 * Inline generation-failure notice (Figma error state). A muted, low-alarm
 * message — the layout on the canvas is untouched — with a single Retry that
 * re-runs the last prompt. Sits in the thread where the response would have been.
 */
function ThreadErrorNotice({
  message,
  onRetry,
}: {
  message: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col gap-2" role="alert">
      <p className="flex items-center gap-1.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#475467]">
        <span aria-hidden>😕</span>
        That didn&rsquo;t work
      </p>
      <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
        {message ?? "Looks like something went off track. Give it another try."}
      </p>
      <div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-7 items-center justify-center rounded-[6px] border border-[#d6bbfb] bg-white px-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#5925dc] outline-none transition-colors hover:border-[#6938ef] hover:bg-[#6938ef] hover:text-white focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

function AiComposer() {
  const {
    sendMessage,
    status,
    stopGeneration,
    questions,
    clarificationAskedCount,
    clarificationAskableCount,
    clarificationSurface,
    submitAnswers,
    skipQuestions,
    messages,
    selections,
    removeSelection,
    clearSelections,
    isBlankSession,
    previewVersionId,
    exitVersionPreview,
    promptFocusToken,
    hasGeneratedOnce,
    showFeedbackToast,
    composerDraftText,
    composerDraftAttachments,
    composerDraftModelId,
    setComposerDraftText,
    setComposerDraftModelId,
    addComposerDraftFiles,
    removeComposerDraftAttachment,
    setComposerDraftPrimary,
    clearComposerDraft,
    composerDraftPrimaryReferenceId,
  } = useLayoutBuilder()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const value = composerDraftText
  const attachments = composerDraftAttachments
  const addFiles = addComposerDraftFiles
  const remove = removeComposerDraftAttachment
  const clear = clearComposerDraft
  const modelId = composerDraftModelId
  const setModelId = setComposerDraftModelId

  // Model picker appears once the docked composer is in play (generated layout
  // or blank build-from-scratch). Edit only after there is something on canvas.
  const hasGenerated =
    status === "ready" || messages.some((message) => message.role === "assistant")
  const showComposerActions = hasGenerated || isBlankSession
  const activeModel =
    AI_MODELS.find((model) => model.id === modelId) ?? AI_MODELS[0]

  const syncHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  useLayoutEffect(() => {
    syncHeight()
  }, [syncHeight, value, attachments.length])

  // Canvas "Generate with AI" CTA focuses the docked composer when it owns
  // the prompt during a blank welcome with canvas content.
  useEffect(() => {
    if (promptFocusToken > 0) {
      textareaRef.current?.focus()
    }
  }, [promptFocusToken])

  const isGenerating = status === "thinking"
  const isReasoning = status === "reasoning"
  const isAsking = status === "asking"
  // Questions for a scoped edit render inside the edits overlay (attached to the
  // selected layer), so the left composer suppresses its own questions stencil
  // for that case — but still shows them if the overlay isn't on that layer.
  const scopedQuestionInOverlay =
    isAsking && !showsGlobalClarification(clarificationSurface)
  const isBusy =
    isGenerating || isReasoning || scopedQuestionInOverlay
  const canSend = builderComposerCanSend({
    text: value,
    attachmentCount: attachments.length,
    status,
    scopedQuestionLocksComposer: scopedQuestionInOverlay,
  })

  const handleSend = () => {
    if (!canSend) {
      return
    }
    const plan = planBuilderComposerSend({
      text: value,
      attachmentCount: attachments.length,
      status,
    })
    if (plan === "ignore") {
      return
    }
    if (plan === "clarify") {
      sendMessage(value)
      setComposerDraftText("")
      return
    }

    const draft = attachments
    const prompt = value
    void (async () => {
      let referenceAnalysis = undefined
      if (!hasGeneratedOnce) {
        const primaryFile = fileForPrimaryAnalysis(
          draft,
          composerDraftPrimaryReferenceId
        )
        if (primaryFile) {
          try {
            referenceAnalysis = await analyzeReferenceImage(primaryFile)
          } catch {
            referenceAnalysis = undefined
          }
        }
      }
      const submitted = await snapshotComposerAttachments(draft)
      const queued = sendMessage(prompt, submitted, {
        referenceAnalysis,
        primaryReferenceId: hasGeneratedOnce
          ? undefined
          : composerDraftPrimaryReferenceId,
      })
      if (!queued) {
        return
      }
      setComposerDraftText("")
      clearSelections()
      clear()
    })()
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      <div className="flex w-full flex-col items-center gap-2">
        {/* Questions stencil docks as a narrower panel resting on the wider
            composer (Figma: Prompt Stencil / User Input Form, 5620:8702). */}
        <div className="flex w-full flex-col">
          {/* Version-preview banner stacks just above the prompt input, sharing
              the composer's 16px gutter so it aligns with the input width
              (Figma 3247:62513 — "pending changes" bar). */}
          {previewVersionId && status === "ready" ? (
            <div className="mb-1.5 w-full">
              <PreviewVersionBanner onExit={exitVersionPreview} />
            </div>
          ) : null}
          {isAsking && !scopedQuestionInOverlay ? (
            <div className="w-full px-2">
              <AiQuestions
                key={questions.map((question) => question.id).join("|")}
                docked
                questions={questions}
                progressAskedCount={clarificationAskedCount}
                progressAskableCount={clarificationAskableCount}
                onComplete={submitAnswers}
                onUseJudgment={skipQuestions}
              />
            </div>
          ) : null}

          <BuilderComposerDropTarget
            disabled={isBusy}
            onFiles={addFiles}
            className={cn(
              "flex w-full flex-col gap-2.5 rounded-lg border p-2 transition-colors duration-150 ease-out motion-reduce:transition-none",
              // Muted while questions are docked here, active otherwise (incl.
              // when questions moved to the edits overlay). Focusing the input
              // always promotes it to the active (white + purple) state.
              isAsking && !scopedQuestionInOverlay
                ? "border-[#eaecf0] bg-[#f9fafb]"
                : "border-[#9b8afb] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]",
              "focus-within:border-[#9b8afb] focus-within:bg-white focus-within:shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]"
            )}
          >
          <div className="flex flex-wrap items-center gap-1">
            <span
              className="inline-flex size-[22px] items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white text-[#667085]"
              aria-hidden
            >
              <AtSign className="size-3.5" />
            </span>
            {selections.map((selection) => (
              <span
                key={selection.id}
                className="inline-flex h-[22px] shrink-0 items-center gap-0.5 rounded-[4px] bg-[#f2f4f7] py-0.5 pl-2 pr-1 font-[family-name:var(--font-inter)] text-xs font-medium leading-5 text-[#475467]"
              >
                <Link2 className="size-3.5 shrink-0 text-[#667085]" aria-hidden />
                {selection.label}
                <button
                  type="button"
                  aria-label={`Remove ${selection.label}`}
                  onClick={() => removeSelection(selection.id)}
                  className="inline-flex size-4 items-center justify-center rounded-[3px] text-[#98a2b3] outline-none transition-colors hover:bg-[#e4e7ec] hover:text-[#344054] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>

          <label className="sr-only" htmlFor="builder-composer">
            {PRODUCT_MESSAGE_LABEL}
          </label>
          <textarea
            ref={textareaRef}
            id="builder-composer"
            value={value}
            onChange={(event) => setComposerDraftText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            disabled={isBusy}
            placeholder={
              isAsking
                ? CLARIFICATION_COMPOSER_PLACEHOLDER
                : "Plan, build, modify anything..."
            }
            className={cn(
              "w-full resize-none border-0 bg-transparent p-0 outline-none",
              "font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#101828]",
              "placeholder:text-[#98a2b3] caret-[#6938ef]",
              isBusy && "cursor-not-allowed"
            )}
          />

          <BuilderAttachmentStrip
            attachments={attachments}
            onRemove={remove}
            primaryReferenceId={
              hasGeneratedOnce ? null : composerDraftPrimaryReferenceId
            }
            showReferenceRoles={!hasGeneratedOnce}
            onSetPrimary={
              hasGeneratedOnce ? undefined : setComposerDraftPrimary
            }
          />

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <BuilderAttachMenu
                disabled={isBusy}
                onPickFiles={addFiles}
                onMediaLibrary={() =>
                  showFeedbackToast(MEDIA_LIBRARY_UNAVAILABLE_MESSAGE)
                }
              />

              <VisualEditToggle />
            </div>

            <div className="min-w-px flex-1" />

            {showComposerActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex h-6 items-center justify-center gap-1 rounded-[4px] border border-[#f9fafb] bg-[#f9fafb] px-1.5 outline-none transition-colors",
                    "text-xs font-semibold leading-[17px] text-[#475467] hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                  )}
                  aria-label="Select AI model"
                >
                  {activeModel.name}
                  <ChevronDown className="size-3.5 text-[#667085]" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[260px] font-[family-name:var(--font-inter)]"
                >
                  {AI_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onSelect={() => setModelId(model.id)}
                      className={cn(
                        "flex-col items-start gap-0.5 rounded-md px-3 py-2",
                        model.id === modelId && "bg-[#f4f3ff] focus:bg-[#f4f3ff]"
                      )}
                    >
                      <span className="text-sm font-semibold text-[#101828]">
                        {model.name}
                      </span>
                      <span className="text-[13px] leading-[18px] text-[#667085]">
                        {model.description}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {isBusy ? (
              <button
                type="button"
                aria-label={isGenerating ? "Stop generating" : "Stop thinking"}
                onClick={stopGeneration}
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-[4px] border border-[#b54708] bg-white text-[#b54708] outline-none transition-colors",
                  "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#fffaf5] focus-visible:ring-2 focus-visible:ring-[#b54708]/40"
                )}
              >
                <Square className="size-3.5 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send message"
                disabled={!canSend}
                onClick={handleSend}
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-[4px] border outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                  canSend
                    ? "border-[#6938ef] bg-[#6938ef] text-white hover:bg-[#5925dc]"
                    : "cursor-not-allowed border-[#d9d6fe] bg-[#d9d6fe] text-white"
                )}
              >
                <Send className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        </BuilderComposerDropTarget>
        </div>

        <p className="text-center font-[family-name:var(--font-inter)] text-xs font-normal leading-4 text-[#475467]">
          {PRODUCT_DISCLAIMER}
        </p>
      </div>
    </div>
  )
}

/** A user prompt paired with the assistant turn that answers it. */
type ConversationTurn = {
  user: BuilderUserMessage | null
  assistant: BuilderAssistantMessage | null
}

/**
 * Pairs each user prompt with the assistant turn that follows it so a turn can
 * be rendered as one sticky group (prompt pinned to the top, response beneath).
 */
function groupTurns(messages: BuilderMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = []
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ user: message, assistant: null })
      continue
    }
    const open = turns[turns.length - 1]
    if (open && !open.assistant) {
      open.assistant = message
    } else {
      turns.push({ user: null, assistant: message })
    }
  }
  return turns
}

/**
 * Figma: Layout Builder — Invoice AI panel (3181:33796 / 3147:22259 …)
 */
export function InvoiceAiPanel({
  onClose,
  width = 360,
}: {
  onClose: () => void
  width?: number
}) {
  const {
    messages,
    todos,
    status,
    errorMessage,
    retryGeneration,
    feedbackToast,
    preReasoning,
    receivedAnswers,
    addingElement,
    browsingSavedItems,
    browsingBrand,
    browsingVersionHistory,
    closeAddElements,
    closeBrandBoards,
    closeSavedItems,
    closeVersionHistory,
    isBlankSession,
    placedElements,
  } = useLayoutBuilder()
  const scrollRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const stickToLatestRef = useRef(true)
  const applyingScrollRef = useRef(false)
  const adding = addingElement
  const branding = browsingBrand
  const library = browsingSavedItems
  const history = browsingVersionHistory
  const panelTitle = adding
    ? "Add elements"
    : library
      ? "Saved items"
      : branding
        ? "Brand boards"
        : history
          ? "Version history"
          : PRODUCT_NAME
  const hasUserPrompt = messages.some((message) => message.role === "user")
  const welcomeHasCanvasContent = placedElements.length > 0
  // "Start from blank" welcome state (Figma 3268:37411) — greeting + suggestions
  // + prompt input. Stays up until the first prompt is sent; canvas actions
  // (drop elements, open properties, edit mode) do not dismiss it. Yields only
  // to the Add elements palette. Once elements exist, the docked composer
  // (Edit + layer badges) takes over the prompt while the welcome hero stays.
  const blankWelcome = isBlankSession && !hasUserPrompt && !adding && !branding && !library && !history
  const showComposer = (!blankWelcome || welcomeHasCanvasContent) && !branding && !library && !history
  const turns = groupTurns(messages)
  const isBusy =
    status === "reasoning" || status === "asking" || status === "thinking"
  const showChat = !adding && !branding && !library && !history && !blankWelcome
  const hasHistory = turns.length > 0
  const userTurnCount = turns.filter((turn) => turn.user).length
  const prevUserTurnCount = useRef(userTurnCount)

  const readMetrics = (): ConversationScrollMetrics | null => {
    const node = scrollRef.current
    if (!node) {
      return null
    }
    return {
      scrollTop: node.scrollTop,
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }
  }

  const alignIfNeeded = (alignToLatest: boolean) => {
    const node = scrollRef.current
    const metrics = readMetrics()
    if (!node || !metrics) {
      return
    }
    const next = applyConversationScroll(metrics, {
      stickToLatest: stickToLatestRef.current,
      alignToLatest,
    })
    if (next == null || next === node.scrollTop) {
      return
    }
    applyingScrollRef.current = true
    node.scrollTop = next
    applyingScrollRef.current = false
  }

  useLayoutEffect(() => {
    if (!showChat) {
      stickToLatestRef.current = true
      return
    }
    const node = scrollRef.current
    const content = transcriptRef.current
    if (!node) {
      return
    }
    const entry = conversationOnEntry(hasHistory)
    stickToLatestRef.current = entry.stickToLatest
    alignIfNeeded(entry.alignToLatest)

    const onResize = () => {
      const decision = conversationOnContentChange(stickToLatestRef.current)
      alignIfNeeded(decision.alignToLatest)
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(node)
    if (content) {
      observer.observe(content)
    }
    return () => observer.disconnect()
  }, [showChat, hasHistory])

  useLayoutEffect(() => {
    if (userTurnCount > prevUserTurnCount.current) {
      const decision = conversationOnSubmit()
      stickToLatestRef.current = decision.stickToLatest
      alignIfNeeded(decision.alignToLatest)
    }
    prevUserTurnCount.current = userTurnCount
  }, [userTurnCount])

  return (
    <aside
      style={{ width }}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]"
    >
      <div
        className={cn(
          "flex flex-col gap-3 px-4 pt-4",
          blankWelcome && !welcomeHasCanvasContent ? "pb-4" : "pb-0"
        )}
      >
        <div className="flex items-center gap-2">
          {!adding && !branding && !library && !history ? (
            <AutoAwesomeIcon className="size-4 shrink-0 text-[#6938ef]" />
          ) : null}
          <p className="min-w-0 flex-1 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            {panelTitle}
          </p>
          <button
            type="button"
            aria-label={
              adding
                ? "Close add elements"
                : library
                  ? "Close saved items"
                  : branding
                    ? "Close Brand boards"
                    : history
                      ? "Close Version history"
                      : PRODUCT_CLOSE_LABEL
            }
            onClick={
              adding
                ? closeAddElements
                : library
                  ? () => {
                      closeSavedItems()
                      onClose()
                    }
                  : branding
                    ? closeBrandBoards
                    : history
                      ? closeVersionHistory
                      : onClose
            }
            className="inline-flex size-5 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {adding ? (
        <AddElementsPanel />
      ) : library ? (
        <SavedItemsPanel />
      ) : branding ? (
        <BrandBoardsPanel />
      ) : history ? (
        <VersionHistoryPanel />
      ) : blankWelcome ? (
        <AiWelcomeState dockedComposer={welcomeHasCanvasContent} />
      ) : (
      <div
        ref={scrollRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4"
        onScroll={() => {
          if (applyingScrollRef.current) {
            return
          }
          const metrics = readMetrics()
          if (!metrics) {
            return
          }
          stickToLatestRef.current = conversationOnUserScroll(metrics).stickToLatest
        }}
      >
        <div ref={transcriptRef} className="flex flex-col gap-3">
        {turns.map((turn, index) => {
          const isLast = index === turns.length - 1
          const isActiveTurn = isLast && isBusy
          const user = turn.user

          return (
            <div
              key={user?.id ?? turn.assistant?.id ?? index}
              className="flex flex-col gap-3"
            >
              {user ? (
                // Sticky prompt header — stays at the top of the viewport while
                // its response streams below (Cursor's per-turn pinning). The
                // opaque band masks content scrolling underneath.
                <div className="sticky top-0 z-10 -mx-4 flex flex-col items-end gap-3 bg-white px-4 pb-1 pt-4">
                  {submittedAttachmentsForTurn(user).length > 0 ? (
                    <div className="flex max-w-full flex-wrap justify-end gap-1.5">
                      {submittedAttachmentsForTurn(user).map((attachment) => (
                        <SubmittedAttachmentChip
                          key={attachment.id}
                          attachment={attachment}
                          isPrimary={
                            attachment.id === user.primaryReferenceId
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                  {user.text ? (
                    <UserMessageBubble text={user.text} active={isActiveTurn} />
                  ) : null}
                </div>
              ) : null}

              {turn.assistant ? (
                <AssistantTurn message={turn.assistant} isCurrent={isLast} />
              ) : null}

              {/* Generation failure (Figma error state): friendly inline notice
                  with a retry, shown in place of the response on the last turn. */}
              {isLast && status === "error" ? (
                <ThreadErrorNotice
                  message={errorMessage}
                  onRetry={retryGeneration}
                />
              ) : null}

              {isActiveTurn ? (
                <>
                  {status === "thinking" &&
                  receivedAnswers &&
                  receivedAnswers.length > 0 &&
                  preReasoning ? (
                    <AiInAction type="thought" label={UNDERSTANDING_LABEL}>
                      <StreamingText text={preReasoning} />
                    </AiInAction>
                  ) : null}
                  {receivedAnswers && receivedAnswers.length > 0 ? (
                    <ClarificationAcknowledgement items={receivedAnswers} />
                  ) : null}
                  <AiStatusIndicator />
                  <AiTodoList items={todos} />
                </>
              ) : null}
            </div>
          )
        })}
        </div>
      </div>
      )}

      {/* The docked composer stays visible while the Add elements palette is
          open (Figma 3147:23660). Hidden only in the blank welcome state
          before anything is on canvas — welcome carries its own prompt then.
          Once elements exist, the composer returns with Edit + layer badges. */}
      {showComposer ? (
        <div className="relative flex flex-col gap-2">
          {feedbackToast ? <FeedbackToast message={feedbackToast} /> : null}
          <AiComposer />
        </div>
      ) : null}
    </aside>
  )
}

/**
 * Transient confirmation pill floating just above the composer (Figma feedback
 * toast). Green success treatment; auto-dismissed by the context timer.
 */
function FeedbackToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-full z-20 flex justify-center px-4 pb-2">
      <div className="animate-in fade-in-0 slide-in-from-bottom-1 flex items-center gap-1.5 rounded-[8px] border border-[#6ce9a6] bg-[#ecfdf3] py-1.5 pl-2.5 pr-3 shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]">
        <CheckCircle2 className="size-4 shrink-0 text-[#027a48]" aria-hidden />
        <span className="font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#027a48]">
          {message}
        </span>
      </div>
    </div>
  )
}
