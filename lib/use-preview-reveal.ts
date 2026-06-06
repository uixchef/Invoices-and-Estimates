"use client"

import { useEffect, useState } from "react"

const MIN_DELAY_MS = 800
const MAX_DELAY_MS = 5000

/**
 * Tracks which previews have already revealed this session so the skeleton
 * shows once per card — not on every re-render, filter, sort, or view switch.
 */
const revealedIds = new Set<string>()

function randomRevealDelay(): number {
  return Math.round(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS))
}

/**
 * Returns whether a card's preview should be revealed (skeleton hidden).
 * First mount waits a randomized delay (<= 5s); later mounts reveal instantly.
 */
export function usePreviewReveal(id: string): boolean {
  const [revealed, setRevealed] = useState(() => revealedIds.has(id))

  useEffect(() => {
    if (revealedIds.has(id)) {
      setRevealed(true)
      return
    }

    const timer = window.setTimeout(() => {
      revealedIds.add(id)
      setRevealed(true)
    }, randomRevealDelay())

    return () => window.clearTimeout(timer)
  }, [id])

  return revealed
}
