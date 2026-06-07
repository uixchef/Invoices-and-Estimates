"use client"

import { useEffect, useRef } from "react"
import { ChevronUp } from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { CreateWithAiPromptInput } from "@/components/invoices/create-with-ai-prompt-input"
import { HeroAccent } from "@/components/invoices/hero-accent"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import { cn } from "@/lib/utils"

const HERO_ACCENT_PHRASES = [
  "professional",
  "polished",
  "on-brand",
  "client-ready",
] as const

/**
 * Figma: Create with AI panel (3150:138530) — vibe-hero pattern from Email AI.
 */
export function CreateWithAiPanel() {
  const { isOpen, close, prompt, setPrompt } = useCreateWithAi()
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      promptRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

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
            "vibe-hero-banner relative flex flex-col items-center gap-4 overflow-hidden rounded-lg border border-[#d9d6fe] px-6 py-6 md:px-32",
            "bg-gradient-to-b from-[#ebe9fe] to-[#fafaff]",
            "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            isOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0"
          )}
        >
          <button
            type="button"
            aria-label="Collapse create with AI"
            onClick={close}
            className="hero-overlay-close absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#667085] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <ChevronUp className="size-5" aria-hidden />
          </button>

          <div className="vibe-hero-inner relative z-[1] flex w-full max-w-[960px] flex-col items-center gap-4">
            <span className="hero-eyebrow inline-flex h-7 items-center justify-center gap-0.5 rounded-full border-[0.5px] border-[#bdb4fe] bg-white pl-2 pr-3 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#101828]">
              <AutoAwesomeIcon className="size-[18px] shrink-0 text-[#6938ef]" />
              Invoice AI
            </span>

            <h1 className="hero-title">
              <span className="hero-title-lead">
                Let&apos;s create an invoice layout that feels{" "}
              </span>
              <HeroAccent phrases={HERO_ACCENT_PHRASES} />
            </h1>

            <CreateWithAiPromptInput
              promptRef={promptRef}
              value={prompt}
              onChange={setPrompt}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
