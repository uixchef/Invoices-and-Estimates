"use client"

/**
 * Idle dashboard purple field. CSS-only: three radial washes using the
 * approved HighLevel purple stops, drifted with compositor transforms.
 * Generation still uses the existing gen-field carousel — this is the quiet
 * idle state only.
 */
export function VibeHeroCanvas() {
  return (
    <div
      className="vibe-hero-field pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden
    >
      <div className="vibe-hero-ambient">
        <span className="vibe-hero-ambient__mist" />
        <span className="vibe-hero-ambient__bloom" />
        <span className="vibe-hero-ambient__ink" />
      </div>
    </div>
  )
}
