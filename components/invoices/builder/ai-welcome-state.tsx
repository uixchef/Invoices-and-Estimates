"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AtSign, BookOpen, Paperclip, Send } from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

/**
 * Starting points offered in the blank empty state (Figma 3268:37417). Picking
 * one seeds the prompt so the user can refine before sending, rather than
 * firing a generation off a three-word chip.
 */
const SUGGESTIONS = [
  "Create a clean invoice",
  "Use my brand style",
  "Add service items",
  "Highlight payment details",
] as const

/**
 * Faint purple glow in the bottom-right corner of each suggestion chip
 * (Figma 7008:112662 — radial purple/400→purple/200→purple/25 at 40% opacity).
 * Concentrated at the corner with a quick falloff so it reads as a whisper of
 * lavender, not a fill. Layered as a background image so the chip's
 * background-color (white at rest, purple/25 on hover) shows through.
 */
const CHIP_GLOW =
  "radial-gradient(70% 70% at 100% 100%, rgba(155,138,251,0.32) 0%, rgba(203,194,253,0.16) 42%, rgba(250,250,255,0) 70%)"

/**
 * Top-of-panel purple wash (Figma 3268:37417 — radial purple/200 → purple/25).
 * A wide, short ellipse pinned to the top edge so the colour hugs the header
 * and fades to near-white over the rest of the panel.
 */
const PANEL_WASH =
  "radial-gradient(140% 160px at 50% 0%, #d9d6fe 0%, #fafaff 78%)"

/**
 * Invoice AI welcome / empty state shown when the builder opens via
 * "Start from blank" (Figma 3268:37411 / 3268:37417). A greeting, supporting
 * copy, suggested starting points, and the prompt input that kicks off the
 * first generation. Sending here hands off to the normal generate flow, which
 * clears the blank session and takes over the docked composer for follow-ups.
 */
export function AiWelcomeState() {
  const { sendMessage, promptFocusToken } = useLayoutBuilder()
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const syncHeight = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }

  useLayoutEffect(syncHeight, [value])

  // Canvas "Generate with AI" CTA (and panel reopen) pull focus here.
  useEffect(() => {
    if (promptFocusToken > 0) {
      textareaRef.current?.focus()
    }
  }, [promptFocusToken])

  const canSend = value.trim().length > 0

  const handleSend = () => {
    if (!canSend) {
      return
    }
    sendMessage(value)
    setValue("")
  }

  const pickSuggestion = (text: string) => {
    setValue(text)
    const textarea = textareaRef.current
    if (textarea) {
      textarea.focus()
      // Drop the caret at the end so the user can keep typing detail.
      const end = text.length
      requestAnimationFrame(() => textarea.setSelectionRange(end, end))
    }
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-4"
      style={{ background: PANEL_WASH }}
    >
      <div className="flex w-full max-w-[632px] flex-col gap-4">
        <div className="flex flex-col gap-2">
          <AutoAwesomeIcon className="size-6 text-[#6938ef]" />
          <h2 className="font-[family-name:var(--font-inter)] text-xl font-semibold leading-[30px] text-[#5925dc]">
            What&rsquo;s on your mind?
          </h2>
        </div>
        <p className="font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#101828]">
          Tell AI what your invoice should include, or pick a starting point:
          create a clean layout, add your branding, organize line items, or
          highlight payment details.
        </p>
      </div>

      <div className="flex w-full flex-col">
        {/* Suggested starting points — connected to the top of the prompt input
            (rounded-t, no bottom border) so they read as one surface. */}
        <div
          className="mx-2 flex flex-col gap-3 rounded-t-[8px] border-x border-t border-[#d9d6fe] p-4"
          style={{
            background: "linear-gradient(180deg, #ebe9fe 0%, #fafaff 100%)",
          }}
        >
          <div className="flex items-center gap-1">
            <BookOpen className="size-4 text-[#475467]" aria-hidden />
            <span className="font-[family-name:var(--font-inter)] text-xs font-medium leading-[17px] text-[#475467]">
              Suggested
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => pickSuggestion(suggestion)}
                style={{ backgroundImage: CHIP_GLOW }}
                className={cn(
                  "flex h-14 items-center justify-start rounded-[8px] border border-[#d0d5dd] bg-white px-3 text-left outline-none transition-colors",
                  "font-[family-name:var(--font-inter)] text-[13px] font-medium leading-[18px] text-[#101828]",
                  "hover:border-[#bdb4fe] hover:bg-[#f4f3ff] focus-visible:border-[#9b8afb] focus-visible:ring-2 focus-visible:ring-[#9b8afb]/40"
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt input (Figma 21:446461). Sending kicks off the first build. */}
        <div className="flex flex-col gap-2.5 rounded-[8px] border border-[#9b8afb] bg-white p-2 shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)] focus-within:border-[#9b8afb]">
          <div className="flex flex-wrap items-center gap-1">
            <span
              className="inline-flex size-[22px] items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white text-[#667085]"
              aria-hidden
            >
              <AtSign className="size-3.5" />
            </span>
          </div>

          <label className="sr-only" htmlFor="builder-welcome-prompt">
            Plan, build, modify anything
          </label>
          <textarea
            ref={textareaRef}
            id="builder-welcome-prompt"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            rows={2}
            placeholder="Plan, build, modify anything..."
            className={cn(
              "min-h-[48px] w-full resize-none border-0 bg-transparent p-0 outline-none",
              "font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#101828]",
              "placeholder:text-[#98a2b3] caret-[#6938ef]"
            )}
          />

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Attach file"
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-[4px] text-[#667085] outline-none transition-colors",
                "hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              )}
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
      </div>
    </div>
  )
}
