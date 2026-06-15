/**
 * Material Symbols `auto_awesome` — the Invoice AI sparkle used across the
 * Create-with-AI and Layout Builder surfaces. Uses `currentColor` so it adapts
 * to button states (default / hover / active).
 * Figma: auto_awesome (2402:61985)
 */
export function AutoAwesomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </svg>
  )
}

/**
 * Gradient variant of the `auto_awesome` sparkle — a purple diagonal wash
 * (light lavender → deep violet) for prominent AI entry points like the Layout
 * Builder welcome state. The gradient id is local to the SVG so duplicate
 * instances stay self-contained.
 */
export function AutoAwesomeGradientIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient
          id="auto-awesome-gradient"
          x1="22"
          y1="2"
          x2="3"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9B8AFB" />
          <stop offset="1" stopColor="#5925DC" />
        </linearGradient>
      </defs>
      <path
        fill="url(#auto-awesome-gradient)"
        d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"
      />
    </svg>
  )
}
