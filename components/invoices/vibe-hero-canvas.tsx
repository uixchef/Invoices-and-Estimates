"use client"

import { useEffect, useRef } from "react"

/**
 * Animated purple "vibe" wash for the Create with AI hero, rendered on a
 * <canvas> (replaces the earlier layered-CSS backdrop). Soft violet metaballs
 * drift on looping sinusoidal paths and a cursor-reactive bloom swells toward
 * the pointer. An elliptical mask feathers the wash so it melts into the panel
 * edges and keeps the headline area legible.
 *
 * Honors prefers-reduced-motion (renders one static frame, no pointer energy)
 * and is devicePixelRatio-correct.
 */

type Blob = {
  /** Base center, amplitude, angular speed, and phase in normalized space. */
  cx: number
  cy: number
  ax: number
  ay: number
  sx: number
  sy: number
  px: number
  py: number
  /** Radius as a fraction of the larger canvas dimension. */
  r: number
  /** Base color as "r,g,b" and peak alpha. */
  color: string
  alpha: number
}

// Spread across the panel (not piled in the center) and kept low-alpha so the
// wash stays airy and "floats" instead of stacking into a dense purple core.
const BLOBS: Blob[] = [
  { cx: 0.2, cy: 0.34, ax: 0.1, ay: 0.08, sx: 0.24, sy: 0.18, px: 0, py: 1.2, r: 0.34, color: "139,92,246", alpha: 0.2 },
  { cx: 0.8, cy: 0.38, ax: 0.11, ay: 0.09, sx: 0.2, sy: 0.27, px: 2.1, py: 0.4, r: 0.32, color: "167,139,250", alpha: 0.18 },
  { cx: 0.3, cy: 0.72, ax: 0.12, ay: 0.1, sx: 0.17, sy: 0.22, px: 4.0, py: 2.6, r: 0.3, color: "167,139,250", alpha: 0.16 },
  { cx: 0.74, cy: 0.7, ax: 0.11, ay: 0.09, sx: 0.29, sy: 0.19, px: 1.0, py: 3.3, r: 0.3, color: "139,92,246", alpha: 0.16 },
  { cx: 0.5, cy: 0.48, ax: 0.18, ay: 0.13, sx: 0.14, sy: 0.18, px: 3.0, py: 1.8, r: 0.26, color: "168,150,255", alpha: 0.12 },
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

    const render = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = "source-over"

      const base = Math.max(width, height)

      for (const b of BLOBS) {
        // Layer two out-of-phase sines per axis so each blob wanders on an
        // organic, looping path (rather than a flat back-and-forth), and pulse
        // the radius so the wash swells and contracts like water.
        const x =
          (b.cx +
            Math.sin(t * b.sx + b.px) * b.ax +
            Math.cos(t * b.sx * 0.5 + b.py) * b.ax * 0.45) *
          width
        const y =
          (b.cy +
            Math.cos(t * b.sy + b.py) * b.ay +
            Math.sin(t * b.sy * 0.6 + b.px) * b.ay * 0.5) *
          height
        const radius =
          b.r * base * (1 + 0.08 * Math.sin(t * (b.sx + b.sy) + b.px))
        drawBlob(x, y, radius, b.color, b.alpha)
      }

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
