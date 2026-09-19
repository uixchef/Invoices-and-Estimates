"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { shouldFreezeCaptureMotion } from "@/lib/portfolio-capture"
import { fieldMoodFromHex } from "@/lib/reference-layout"
import { cn } from "@/lib/utils"

type FeatureSlide = {
  id: string
  title: string
  description: string
  preview: "studio" | "editorial" | "swiss" | "atelier" | "statement"
}

export type GenerationFieldPhase = "reasoning" | "thinking" | "asking"

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    id: "studio",
    title: "Studio identity",
    description:
      "A designed billing system — oversized wordmark, cobalt edge, and the amount due as a closing color field.",
    preview: "studio",
  },
  {
    id: "editorial",
    title: "Editorial masthead",
    description:
      "Magazine scale: inverted title, running folio, numbered entries, and a serif total.",
    preview: "editorial",
  },
  {
    id: "statement",
    title: "Statement field",
    description:
      "The amount due becomes the brand device inside a large color field — readable even as a thumbnail.",
    preview: "statement",
  },
  {
    id: "swiss",
    title: "Indexed grid",
    description:
      "Hard rules, section codes, and a single vermilion accent. Functional, not decorative.",
    preview: "swiss",
  },
  {
    id: "atelier",
    title: "Atelier close",
    description:
      "Quiet identity, split ledger, and a formal balance-due composition on warm paper.",
    preview: "atelier",
  },
]

const ADVANCE_MS = 4500

const BACK_CARDS = [
  { z: 4, y: 8, mx: 4, opacity: 0.8 },
  { z: 3, y: 16, mx: 8, opacity: 0.6 },
  { z: 2, y: 24, mx: 12, opacity: 0.4 },
  { z: 1, y: 32, mx: 16, opacity: 0.2 },
]

const FIELD_MOODS: Record<
  FeatureSlide["preview"],
  { a: string; b: string; c: string; d: string }
> = {
  studio: {
    a: "#c4b5fd",
    b: "#60a5fa",
    c: "#818cf8",
    d: "#93c5fd",
  },
  editorial: {
    a: "#c4b5fd",
    b: "#d4a5a8",
    c: "#f0e6d8",
    d: "#c9a4a0",
  },
  statement: {
    a: "#c4b5fd",
    b: "#fb923c",
    c: "#fdba74",
    d: "#fca5a5",
  },
  swiss: {
    a: "#c4b5fd",
    b: "#e2e8f0",
    c: "#fca5a5",
    d: "#cbd5e1",
  },
  atelier: {
    a: "#c4b5fd",
    b: "#c5d5c4",
    c: "#e8dcc4",
    d: "#9caf9a",
  },
}

function GenerativeField({
  mood,
  phase,
  colors: colorOverride,
}: {
  mood: FeatureSlide["preview"]
  phase: GenerationFieldPhase
  colors?: { a: string; b: string; c: string; d: string }
}) {
  const colors = colorOverride ?? FIELD_MOODS[mood]
  const energy = phase === "thinking" ? "explore" : "diffuse"

  return (
    <div
      className={cn("gen-field", `gen-field--${energy}`)}
      data-gen-field-mood={mood}
      data-gen-field-phase={phase}
      aria-hidden
    >
      <div className="gen-field-base" />
      <div
        className="gen-field-mass gen-field-mass--0"
        style={{ backgroundColor: colors.a }}
      />
      <div
        className="gen-field-mass gen-field-mass--1"
        style={{ backgroundColor: colors.b }}
      />
      <div
        className="gen-field-mass gen-field-mass--2"
        style={{ backgroundColor: colors.c }}
      />
      <div
        className="gen-field-mass gen-field-mass--3"
        style={{ backgroundColor: colors.d }}
      />
      <div className="gen-field-core" />
      <div className="gen-field-edge" />
    </div>
  )
}

function MiniPreview({ kind }: { kind: FeatureSlide["preview"] }) {
  if (kind === "studio") {
    return (
      <div className="relative flex h-full overflow-hidden bg-[#eef1f8] text-[#0b1220]">
        <div className="w-[7px] shrink-0 bg-[#1a4cff]" />
        <p
          className="pointer-events-none absolute -right-1 top-0 select-none text-[72px] font-semibold leading-none text-[#1a4cff]/10"
          aria-hidden
        >
          N
        </p>
        <div className="flex min-w-0 flex-1 flex-col pt-2.5 pr-3 pl-2.5">
          <div className="mb-2 size-[9px] bg-[#1a4cff]" />
          <p className="max-w-[7ch] text-[17px] font-semibold leading-[0.84] tracking-[-0.05em]">
            Northwind Studio
          </p>
          <div className="mt-2.5 grid grid-cols-[1.4fr_0.8fr] gap-2 border-t border-[#0b1220]/12 pt-2">
            <p className="text-[8px] font-semibold leading-tight">Aperture</p>
            <p className="text-right text-[10px] font-semibold text-[#1a4cff]">
              Oct 01
            </p>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[7px] text-[#1a4cff]">01</span>
              <span className="h-px flex-1 bg-[#0b1220]/12" />
              <span className="text-[8px] font-semibold">4.8k</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[7px] text-[#1a4cff]">02</span>
              <span className="h-px flex-1 bg-[#0b1220]/12" />
              <span className="text-[8px] font-semibold">3.2k</span>
            </div>
          </div>
          <div className="-mx-2.5 mt-auto flex items-end justify-between bg-[#0b1220] px-2.5 py-1.5 text-white">
            <span className="text-[7px] uppercase tracking-[0.16em] text-white/50">
              Due
            </span>
            <span className="flex items-end gap-1">
              <span className="mb-0.5 size-1.5 bg-[#1a4cff]" />
              <span className="font-[family-name:var(--font-instrument-serif)] text-[16px] italic leading-none">
                $9,680
              </span>
            </span>
          </div>
        </div>
      </div>
    )
  }
  if (kind === "editorial") {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-[#f3eee4] text-[#1c1410]">
        <div className="relative flex-[1.15] overflow-hidden bg-[#7a2832] px-3 pt-2.5 pb-2 text-[#f3eee4]">
          <p className="absolute -right-1 -bottom-3 font-[family-name:var(--font-newsreader)] text-[44px] italic leading-none text-white/10">
            0142
          </p>
          <p className="relative font-[family-name:var(--font-instrument-serif)] text-[26px] italic leading-none">
            Invoice
          </p>
          <p className="relative mt-1.5 text-[8px] tracking-[0.12em]">
            Meridian Press
          </p>
        </div>
        <div className="flex flex-1 flex-col px-3 py-2">
          <div className="flex items-baseline justify-between border-b border-[#1c1410]/15 pb-1">
            <span className="text-[7px] text-[#7a2832]">01</span>
            <span className="text-[8px]">Art direction</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-b border-[#1c1410]/15 pb-1">
            <span className="text-[7px] text-[#7a2832]">02</span>
            <span className="text-[8px]">Print</span>
          </div>
          <p className="mt-auto text-right font-[family-name:var(--font-instrument-serif)] text-[20px] italic leading-none text-[#7a2832]">
            $6,420
          </p>
        </div>
      </div>
    )
  }
  if (kind === "statement") {
    return (
      <div className="flex h-full overflow-hidden bg-[#f7f1ea]">
        <div className="flex w-[62%] flex-col justify-end bg-[#c2410c] px-3 py-2.5 text-white">
          <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-white/65">
            Due
          </p>
          <p className="mt-1 text-[26px] font-black leading-[0.85] tracking-[-0.05em]">
            $10,100
          </p>
          <p className="mt-2 text-[8px] font-semibold uppercase tracking-wide">
            Verve
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-between px-2 py-2">
          <p className="text-[8px] font-semibold">Campaign</p>
          <div className="space-y-1.5">
            <div className="h-px bg-[#1c1917]/20" />
            <div className="h-px w-2/3 bg-[#1c1917]/15" />
            <div className="h-px w-1/2 bg-[#1c1917]/10" />
          </div>
        </div>
      </div>
    )
  }
  if (kind === "swiss") {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-[#eceae3] p-2.5 text-black">
        <div className="flex items-end justify-between border-b-[3px] border-black pb-1">
          <p className="text-[12px] font-black uppercase leading-none tracking-tight">
            Harbor
          </p>
          <span className="font-[family-name:var(--font-geist-mono)] text-[8px] text-[#e10600]">
            01 / 04
          </span>
        </div>
        <div className="h-[3px] bg-[#e10600]" />
        <div className="mt-2 grid grid-cols-4 border border-black text-[6px] uppercase leading-tight">
          <div className="border-r border-black p-1">Client</div>
          <div className="border-r border-black p-1">Issued</div>
          <div className="border-r border-black p-1">Due</div>
          <div className="p-1">USD</div>
        </div>
        <div className="mt-2 grid grid-cols-[16px_1fr] gap-x-1 border-y border-black py-1 text-[7px]">
          <span className="text-[#e10600]">01</span>
          <span>Index</span>
        </div>
        <p className="mt-auto text-right text-[18px] font-black leading-none text-[#e10600]">
          $5,080
        </p>
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#e8e0d2] text-[#2a2620]">
      <div className="h-[5px] bg-[#1f3d32]" />
      <div className="flex flex-1 flex-col px-3 pt-2 pb-2">
        <p className="text-right font-[family-name:var(--font-instrument-serif)] text-[15px] italic leading-none">
          Vale Atelier
        </p>
        <div className="mt-3 grid flex-1 grid-cols-[0.38fr_0.62fr] gap-2">
          <div className="border-r border-[#2a2620]/25 pr-2">
            <p className="text-[7px] uppercase tracking-[0.14em] text-[#1f3d32]">
              For
            </p>
            <p className="mt-1 text-[8px] font-medium">House</p>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="h-px bg-[#2a2620]/25" />
            <div className="h-px bg-[#2a2620]/18" />
            <div className="h-px w-2/3 bg-[#2a2620]/12" />
          </div>
        </div>
        <div className="mt-auto flex items-baseline justify-between border-t border-[#1f3d32] pt-1.5">
          <span className="text-[7px] uppercase tracking-[0.16em] text-[#1f3d32]">
            Balance
          </span>
          <span className="font-[family-name:var(--font-instrument-serif)] text-[18px] leading-none text-[#1f3d32]">
            $9,360
          </span>
        </div>
      </div>
    </div>
  )
}

export function GeneratingCarousel({
  phase = "thinking",
}: {
  phase?: GenerationFieldPhase
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasCycled, setHasCycled] = useState(false)

  const goTo = useCallback((index: number) => {
    setHasCycled(true)
    setActiveIndex((index + FEATURE_SLIDES.length) % FEATURE_SLIDES.length)
  }, [])

  useEffect(() => {
    if (shouldFreezeCaptureMotion()) {
      return
    }
    const timer = window.setInterval(() => {
      setHasCycled(true)
      setActiveIndex((current) => (current + 1) % FEATURE_SLIDES.length)
    }, ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [])

  const slide = FEATURE_SLIDES[activeIndex]

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      data-generation-carousel=""
    >
      <GenerativeField mood={slide.preview} phase={phase} />

      <div className="relative z-10 flex items-center gap-4">
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
              className={
                hasCycled
                  ? "animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
                  : undefined
              }
            >
              <div
                role="img"
                aria-label={`${slide.title} invoice template preview`}
                className="aspect-[16/10] w-full overflow-hidden border-b border-[#eaecf0]"
              >
                <MiniPreview kind={slide.preview} />
              </div>
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

export function ReconstructingCanvas({
  phase,
  referenceUrl,
  moodHex,
  stageLabel,
}: {
  phase: GenerationFieldPhase
  referenceUrl: string | null
  moodHex: string | null
  stageLabel: string
}) {
  const colors = moodHex ? fieldMoodFromHex(moodHex) : undefined

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      data-generation-reconstruct=""
    >
      <GenerativeField mood="statement" phase={phase} colors={colors} />

      <div className="relative z-10 flex w-[340px] flex-col items-center gap-4">
        <div className="overflow-hidden rounded-[12px] border border-[#eaecf0] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.1),0_4px_6px_-2px_rgba(16,24,40,0.05)]">
          <div className="aspect-[16/10] w-full overflow-hidden bg-[#f7f1ea]">
            {referenceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={referenceUrl}
                alt="Layout reference"
                className="size-full object-cover object-top"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-[#98a3b3]">
                Reading reference
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 p-4">
            <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6938ef]">
              Reconstructing
            </p>
            <h3 className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
              {stageLabel}
            </h3>
            <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
              Mapping the reference onto native, editable layout primitives.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
