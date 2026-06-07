"use client"

import { useEffect, useState } from "react"

const TYPE_MS = 72
const DELETE_MS = 48
const HOLD_MS = 2400
const WIDTH_RESERVE_PHRASE = "client-ready"

type Phase = "typing" | "holding" | "deleting"

type HeroAccentProps = {
  phrases: readonly string[]
}

/**
 * Email AI hero-accent — typewriter that types/deletes each phrase.
 * A single hidden slot reserves width for the widest phrase; the live
 * typewriter overlays that cell so the heading stays fixed without
 * duplicating phrase text in the DOM.
 */
export function HeroAccent({ phrases }: HeroAccentProps) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<Phase>("typing")

  useEffect(() => {
    const current = phrases[phraseIndex] ?? ""

    if (phase === "typing") {
      if (text.length < current.length) {
        const timeout = window.setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          TYPE_MS
        )
        return () => window.clearTimeout(timeout)
      }
      if (phrases.length <= 1) {
        return
      }
      const timeout = window.setTimeout(() => setPhase("deleting"), HOLD_MS)
      return () => window.clearTimeout(timeout)
    }

    if (phase === "deleting") {
      if (text.length > 0) {
        const timeout = window.setTimeout(
          () => setText(current.slice(0, text.length - 1)),
          DELETE_MS
        )
        return () => window.clearTimeout(timeout)
      }
      setPhraseIndex((index) => (index + 1) % phrases.length)
      setPhase("typing")
    }
  }, [text, phase, phraseIndex, phrases])

  const showCaret = phase === "typing" || (phase === "deleting" && text.length > 0)

  return (
    <span className="hero-accent">
      <span className="hero-accent__slot" aria-hidden="true">
        <span className="hero-accent__slot-text">{WIDTH_RESERVE_PHRASE}</span>
        <span className="hero-accent__caret hero-accent__caret--measure" />
      </span>
      <span className="hero-accent__live" aria-hidden="true">
        <span className="hero-accent__text">{text}</span>
        {showCaret ? (
          <span className="hero-accent__caret" aria-hidden="true" />
        ) : null}
      </span>
      <span className="sr-only" aria-live="polite">
        {phrases[phraseIndex]}
      </span>
    </span>
  )
}
