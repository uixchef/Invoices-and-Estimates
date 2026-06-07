"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Animated "generating" state for the builder canvas. Mirrors the vibe-platform
 * email-template-skeleton: a drifting aurora background behind an auto-advancing
 * feature-card carousel (dot nav on the left, arrow nav on the right, with a
 * layered deck of cards stacked behind the active one). Each card previews a
 * real invoice template alongside a builder guide tip.
 */
type FeatureSlide = {
  id: string
  title: string
  description: string
  image: string
}

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    id: "brand-styling",
    title: "Brand styling by AI",
    description:
      "AI builds beautiful, on-brand invoice layouts instantly using your colours, fonts, and brand guidelines — right from the first draft.",
    image: "/layouts/thumbnails/template-03.svg",
  },
  {
    id: "smart-editing",
    title: "Smart editing",
    description:
      "Click any AI-generated element — header, line items, totals — to instantly refine its content, styling, and layout.",
    image: "/layouts/thumbnails/template-05.svg",
  },
  {
    id: "creative-control",
    title: "Complete creative control",
    description:
      "Switch seamlessly between drag-and-drop, direct editing, and AI-powered updates to build invoices faster.",
    image: "/layouts/thumbnails/template-01.svg",
  },
]

const ADVANCE_MS = 4500

const BACK_CARDS = [
  { z: 4, y: 8, mx: 4, opacity: 0.8 },
  { z: 3, y: 16, mx: 8, opacity: 0.6 },
  { z: 2, y: 24, mx: 12, opacity: 0.4 },
  { z: 1, y: 32, mx: 16, opacity: 0.2 },
]

type Blob = {
  drift: "a" | "b" | "c"
  color: string
  opacity: number
  style: React.CSSProperties
}

/**
 * Soft, diffuse colour washes that bleed past the edges, mirroring the
 * vibe-platform aurora (heavy blur + saturate + brightness over a white base).
 */
const AURORA_BLOBS: Blob[] = [
  { drift: "b", color: "#c7d2fe", opacity: 0.7, style: { top: "-25%", left: "-15%", width: "70%", height: "75%" } },
  { drift: "a", color: "#fde68a", opacity: 0.65, style: { top: "-20%", left: "28%", width: "65%", height: "65%" } },
  { drift: "c", color: "#fed7aa", opacity: 0.5, style: { top: "5%", right: "-18%", width: "55%", height: "60%" } },
  { drift: "b", color: "#bbf7d0", opacity: 0.6, style: { top: "22%", left: "-10%", width: "55%", height: "60%" } },
  { drift: "c", color: "#99f6e4", opacity: 0.65, style: { bottom: "-25%", left: "2%", width: "65%", height: "70%" } },
  { drift: "a", color: "#bfdbfe", opacity: 0.7, style: { bottom: "-30%", left: "26%", width: "80%", height: "65%" } },
]

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-white" />
      <div
        className="absolute inset-0"
        style={{ filter: "saturate(1.4) brightness(1.05)" }}
      >
        {AURORA_BLOBS.map((blob, index) => (
          <div
            key={index}
            className={`aurora-blob aurora-blob--${blob.drift}`}
            style={{
              ...blob.style,
              background: blob.color,
              opacity: blob.opacity,
            }}
          />
        ))}
      </div>
      {/* Soft fade to white at the bottom, matching the source aurora. */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white via-white/60 to-transparent" />
    </div>
  )
}

export function GeneratingCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + FEATURE_SLIDES.length) % FEATURE_SLIDES.length)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % FEATURE_SLIDES.length)
    }, ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [])

  const slide = FEATURE_SLIDES[activeIndex]

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <AuroraBackground />

      <div className="relative z-10 flex items-center gap-4">
        {/* Dot navigation */}
        <div className="flex flex-col items-center gap-2">
          {FEATURE_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              aria-current={index === activeIndex}
              onClick={() => goTo(index)}
              className={cn(
                "rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#6938ef]/40",
                index === activeIndex
                  ? "size-2 bg-[#6938ef]"
                  : "size-1.5 bg-[#cbd5e1] hover:bg-[#94a3b8]"
              )}
            />
          ))}
        </div>

        {/* Stacked card deck */}
        <div className="relative w-[340px]">
          {BACK_CARDS.map((card, index) => (
            <div
              key={index}
              aria-hidden
              className="absolute inset-0 rounded-[12px] border border-[#eaecf0] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]"
              style={{
                zIndex: card.z,
                transform: `translateY(${card.y}px)`,
                marginLeft: card.mx,
                marginRight: card.mx,
                opacity: card.opacity,
              }}
            />
          ))}

          <div className="relative z-10 overflow-hidden rounded-[12px] border border-[#eaecf0] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.1),0_4px_6px_-2px_rgba(16,24,40,0.05)]">
            <div
              key={slide.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
            >
              <div
                role="img"
                aria-label={`${slide.title} invoice template preview`}
                className="aspect-[16/10] w-full border-b border-[#eaecf0] bg-[#f7f9fc] bg-cover bg-top bg-no-repeat"
                style={{ backgroundImage: `url(${slide.image})` }}
              />
              <div className="flex flex-col gap-1.5 p-4">
                <h3 className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
                  {slide.title}
                </h3>
                <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
                  {slide.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow navigation */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="Previous feature"
            onClick={() => goTo(activeIndex - 1)}
            className="inline-flex size-8 items-center justify-center rounded-full bg-white/70 text-[#475467] shadow-sm outline-none backdrop-blur-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#6938ef]/40"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next feature"
            onClick={() => goTo(activeIndex + 1)}
            className="inline-flex size-8 items-center justify-center rounded-full bg-white/70 text-[#475467] shadow-sm outline-none backdrop-blur-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[#6938ef]/40"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
