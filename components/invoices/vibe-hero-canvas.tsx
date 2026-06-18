"use client"

import { useEffect, useRef } from "react"

/**
 * Animated purple "vibe" wash for the Create with AI hero, rendered on a
 * <canvas> (replaces the earlier layered-CSS backdrop). Several translucent
 * sine-wave layers travel across each other to read as flowing water, and a
 * cursor-reactive bloom swells toward the pointer. An elliptical mask feathers
 * the wash so it melts into the panel edges and keeps the headline legible.
 *
 * Honors prefers-reduced-motion (renders one static frame, no pointer energy)
 * and is devicePixelRatio-correct.
 */

type Wave = {
  /** Baseline (vertical rest position) and crest amplitude, as height fractions. */
  base: number
  amp: number
  /** Wavelength as a fraction of width (smaller = more crests). */
  len: number
  /** Horizontal travel speed in rad/s; sign sets direction. */
  speed: number
  /** How far below the baseline the fill fades out (height fraction). */
  fade: number
  /** Starting phase offset and color "r,g,b" + peak alpha. */
  phase: number
  color: string
  alpha: number
}

// Layered like rolling water: different baselines, wavelengths, and opposing
// travel directions so the crests interfere and flow. Low alpha keeps it airy.
const WAVES: Wave[] = [
  { base: 0.34, amp: 0.05, len: 1.0, speed: -0.5, fade: 0.5, phase: 4.2, color: "167,139,250", alpha: 0.1 },
  { base: 0.44, amp: 0.06, len: 0.85, speed: 0.5, fade: 0.42, phase: 0, color: "139,92,246", alpha: 0.16 },
  { base: 0.54, amp: 0.075, len: 1.2, speed: -0.38, fade: 0.45, phase: 1.6, color: "167,139,250", alpha: 0.14 },
  { base: 0.62, amp: 0.05, len: 0.6, speed: 0.66, fade: 0.4, phase: 3.1, color: "168,150,255", alpha: 0.1 },
]

export function VibeHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const parent = canvas.parentElement
    const ctx = canvas.getContext("2d")
    if (!parent || !ctx) {
      return
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let width = 0
    let height = 0
    let dpr = 1

    // Cursor-reactive state: target follows the pointer, energy decays after
    // movement stops so the bloom settles.
    let cursorX = 0.5
    let cursorY = 0.4
    let energy = 0

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      width = rect.width
      height = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
    }

    const drawBlob = (
      x: number,
      y: number,
      radius: number,
      color: string,
      alpha: number
    ) => {
      if (alpha <= 0.001 || radius <= 0) {
        return
      }
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(${color},${alpha})`)
      gradient.addColorStop(0.55, `rgba(${color},${alpha * 0.45})`)
      gradient.addColorStop(1, `rgba(${color},0)`)
      ctx.fillStyle = gradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    // Fills the area under a traveling sine curve with a downward-fading
    // gradient, so the moving crest reads as a flowing water surface.
    const drawWave = (w: Wave, t: number) => {
      const baseY = w.base * height
      const ampPx = w.amp * height * (1 + 0.18 * Math.sin(t * 0.3 + w.phase))
      const step = Math.max(6, width / 96)
      ctx.beginPath()
      ctx.moveTo(0, height)
      ctx.lineTo(0, baseY)
      for (let x = 0; x <= width; x += step) {
        const y =
          baseY +
          Math.sin((x / width / w.len) * Math.PI * 2 + t * w.speed + w.phase) *
            ampPx
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()
      const gradient = ctx.createLinearGradient(
        0,
        baseY - ampPx,
        0,
        baseY + w.fade * height
      )
      gradient.addColorStop(0, `rgba(${w.color},${w.alpha})`)
      gradient.addColorStop(1, `rgba(${w.color},0)`)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    const render = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = "source-over"

      const base = Math.max(width, height)

      // Blur the wave layers so their crest edges bleed away — no visible
      // outline, just a soft blended flow. The blur is part of the saved
      // canvas state, so it's scoped to the wave fills only.
      ctx.save()
      ctx.filter = `blur(${Math.max(16, base * 0.05)}px)`
      for (const w of WAVES) {
        drawWave(w, t)
      }
      ctx.restore()

      // A deeper-purple mass that floats slowly from one end of the hero to the
      // other (with a gentle vertical bob), giving the wash a dynamic focal flow.
      const travelX = 0.5 + 0.42 * Math.sin(t * 0.18)
      const travelY = 0.48 + 0.07 * Math.sin(t * 0.27 + 1.0)
      drawBlob(travelX * width, travelY * height, 0.46 * base, "124,58,237", 0.3)

      if (energy > 0.001) {
        drawBlob(
          cursorX * width,
          cursorY * height,
          0.32 * base,
          "139,92,246",
          0.35 * energy
        )
      }

      // Feather to the panel edges with an elliptical mask (wide + short),
      // mirroring the original CSS radial mask.
      ctx.globalCompositeOperation = "destination-in"
      ctx.save()
      ctx.translate(width / 2, height / 2)
      ctx.scale(width * 0.62, height * 0.6)
      const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      mask.addColorStop(0, "rgba(0,0,0,1)")
      mask.addColorStop(0.6, "rgba(0,0,0,1)")
      mask.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = mask
      ctx.fillRect(-2, -2, 4, 4)
      ctx.restore()
    }

    let rafId: number | null = null
    let startTime: number | null = null

    const frame = (now: number) => {
      if (startTime === null) {
        startTime = now
      }
      const t = (now - startTime) / 1000
      energy = Math.max(0, energy - 0.012)
      render(t)
      rafId = window.requestAnimationFrame(frame)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect()
      cursorX = (event.clientX - rect.left) / rect.width
      cursorY = (event.clientY - rect.top) / rect.height
      if (!reduceMotion) {
        energy = Math.min(1, energy + 0.32)
      }
    }

    resize()

    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reduceMotion) {
        render(0)
      }
    })
    resizeObserver.observe(parent)

    if (reduceMotion) {
      render(0)
    } else {
      parent.addEventListener("pointermove", handlePointerMove)
      rafId = window.requestAnimationFrame(frame)
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      resizeObserver.disconnect()
      parent.removeEventListener("pointermove", handlePointerMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  )
}
