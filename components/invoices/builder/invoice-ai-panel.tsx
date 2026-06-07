"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import {
  AtSign,
  ChevronUp,
  Hourglass,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

function AiStatusIndicator() {
  const { status, thoughtDurationSec } = useLayoutBuilder()
  const [collapsed, setCollapsed] = useState(false)

  if (status === "idle") {
    return null
  }

  const isThinking = status === "thinking"
  const label = isThinking
    ? "Thinking…"
    : `Thought for ${thoughtDurationSec ?? 0}s`

  return (
    <div className="flex items-center gap-1">
      <Hourglass
        className={cn("size-4 text-[#9b8afb]", isThinking && "animate-pulse")}
        aria-hidden
      />
      <p className="font-[family-name:var(--font-inter)] text-[13px] font-medium leading-[18px] text-[#9b8afb]">
        {label}
      </p>
      {!isThinking ? (
        <button
          type="button"
          aria-label={collapsed ? "Expand reasoning" : "Collapse reasoning"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
          className="inline-flex size-4 items-center justify-center rounded text-[#9b8afb] outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <ChevronUp
            className={cn(
              "size-4 transition-transform",
              collapsed ? "rotate-180" : "rotate-0"
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  )
}

function AiComposer() {
  const { sendMessage, status } = useLayoutBuilder()
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

  const canSend = value.trim().length > 0 && status !== "thinking"

  const handleSend = () => {
    if (!canSend) {
      return
    }
    sendMessage(value)
    setValue("")
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      <div className="flex flex-col items-center gap-2">
        <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#9b8afb] bg-white p-2 shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]">
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
            placeholder="Plan, build, modify anything..."
            className={cn(
              "w-full resize-none border-0 bg-transparent p-0 outline-none",
              "font-[family-name:var(--font-inter)] text-base font-normal leading-5 text-[#101828]",
              "placeholder:text-[#98a2b3] caret-[#6938ef]"
            )}
          />

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Attach file"
              className="inline-flex size-6 items-center justify-center rounded-[4px] text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <Paperclip className="size-4" aria-hidden />
            </button>
            <div className="min-w-px flex-1" />
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
export function InvoiceAiPanel({ onClose }: { onClose: () => void }) {
  const { messages } = useLayoutBuilder()
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [messages.length])

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-[#6938ef]" aria-hidden />
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
              <div className="rounded-lg border border-[#d0d5dd] bg-[#fcfcfd] p-2">
                <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-[18px] text-[#101828]">
                  {message.text}
                </p>
              </div>
            ) : null}

            {index === messages.length - 1 ? <AiStatusIndicator /> : null}
          </div>
        ))}
      </div>

      <AiComposer />
    </aside>
  )
}
