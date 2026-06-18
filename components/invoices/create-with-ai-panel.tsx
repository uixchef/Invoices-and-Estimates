"use client"

import { useCallback, useEffect, useRef } from "react"
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
  // The hero is open on first paint, so skip the initial mount to avoid stealing
  // focus / scrolling on load — only focus when the user reopens it.
  const didMountRef = useRef(false)

  // Cursor-reactive wash: the section carries CSS vars for the pointer position
  // and a decaying "energy" value so the purple bloom pulses toward the cursor.
  const sectionRef = useRef<HTMLElement>(null)
  const energyRef = useRef(0)
  const decayRafRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

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

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotionRef.current = query.matches
    const onChange = () => {
      reducedMotionRef.current = query.matches
    }
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  useEffect(
    () => () => {
      if (decayRafRef.current !== null) {
        window.cancelAnimationFrame(decayRafRef.current)
      }
    },
    []
  )

  // Bleeds the movement energy back to zero so the bloom settles after the
  // cursor stops; continued movement keeps topping it up in handlePointerMove.
  const startDecay = useCallback(() => {
    if (decayRafRef.current !== null) {
      return
    }
    const tick = () => {
      energyRef.current = Math.max(0, energyRef.current - 0.018)
      sectionRef.current?.style.setProperty(
        "--hero-energy",
        energyRef.current.toFixed(3)
      )
      if (energyRef.current > 0.001) {
        decayRafRef.current = window.requestAnimationFrame(tick)
      } else {
        decayRafRef.current = null
      }
    }
    decayRafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const el = sectionRef.current
      if (!el) {
        return
      }
      const rect = el.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      el.style.setProperty("--hero-cursor-x", `${x.toFixed(2)}%`)
      el.style.setProperty("--hero-cursor-y", `${y.toFixed(2)}%`)

      if (reducedMotionRef.current) {
        return
      }
      energyRef.current = Math.min(1, energyRef.current + 0.32)
      el.style.setProperty("--hero-energy", energyRef.current.toFixed(3))
      startDecay()
    },
    [startDecay]
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
          ref={sectionRef}
          aria-label="Create with AI"
          onPointerMove={handlePointerMove}
          className={cn(
            "vibe-hero-banner relative flex flex-col items-center gap-4 overflow-hidden rounded-lg px-6 py-8 md:px-32",
            "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            isOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0"
          )}
        >
          <span className="vibe-hero-water" aria-hidden />
          <span className="vibe-hero-cursor" aria-hidden />

          <button
            type="button"
            aria-label="Collapse create with AI"
            onClick={close}
            className="hero-overlay-close absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-[#d0d5dd] bg-white text-[#667085] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <ChevronUp className="size-5" aria-hidden />
          </button>

          <div className="vibe-hero-inner relative z-[1] flex w-full max-w-[960px] flex-col items-center gap-4">
            <span className="hero-eyebrow inline-flex h-9 items-center justify-center gap-0.5 rounded-full border-[0.5px] border-[#bdb4fe] bg-white pl-3 pr-3 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#5b21b6]">
              <AutoAwesomeIcon className="size-[18px] shrink-0 text-[#5b21b6]" />
              Layout AI
            </span>

            <h1 className="hero-title">
              <span className="hero-title-lead">
                Let&apos;s create a layout that feels{" "}
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
