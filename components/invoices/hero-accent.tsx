"use client"

import { useEffect, useState } from "react"

import { prefersReducedMotion, shouldRunRepeatingMotion } from "@/lib/reduced-motion"

const TYPE_MS = 72
const DELETE_MS = 48
const HOLD_MS = 2400

type Phase = "typing" | "holding" | "deleting"

type HeroAccentProps = {
  phrases: readonly string[]
}

/**
 * Typewriter accent that participates in the heading as an inline word.
 * Width follows the currently visible characters so wrapping is ordinary
 * sentence flow, not a reserved max-phrase box.
 */
export function HeroAccent({ phrases }: HeroAccentProps) {
  const firstPhrase = phrases[0] ?? ""
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<Phase>("typing")

  useEffect(() => {
    const reduceMotion = prefersReducedMotion()
    if (!shouldRunRepeatingMotion(reduceMotion)) {
      setPhraseIndex(0)
      setText(firstPhrase)
      setPhase("holding")
      return
    }

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
  }, [text, phase, phraseIndex, phrases, firstPhrase])

  const showCaret = phase === "typing" || (phase === "deleting" && text.length > 0)

  return (
    <span className="hero-accent">
      <span className="hero-accent__live" aria-hidden="true">
        <span className="hero-accent__text">{text}</span>
        {showCaret ? (
          <span className="hero-accent__caret" aria-hidden="true" />
        ) : null}
      </span>
      <span className="hero-accent__status" aria-live="polite">
        {phrases[phraseIndex] || firstPhrase}
      </span>
    </span>
  )
}
