"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { AtSign, Paperclip, Send, Square, X } from "lucide-react"

import { AiInAction } from "@/components/ai/ai-in-action"
import { AiQuestions } from "@/components/ai/ai-questions"
import { AiTodoList } from "@/components/ai/ai-todo-list"
import { StreamingText } from "@/components/ai/streaming-text"
import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

function buildReasoning(prompt: string): string {
  const focus = prompt.trim().replace(/\s+/g, " ")

  return [
    focus
      ? `The user wants me to create ${focus.charAt(0).toLowerCase()}${focus.slice(1)}.`
      : "The user wants me to generate an invoice layout.",
    "",
    "Key requirements:",
    "- Translate the request into a structured invoice layout",
    "- Apply the selected medium's dimensions, spacing, and safe areas",
    "- Keep the sections clear: header, line items, totals, and notes",
    "",
    "I'll map this to the canvas using brand-safe defaults, then keep everything print-ready and editable.",
  ].join("\n")
}

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
      <div ref={clampRef} className="max-h-[64px] overflow-hidden">
        <p className="whitespace-pre-wrap font-[family-name:var(--font-inter)] text-base font-normal leading-5 text-[#101828]">
          {text}
        </p>
      </div>
      {overflowing ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#eaecf5]"
        />
      ) : null}
    </div>
  )
}

function AiStatusIndicator() {
  const { status, thoughtDurationSec, messages } = useLayoutBuilder()

  if (status === "idle") {
    return null
  }

  const lastPrompt = messages[messages.length - 1]?.text ?? ""
  const reasoning = buildReasoning(lastPrompt)

  // Stream the reasoning while the model is actively thinking; collapse it to
  // a "Thought for Xs" summary once it pauses to ask or finishes generating.
  if (status === "reasoning" || status === "thinking") {
    return (
      <AiInAction type="thinking" defaultExpanded>
        <StreamingText text={reasoning} streaming viewportHeight={150} />
      </AiInAction>
    )
  }

  return (
    <AiInAction type="thought" durationSec={thoughtDurationSec ?? 0}>
      <StreamingText text={reasoning} />
    </AiInAction>
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
  } = useLayoutBuilder()
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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
              "flex w-full flex-col gap-2.5 rounded-lg border p-2",
              isAsking
                ? "border-[#eaecf0] bg-[#f9fafb]"
                : "border-[#9b8afb] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]"
            )}
          >
          <div className="flex flex-wrap items-start gap-1">
            <span
              className="inline-flex size-[22px] items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white text-[#667085]"
              aria-hidden
            >
              <AtSign className="size-3.5" />
            </span>
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

            <div className="min-w-px flex-1" />

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
  const { messages, todos, status } = useLayoutBuilder()
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [messages.length])

  return (
    <aside
      style={{ width }}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <AutoAwesomeIcon className="size-4 shrink-0 text-[#6938ef]" />
          <p className="min-w-0 flex-1 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            Invoice AI
          </p>
          <button
            type="button"
            aria-label="Close Invoice AI"
            onClick={onClose}
            className="inline-flex size-5 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4"
      >
        {messages.map((message, index) => (
          <div key={message.id} className="flex flex-col gap-3">
            {message.references.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {message.references.map((reference) => (
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

            {message.text ? (
              <UserMessageBubble
                text={message.text}
                active={
                  index === messages.length - 1 &&
                  (status === "reasoning" ||
                    status === "asking" ||
                    status === "thinking")
                }
              />
            ) : null}

            {index === messages.length - 1 ? (
              <>
                <AiStatusIndicator />
                <AiTodoList items={todos} />
              </>
            ) : null}
          </div>
        ))}
      </div>

      <AiComposer />
    </aside>
  )
}
