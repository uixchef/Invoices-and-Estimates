"use client"

import { useCallback, useEffect, useRef } from "react"
import {
  CalendarDays,
  ChevronUp,
  ListPlus,
  Receipt,
  RefreshCw,
} from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { CreateWithAiPromptInput } from "@/components/invoices/create-with-ai-prompt-input"
import { HeroAccent } from "@/components/invoices/hero-accent"
import { VibeHeroCanvas } from "@/components/invoices/vibe-hero-canvas"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import { cn } from "@/lib/utils"

const HERO_ACCENT_PHRASES = [
  "professional",
  "polished",
  "on-brand",
  "client-ready",
] as const

// Suggested prompts shown as color-coded template badges under the input
// (pattern ported from the Email AI eyebrow, relabeled for invoices). Each
// seeds a starter prompt on click.
const HERO_TEMPLATE_BADGES = [
  {
    label: "SaaS subscription",
    tone: "blue",
    icon: RefreshCw,
    prompt:
      "Create a SaaS subscription invoice with recurring billing, plan tier, seat count, proration, taxes, and payment terms",
  },
  {
    label: "Simple store receipt",
    tone: "rose",
    icon: Receipt,
    prompt:
      "Design a simple store receipt with itemized products, quantities, unit prices, tax, and total due",
  },
  {
    label: "Monthly statement",
    tone: "amber",
    icon: CalendarDays,
    prompt:
      "Build a monthly statement with opening balance, dated transactions, payments received, and closing balance",
  },
  {
    label: "Add service items",
    tone: "emerald",
    icon: ListPlus,
    prompt:
      "Create an invoice with itemized service line items, hourly rates, hours worked, subtotals, and grand total",
  },
] as const

// Badges rest neutral (white pill, gray border, dark label) with only the icon
// carrying the category color. The tint + colored border appear on hover/focus.
const BADGE_TONES: Record<string, { icon: string; accent: string }> = {
  blue: {
    icon: "text-[#2e90fa]",
    accent:
      "hover:border-[#b2ddff] hover:bg-[#eff8ff] focus-visible:border-[#b2ddff] focus-visible:bg-[#eff8ff]",
  },
  rose: {
    icon: "text-[#f63d68]",
    accent:
      "hover:border-[#fecdd6] hover:bg-[#fff1f3] focus-visible:border-[#fecdd6] focus-visible:bg-[#fff1f3]",
  },
  amber: {
    icon: "text-[#f79009]",
    accent:
      "hover:border-[#fedf89] hover:bg-[#fffaeb] focus-visible:border-[#fedf89] focus-visible:bg-[#fffaeb]",
  },
  emerald: {
    icon: "text-[#12b76a]",
    accent:
      "hover:border-[#a6f4c5] hover:bg-[#ecfdf3] focus-visible:border-[#a6f4c5] focus-visible:bg-[#ecfdf3]",
  },
}

/**
 * Figma: Create with AI panel (3150:138530) — vibe-hero pattern from Email AI.
 */
export function CreateWithAiPanel() {
  const { isOpen, close, prompt, setPrompt } = useCreateWithAi()
  const promptRef = useRef<HTMLTextAreaElement>(null)
  // The hero is open on first paint, so skip the initial mount to avoid stealing
  // focus / scrolling on load — only focus when the user reopens it.
  const didMountRef = useRef(false)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    if (!isOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      promptRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  const applySuggestion = useCallback(
    (value: string) => {
      setPrompt(value)
      // Defer focus until the textarea has the new value so the caret lands at
      // the end and the hero scrolls the input into view.
      window.requestAnimationFrame(() => {
        const textarea = promptRef.current
        if (!textarea) {
          return
        }
        textarea.focus()
        textarea.setSelectionRange(value.length, value.length)
      })
    },
    [setPrompt]
  )

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        isOpen
          ? "mb-0 grid-rows-[1fr] opacity-100"
          : "-mb-3 grid-rows-[0fr] opacity-0 pointer-events-none"
      )}
      aria-hidden={!isOpen}
    >
      <div className="min-h-0 overflow-hidden">
        <section
          aria-label="Create with AI"
          className={cn(
            "vibe-hero-banner relative flex flex-col items-center gap-4 overflow-hidden rounded-lg px-6 pb-10 pt-10 md:px-32",
            "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            isOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0"
          )}
        >
          <VibeHeroCanvas />

          <button
            type="button"
            aria-label="Collapse create with AI"
            onClick={close}
            className="hero-overlay-close absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#667085] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <ChevronUp className="size-5" aria-hidden />
          </button>

          <div className="vibe-hero-inner relative z-[1] flex w-full max-w-[960px] flex-col items-start gap-6">
            <div className="flex w-full flex-col items-start gap-3">
              <span className="hero-eyebrow relative inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-[#ddd6fe] bg-[linear-gradient(135deg,#f5f3ff_0%,#ebe9fe_100%)] px-3.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#5b21b6] shadow-[inset_0_1px_#ffffffb3,inset_0_-1px_#5b21b60f,0_1px_2px_#5b21b614]">
                <AutoAwesomeIcon className="size-[18px] shrink-0 text-[#5b21b6]" />
                Layout AI
                <span className="hero-eyebrow__shine" aria-hidden />
              </span>

              <h1 className="hero-title">
                <span className="hero-title-lead">
                  Let&apos;s create a layout that feels{" "}
                </span>
                <HeroAccent phrases={HERO_ACCENT_PHRASES} />
              </h1>
            </div>

            <CreateWithAiPromptInput
              promptRef={promptRef}
              value={prompt}
              onChange={setPrompt}
            />

            <div
              className="flex w-full flex-wrap items-center justify-start gap-2"
              role="group"
              aria-label="Suggested prompts"
            >
              {HERO_TEMPLATE_BADGES.map(({ label, tone, icon: Icon, prompt: seed }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applySuggestion(seed)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#eaecf0] bg-white px-3",
                    "font-[family-name:var(--font-inter)] text-[13px] font-semibold leading-5 text-[#344054]",
                    "outline-none transition-[background-color,border-color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                    "hover:-translate-y-0.5 hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12)] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none",
                    BADGE_TONES[tone].accent
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", BADGE_TONES[tone].icon)}
                    strokeWidth={2}
                    aria-hidden
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
