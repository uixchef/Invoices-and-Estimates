"use client"

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

/**
 * Figma: Ask AI / "Streaming text" (34:37995)
 *
 * Renders assistant reasoning as lightweight markdown. When `streaming` is set,
 * text reveals progressively (Cursor-style). When `viewportHeight` is set, the
 * text fills a fixed-height window from the top down; once it overflows, the
 * window stays pinned to the newest line and the oldest lines scroll off the top
 * under a fade — matching the Figma "Streaming text" behavior (34:37995).
 */
type StreamingTextProps = {
  text: string
  streaming?: boolean
  /** When set, renders the bottom-anchored streaming window with a fade. */
  viewportHeight?: number
  charsPerTick?: number
  tickMs?: number
  className?: string
}

function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function renderInline(text: string): ReactNode {
  // Minimal **bold** support.
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function renderReasoning(text: string): ReactNode {
  const lines = text.split("\n")
  const blocks: ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (bullets.length === 0) {
      return
    }
    const items = [...bullets]
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-[18px] list-disc">
        {items.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    )
    bullets = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2))
      return
    }

    flushBullets()

    if (!trimmed) {
      return
    }

    if (trimmed.endsWith(":")) {
      blocks.push(
        <p key={`h-${blocks.length}`} className="font-semibold">
          {renderInline(trimmed)}
        </p>
      )
      return
    }

    blocks.push(<p key={`p-${blocks.length}`}>{renderInline(trimmed)}</p>)
  })

  flushBullets()

  return <div className="flex flex-col gap-1.5">{blocks}</div>
}

export function StreamingText({
  text,
  streaming = false,
  viewportHeight,
  charsPerTick = 4,
  tickMs = 24,
  className,
}: StreamingTextProps) {
  const [revealedChars, setRevealedChars] = useState(() =>
    streaming ? 0 : text.length
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!streaming || prefersReducedMotion()) {
      setRevealedChars(text.length)
      return
    }

    setRevealedChars(0)
    const interval = window.setInterval(() => {
      setRevealedChars((current) => {
        const next = current + charsPerTick
        if (next >= text.length) {
          window.clearInterval(interval)
          return text.length
        }
        return next
      })
    }, tickMs)

    return () => window.clearInterval(interval)
  }, [charsPerTick, streaming, text, tickMs])

  const visibleText = streaming ? text.slice(0, revealedChars) : text
  const [topFade, setTopFade] = useState(false)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) {
      return
    }
    // Keep the newest line in view; the oldest lines spill off the top.
    node.scrollTop = node.scrollHeight
    setTopFade(node.scrollTop > 0)
  }, [visibleText])

  const content = renderReasoning(visibleText)

  if (!viewportHeight) {
    return (
      <div
        className={cn(
          "text-[12px] leading-[17px] text-[#3e1c96]",
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ height: viewportHeight }}
    >
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto text-[12px] leading-[17px] text-[#3e1c96] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {content}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[64px] bg-gradient-to-b from-white to-transparent transition-opacity duration-200",
          topFade ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}
