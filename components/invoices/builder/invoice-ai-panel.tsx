"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  AtSign,
  ChevronDown,
  Link2,
  MousePointerClick,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react"

import { AiAnswer } from "@/components/ai/ai-answer"
import { AiInAction } from "@/components/ai/ai-in-action"
import { AiQuestions } from "@/components/ai/ai-questions"
import { AiTodoList } from "@/components/ai/ai-todo-list"
import { StreamingText } from "@/components/ai/streaming-text"
import { VisualEditsPanel } from "@/components/invoices/builder/visual-edits-panel"
import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AI_MODELS } from "@/lib/ai-models"
import { buildReasoning } from "@/lib/builder-narrative"
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

  useLayoutEffect(() => {
    const node = clampRef.current
    if (!node) {
      return
    }
    setOverflowing(node.scrollHeight > node.clientHeight + 1)
  }, [text])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-2 transition-colors",
        active
          ? "border-[#bdb4fe] bg-white shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]"
          : "border-[#d0d5dd] bg-[#fcfcfd]"
      )}
    >
      {/* Hugs content, then locks to exactly 3 lines (3 × 20px) once it
          overflows — Figma "Sent" bubble (32:448013). */}
      <div ref={clampRef} className="max-h-[60px] overflow-hidden">
        <p className="whitespace-pre-wrap font-[family-name:var(--font-inter)] text-base font-normal leading-5 text-[#101828]">
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
  const { status, thoughtDurationSec, messages } = useLayoutBuilder()

  const lastUser = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const reasoning = buildReasoning(lastUser?.text ?? "")

  // Stream while actively reasoning/thinking; once it pauses to ask questions,
  // collapse to the "Thought for Xs" summary above the docked questions.
  if (status === "reasoning" || status === "thinking") {
    return (
      <AiInAction type="thinking" defaultExpanded>
        <StreamingText text={reasoning} streaming viewportHeight={150} />
      </AiInAction>
    )
  }

  if (status === "asking") {
    return (
      <>
        <AiInAction type="thought" durationSec={thoughtDurationSec ?? 0}>
          <StreamingText text={reasoning} />
        </AiInAction>
        <AskingIndicator />
      </>
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
function AssistantTurn({ message }: { message: BuilderAssistantMessage }) {
  return (
    <div className="flex flex-col gap-3">
      {message.receivedAnswers && message.receivedAnswers.length > 0 ? (
        <ReceivedAnswers items={message.receivedAnswers} />
      ) : null}
      <AiInAction type="thought" durationSec={message.durationSec}>
        <StreamingText text={message.reasoning} />
      </AiInAction>
      <AiTodoList items={message.todos} />
      <AiAnswer text={message.summary} streaming />
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
    selections,
    removeSelection,
    clearSelections,
  } = useLayoutBuilder()
  const [value, setValue] = useState("")
  const [modelId, setModelId] = useState(AI_MODELS[0].id)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // The Edit / model actions appear once there's a generated layout to act on.
  const hasGenerated =
    status === "ready" || messages.some((message) => message.role === "assistant")
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
          {isAsking ? (
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
              // Muted while questions are docked, active otherwise. Focusing the
              // input always promotes it to the active (white + purple) state.
              isAsking
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
                className="inline-flex items-center gap-1 rounded-[4px] border border-[#d0d5dd] bg-white py-0.5 pl-1.5 pr-1 text-xs font-medium leading-[18px] text-[#344054]"
              >
                <Link2 className="size-3 shrink-0 text-[#667085]" aria-hidden />
                {selection.label}
                <button
                  type="button"
                  aria-label={`Remove ${selection.label}`}
                  onClick={() => removeSelection(selection.id)}
                  className="inline-flex size-3.5 items-center justify-center rounded-[3px] text-[#98a2b3] outline-none transition-colors hover:bg-[#f2f4f7] hover:text-[#344054] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                >
                  <X className="size-3" aria-hidden />
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
              "font-[family-name:var(--font-inter)] text-base font-normal leading-5 text-[#101828]",
              "placeholder:text-[#98a2b3] caret-[#6938ef]",
              isBusy && "cursor-not-allowed"
            )}
          />

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
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

              {/* Visual edit toggle (Figma 3191:71120 / 3192:71293): gray at
                  rest, purple while editing the invoice directly. */}
              {hasGenerated ? (
                <button
                  type="button"
                  aria-pressed={editMode}
                  onClick={toggleEditMode}
                  className={cn(
                    "inline-flex h-6 items-center justify-center gap-1 rounded-[4px] border px-1.5 outline-none transition-colors",
                    "text-xs font-semibold leading-[17px] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                    editMode
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

            {hasGenerated ? (
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
                  className="min-w-[260px] rounded-lg p-1.5 font-[family-name:var(--font-inter)]"
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

        <p className="font-[family-name:var(--font-inter)] text-[10px] font-normal leading-[15px] text-[#475467]">
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
  const { messages, todos, status, receivedAnswers, inspectingLayer, inspectLayer } =
    useLayoutBuilder()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inspecting = inspectingLayer !== null
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

  return (
    <aside
      style={{ width }}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          {!inspecting ? (
            <AutoAwesomeIcon className="size-4 shrink-0 text-[#6938ef]" />
          ) : null}
          <p className="min-w-0 flex-1 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            {inspecting ? "Visual edits" : "Invoice AI"}
          </p>
          <button
            type="button"
            aria-label={inspecting ? "Close visual edits" : "Close Invoice AI"}
            onClick={inspecting ? () => inspectLayer(null) : onClose}
            className="inline-flex size-5 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {inspecting ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <VisualEditsPanel />
        </div>
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
                <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-white px-4 pb-1 pt-3">
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
                <AssistantTurn message={turn.assistant} />
              ) : null}

              {isActiveTurn ? (
                <>
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

      <AiComposer />
    </aside>
  )
}
