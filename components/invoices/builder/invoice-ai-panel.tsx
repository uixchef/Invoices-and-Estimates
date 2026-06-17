"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  ImageIcon,
  Link2,
  MousePointerClick,
  Paperclip,
  Send,
  Square,
  Upload,
  X,
} from "lucide-react"

import { AiAnswer } from "@/components/ai/ai-answer"
import { AiInAction } from "@/components/ai/ai-in-action"
import { AiQuestions } from "@/components/ai/ai-questions"
import { AiTodoList } from "@/components/ai/ai-todo-list"
import { StreamingText } from "@/components/ai/streaming-text"
import { AddElementsPanel } from "@/components/invoices/builder/add-elements-panel"
import { AiWelcomeState } from "@/components/invoices/builder/ai-welcome-state"
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
} from "@/lib/builder-narrative"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import type {
  BuilderAssistantMessage,
  BuilderMessage,
  BuilderReceivedAnswer,
  BuilderUserMessage,
} from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

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
 * pauses to ask, it first shows "Asking questions…" with the processing dots,
 * then settles into "Waiting for answer…" while the docked questions await input.
 */
function AskingIndicator() {
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setWaiting(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  if (waiting) {
    return <AiInAction type="asking" label="Waiting for answer..." />
  }

  return (
    <>
      <AiInAction type="asking" label="Asking questions..." />
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
    preThoughtDurationSec,
    preReasoning,
    receivedAnswers,
    messages,
  } = useLayoutBuilder()

  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const prompt = lastUser?.text ?? ""
  const preThoughtText = preReasoning ?? buildReasoning(prompt)
  const postThoughtText =
    receivedAnswers && receivedAnswers.length > 0
      ? buildPostReasoning(prompt, receivedAnswers)
      : buildReasoning(prompt)

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
        <AiInAction type="thought" durationSec={preThoughtDurationSec ?? 0}>
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
function ReceivedAnswers({ items }: { items: BuilderReceivedAnswer[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <AiInAction type="received-answers">
      <ol className="flex list-decimal flex-col gap-1.5 pl-[18px]">
        {items.map((item, index) => (
          <li key={index} className="space-y-0.5">
            <span className="leading-[17px]">{item.prompt}</span>
            {item.values.length === 1 ? (
              <p className="italic leading-[17px]">{item.values[0]}</p>
            ) : (
              <ul className="list-disc pl-[18px]">
                {item.values.map((value, valueIndex) => (
                  <li key={valueIndex} className="italic leading-[17px]">
                    {value}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </AiInAction>
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
        <AiInAction type="thought" durationSec={message.preDurationSec ?? 0}>
          <StreamingText text={message.preReasoning} />
        </AiInAction>
      ) : null}
      {hasAnswers ? (
        <ReceivedAnswers items={message.receivedAnswers!} />
      ) : null}
      <AiInAction type="thought" durationSec={message.durationSec}>
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
    submitAnswers,
    skipQuestions,
    messages,
    editMode,
    toggleEditMode,
    isCodeDetached,
    inspectingLayer,
    inspectLayer,
    aiEditingLayer,
    selections,
    removeSelection,
    clearSelections,
    isBlankSession,
    previewVersionId,
    exitVersionPreview,
  } = useLayoutBuilder()
  const [value, setValue] = useState("")
  const [modelId, setModelId] = useState(AI_MODELS[0].id)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // The Edit / model actions appear once there's a generated layout to act on,
  // and also in a blank build-from-scratch session where elements are dropped
  // directly onto the page — the composer stays identical to the AI flow.
  const hasGenerated =
    status === "ready" || messages.some((message) => message.role === "assistant")
  const showComposerActions = hasGenerated || isBlankSession
  // The Edit toggle reads active whenever a layer's Visual edits panel is open —
  // in the AI flow that always implies edit mode; the blank flow opens the
  // inspector directly, so fold the inspecting state into the active look too.
  const editActive = editMode || inspectingLayer !== null
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
  }, [syncHeight, value])

  const isGenerating = status === "thinking"
  const isReasoning = status === "reasoning"
  const isAsking = status === "asking"
  // Questions for a scoped edit render inside the edits overlay (attached to the
  // selected layer), so the left composer suppresses its own questions stencil
  // for that case — but still shows them if the overlay isn't on that layer.
  const scopedQuestionInOverlay =
    isAsking && aiEditingLayer !== null && aiEditingLayer === inspectingLayer
  const isBusy = isGenerating || isReasoning
  const canSend = value.trim().length > 0 && !isBusy

  const handleSend = () => {
    if (!canSend) {
      return
    }
    sendMessage(value)
    setValue("")
    clearSelections()
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
                onComplete={submitAnswers}
                onSkip={skipQuestions}
              />
            </div>
          ) : null}

          <div
            className={cn(
              "flex w-full flex-col gap-2.5 rounded-lg border p-2 transition-colors",
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
            Message Invoice AI
          </label>
          <textarea
            ref={textareaRef}
            id="builder-composer"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            disabled={isBusy}
            placeholder="Plan, build, modify anything..."
            className={cn(
              "w-full resize-none border-0 bg-transparent p-0 outline-none",
              "font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#101828]",
              "placeholder:text-[#98a2b3] caret-[#6938ef]",
              isBusy && "cursor-not-allowed"
            )}
          />

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                multiple
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(event) => {
                  event.target.value = ""
                }}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Attach file"
                    disabled={isBusy}
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-[4px] text-[#667085] outline-none transition-colors",
                      "hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                      "disabled:cursor-not-allowed disabled:text-[#d0d5dd] disabled:hover:bg-transparent"
                    )}
                  >
                    <Paperclip className="size-4" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-[220px]"
                >
                  <DropdownMenuItem
                    className="gap-2.5 px-3 py-2"
                    onSelect={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4 text-[#667085]" aria-hidden />
                    <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
                      Upload file
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2.5 px-3 py-2">
                    <ImageIcon className="size-4 text-[#667085]" aria-hidden />
                    <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
                      Add from media library
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Visual edit toggle (Figma 3191:71120 / 3192:71293): gray at
                  rest, purple while editing the invoice directly. */}
              {showComposerActions ? (
                <button
                  type="button"
                  aria-pressed={editActive}
                  onClick={() => {
                    // One click should always exit the active state: close the
                    // open inspector directly when edit mode isn't what's driving
                    // it (blank flow), otherwise toggle edit mode as usual.
                    if (inspectingLayer !== null && !editMode) {
                      inspectLayer(null)
                    } else {
                      toggleEditMode()
                    }
                  }}
                  disabled={isCodeDetached}
                  title={
                    isCodeDetached
                      ? "Revert to layout to use visual edits"
                      : undefined
                  }
                  className={cn(
                    "inline-flex h-6 items-center justify-center gap-1 rounded-[4px] border px-1.5 outline-none transition-colors",
                    "text-xs font-semibold leading-[17px] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                    "disabled:cursor-not-allowed disabled:border-[#f9fafb] disabled:bg-[#f2f4f7] disabled:text-[#d0d5dd]",
                    editActive
                      ? "border-[#f4f3ff] bg-[#ebe9fe] text-[#5925dc]"
                      : "border-[#f9fafb] bg-[#f2f4f7] text-[#475467] hover:bg-[#eaecf0]"
                  )}
                >
                  <MousePointerClick className="size-3.5" aria-hidden />
                  Edit
                </button>
              ) : null}
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
        </div>
        </div>

        <p className="text-center font-[family-name:var(--font-inter)] text-xs font-normal leading-4 text-[#475467]">
          Invoice AI can make mistakes. Please double-check responses.
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
    preThoughtDurationSec,
    preReasoning,
    receivedAnswers,
    inspectingLayer,
    addingElement,
    closeAddElements,
    editMode,
    toggleEditMode,
    isBlankSession,
  } = useLayoutBuilder()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inspecting = inspectingLayer !== null
  const adding = addingElement
  // Edit mode is on but nothing is selected yet — show the educational empty
  // state prompting the user to pick an element on the canvas (Figma 3249:58583).
  const editsEmpty = editMode && !inspecting && !adding
  // "Start from blank" welcome state (Figma 3268:37411) — greeting + suggestions
  // + prompt input. Yields to the palette/inspector if the user opens those.
  const blankWelcome =
    isBlankSession && status === "idle" && !inspecting && !adding && !editsEmpty
  const lastTurnRef = useRef<HTMLDivElement>(null)
  // Drives the spacer min-height on the latest turn so its prompt can always be
  // scrolled to the very top of the viewport, the way Cursor pins each turn.
  const [viewportHeight, setViewportHeight] = useState(0)

  const turns = groupTurns(messages)
  const isBusy =
    status === "reasoning" || status === "asking" || status === "thinking"

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (!node) {
      return
    }
    const measure = () => setViewportHeight(node.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // On each new prompt, jump the latest turn to the top of the viewport (rather
  // than the bottom) so the sticky prompt header leads the streaming response.
  const userTurnCount = turns.filter((turn) => turn.user).length
  const prevUserTurnCount = useRef(userTurnCount)
  useLayoutEffect(() => {
    if (userTurnCount > prevUserTurnCount.current) {
      const node = scrollRef.current
      const last = lastTurnRef.current
      if (node && last) {
        node.scrollTop = last.offsetTop
      }
    }
    prevUserTurnCount.current = userTurnCount
  }, [userTurnCount])

  // Entering the chat (open builder / return from the inspector) should land on
  // the latest turn, not scrolled to the top replaying the whole history. Pin
  // the last turn to the top of the viewport — the same resting place as a new
  // prompt — once per entry. The flag resets whenever the chat is hidden.
  const showChat = !adding && !inspecting && !blankWelcome && !editsEmpty
  const didEntryScrollRef = useRef(false)
  useLayoutEffect(() => {
    if (!showChat) {
      didEntryScrollRef.current = false
      return
    }
    if (didEntryScrollRef.current) {
      return
    }
    const node = scrollRef.current
    const last = lastTurnRef.current
    if (!node || turns.length === 0) {
      return
    }
    node.scrollTop = last ? last.offsetTop : node.scrollHeight
    didEntryScrollRef.current = true
    // Keep the new-prompt baseline in sync so it doesn't double-jump this render.
    prevUserTurnCount.current = userTurnCount
  }, [showChat, turns.length, viewportHeight, userTurnCount])

  return (
    <aside
      style={{ width }}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]"
    >
      <div
        className={cn(
          "flex flex-col gap-3 px-4 pt-4",
          blankWelcome ? "pb-4" : "pb-0"
        )}
      >
        <div className="flex items-center gap-2">
          {!adding && !editsEmpty ? (
            <AutoAwesomeIcon className="size-4 shrink-0 text-[#6938ef]" />
          ) : null}
          <p className="min-w-0 flex-1 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            {adding ? "Add elements" : editsEmpty ? "Edits" : "Invoice AI"}
          </p>
          <button
            type="button"
            aria-label={
              adding
                ? "Close add elements"
                : editsEmpty
                  ? "Close edits"
                  : "Close Invoice AI"
            }
            onClick={
              adding
                ? closeAddElements
                : editsEmpty
                  ? toggleEditMode
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
      ) : blankWelcome ? (
        <AiWelcomeState />
      ) : editsEmpty ? (
        <EditsEmptyState />
      ) : (
      <div
        ref={scrollRef}
        className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4"
      >
        {turns.map((turn, index) => {
          const isLast = index === turns.length - 1
          const isActiveTurn = isLast && isBusy
          const user = turn.user

          return (
            <div
              key={user?.id ?? turn.assistant?.id ?? index}
              ref={isLast ? lastTurnRef : undefined}
              // The latest turn reserves a viewport's worth of height so its
              // prompt can pin to the top with the response flowing beneath.
              style={isLast && viewportHeight ? { minHeight: viewportHeight } : undefined}
              className="flex flex-col gap-3"
            >
              {user ? (
                // Sticky prompt header — stays at the top of the viewport while
                // its response streams below (Cursor's per-turn pinning). The
                // opaque band masks content scrolling underneath.
                <div className="sticky top-0 z-10 -mx-4 flex flex-col items-end gap-3 bg-white px-4 pb-1 pt-4">
                  {user.references.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {user.references.map((reference) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={reference.id}
                          src={reference.previewUrl}
                          alt={reference.name}
                          className="size-12 rounded-md border border-[#eaecf0] object-cover"
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
                    <AiInAction
                      type="thought"
                      durationSec={preThoughtDurationSec ?? 0}
                    >
                      <StreamingText text={preReasoning} />
                    </AiInAction>
                  ) : null}
                  {receivedAnswers && receivedAnswers.length > 0 ? (
                    <ReceivedAnswers items={receivedAnswers} />
                  ) : null}
                  <AiStatusIndicator />
                  <AiTodoList items={todos} />
                </>
              ) : null}
            </div>
          )
        })}
      </div>
      )}

      {/* The docked composer is a chat affordance — hidden in the Add elements
          palette (a drag-and-drop surface) and in the blank welcome state, which
          carries its own prompt input. */}
      {adding || blankWelcome ? null : (
        <div className="relative flex flex-col gap-2">
          {feedbackToast ? <FeedbackToast message={feedbackToast} /> : null}
          <AiComposer />
        </div>
      )}
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

/**
 * Read-only "previewing an earlier version" bar, docked directly above the
 * composer the same way the pending-changes bar sits over the prompt input
 * (Figma 3247:62513). One tap on "Back to current" returns to the live document.
 */
function PreviewVersionBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-[8px] border border-[#9b8afb] bg-white p-2 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Eye className="size-3.5 shrink-0 text-[#6938ef]" aria-hidden />
        <span className="truncate font-[family-name:var(--font-inter)] text-xs font-medium leading-[18px] text-[#475467]">
          Previewing an earlier version
        </span>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex h-6 shrink-0 items-center justify-center rounded-[4px] bg-[#6938ef] px-1.5 font-[family-name:var(--font-inter)] text-xs font-semibold leading-[18px] text-white outline-none transition-colors hover:bg-[#5925dc] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
      >
        Back to current
      </button>
    </div>
  )
}

/**
 * Edits empty state (Figma 3249:58583). Shown when visual-edit mode is active
 * but no element is selected yet — an educational nudge telling the user to pick
 * an element on the canvas.
 */
function EditsEmptyState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-12">
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <MousePointerClick className="size-8 text-[#344054]" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#101828]">
            Select elements to edit and style visually
          </p>
          <p className="font-[family-name:var(--font-inter)] text-xs font-normal leading-[17px] text-[#475467]">
            Hold cmd to select multiple elements
          </p>
        </div>
      </div>
    </div>
  )
}

