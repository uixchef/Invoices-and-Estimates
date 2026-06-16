"use client"

import { useRef, useState } from "react"
import { ChevronLeft, Pipette, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Color math                                                          */
/* ------------------------------------------------------------------ */

type Rgb = { r: number; g: number; b: number }
type Hsv = { h: number; s: number; v: number }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const channelHex = (value: number) =>
  clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

/** Parses #hex (3/6/8), rgb(), or rgba() into rgb + alpha. */
function parseColor(input: string | undefined): { rgb: Rgb; a: number } | null {
  if (!input) {
    return null
  }
  const value = input.trim()
  if (value.startsWith("#")) {
    let hex = value.slice(1)
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("")
    }
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return {
        rgb: {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        },
        a: 1,
      }
    }
    if (/^[0-9a-f]{8}$/i.test(hex)) {
      return {
        rgb: {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        },
        a: parseInt(hex.slice(6, 8), 16) / 255,
      }
    }
    return null
  }
  const match = value.match(/[\d.]+/g)
  if (match && match.length >= 3) {
    const [r, g, b, a] = match.map(Number)
    return { rgb: { r, g, b }, a: a === undefined ? 1 : a }
  }
  return null
}

/** Outputs #RRGGBB, or #RRGGBBAA when partially transparent. */
function formatHex(rgb: Rgb, a: number): string {
  const base = `#${channelHex(rgb.r)}${channelHex(rgb.g)}${channelHex(rgb.b)}`
  return a >= 1 ? base : `${base}${channelHex(a * 255)}`
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return `#${channelHex((r + m) * 255)}${channelHex((g + m) * 255)}${channelHex(
    (b + m) * 255
  )}`
}

/* ------------------------------------------------------------------ */
/* Preset palette (Figma 3321:68495 "Default colors")                  */
/* ------------------------------------------------------------------ */

const PALETTE_HUES = [0, 25, 40, 90, 150, 175, 215, 245, 280, 320]
const PALETTE_LIGHTNESS = [82, 70, 58, 47, 37, 27, 17]

const GRAYSCALE_ROW = [
  "#000000",
  "#1d2939",
  "#475467",
  "#667085",
  "#98a2b3",
  "#d0d5dd",
  "#eaecf0",
  "#f2f4f7",
  "#f9fafb",
  "#ffffff",
]

const DEFAULT_SWATCHES: string[] = [
  ...GRAYSCALE_ROW,
  ...PALETTE_HUES.map((h) => hslToHex(h, 85, 50)),
  ...PALETTE_LIGHTNESS.flatMap((l) =>
    PALETTE_HUES.map((h) => hslToHex(h, 68, l))
  ),
]

/* Brand palette (Figma 3321:68495 "Brand colors") — the product's blues. */
const BRAND_COLORS = ["#155eef", "#84adff", "#b2ccff", "#eff4ff"]

/**
 * Session store for user-created "Custom colors". Kept module-level so the list
 * survives the popover unmounting between opens (Radix unmounts content on
 * close). Not persisted across reloads — a deliberate prototype scope.
 */
const customColorStore: string[] = []

/* "No color" sentinel emitted by the transparent (none) tile. */
const NONE_COLOR = "transparent"

/* Checkerboard backdrop for alpha (so transparency reads clearly). */
const CHECKERBOARD =
  "repeating-conic-gradient(#cbd2d9 0% 25%, #ffffff 0% 50%) 50% / 8px 8px"

/** Rainbow eyedropper tile + transparent "none" tile shared by each section. */
function SwatchTile({
  color,
  active,
  onClick,
  label,
}: {
  color: string
  active?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "aspect-square w-full rounded-[4px] border border-black/10 outline-none ring-offset-1 transition-shadow",
        "hover:ring-2 hover:ring-[#84adff] focus-visible:ring-2 focus-visible:ring-[#155eef]",
        active && "ring-2 ring-[#155eef]"
      )}
      style={{ backgroundColor: color }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Color picker                                                        */
/* ------------------------------------------------------------------ */

export function ColorPicker({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (next: string) => void
}) {
  const parsed = parseColor(value)
  const initialHsv = parsed ? rgbToHsv(parsed.rgb) : { h: 0, s: 0, v: 0 }

  // HSV + alpha are the source of truth while the popover is open; emit() pushes
  // the resolved hex up on every change.
  const [hsv, setHsv] = useState<Hsv>(initialHsv)
  const [alpha, setAlpha] = useState(parsed ? parsed.a : 1)
  const [hexText, setHexText] = useState(
    parsed ? formatHex(parsed.rgb, 1).slice(1).toUpperCase() : ""
  )
  // "swatches" = the palette menu (Figma 3321:68495); "custom" = the
  // create-a-color surface revealed by an "Add" CTA (Figma 3321:69694).
  const [mode, setMode] = useState<"swatches" | "custom">("swatches")
  const [customColors, setCustomColors] = useState<string[]>(() => [
    ...customColorStore,
  ])

  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const alphaRef = useRef<HTMLDivElement>(null)

  const emit = (nextHsv: Hsv, nextAlpha: number) => {
    onChange(formatHex(hsvToRgb(nextHsv), nextAlpha))
  }

  const commitHsv = (patch: Partial<Hsv>) => {
    const next = { ...hsv, ...patch }
    setHsv(next)
    setHexText(formatHex(hsvToRgb(next), 1).slice(1).toUpperCase())
    emit(next, alpha)
  }

  const commitAlpha = (next: number) => {
    setAlpha(next)
    emit(hsv, next)
  }

  const applyHex = (raw: string) => {
    const parsedHex = parseColor(raw.startsWith("#") ? raw : `#${raw}`)
    if (!parsedHex) {
      return
    }
    const nextHsv = rgbToHsv(parsedHex.rgb)
    setHsv(nextHsv)
    setAlpha(parsedHex.a)
    setHexText(formatHex(parsedHex.rgb, 1).slice(1).toUpperCase())
    onChange(formatHex(parsedHex.rgb, parsedHex.a))
  }

  // Pointer drag for the SV square / hue / alpha tracks. Reads a normalized
  // 0–1 position on every move until the pointer is released.
  const startDrag = (
    ref: React.RefObject<HTMLDivElement | null>,
    axis: "xy" | "x",
    onMove: (x: number, y: number) => void
  ) => {
    const node = ref.current
    if (!node) {
      return
    }
    const handle = (clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect()
      const x = clamp((clientX - rect.left) / rect.width, 0, 1)
      const y = axis === "xy" ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0
      onMove(x, y)
    }
    const move = (event: PointerEvent) => handle(event.clientX, event.clientY)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return handle
  }

  const hueColor = hslToHex(hsv.h, 100, 50)
  const solid = formatHex(hsvToRgb(hsv), 1)
  const eyedropperAvailable =
    typeof window !== "undefined" && "EyeDropper" in window

  const pickEyedropper = async () => {
    const EyeDropperCtor = (
      window as unknown as {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper
    if (!EyeDropperCtor) {
      return
    }
    try {
      const result = await new EyeDropperCtor().open()
      applyHex(result.sRGBHex)
    } catch {
      /* user dismissed the eyedropper */
    }
  }

  // Saves the in-progress custom color as a reusable swatch, then returns to the
  // palette. The color is also applied live as the user edits, so this only
  // persists it to the "Custom colors" row.
  const addCustomColor = () => {
    const hex = solid.toLowerCase()
    if (!customColorStore.includes(hex)) {
      customColorStore.unshift(hex)
    }
    setCustomColors((prev) => (prev.includes(hex) ? prev : [hex, ...prev]))
    onChange(formatHex(hsvToRgb(hsv), alpha))
    setMode("swatches")
  }

  const activeHex = solid.toLowerCase()
  const isNone = !parseColor(value)

  // The transparent "none" tile that leads every swatch row (Figma 3321:68495).
  const noneTile = (
    <button
      type="button"
      aria-label="No color"
      title="No color"
      aria-pressed={isNone}
      onClick={() => onChange(NONE_COLOR)}
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-[4px] border border-[#d0d5dd] bg-white outline-none ring-offset-1 transition-shadow",
        "hover:ring-2 hover:ring-[#84adff] focus-visible:ring-2 focus-visible:ring-[#155eef]",
        isNone && "ring-2 ring-[#155eef]"
      )}
    >
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-px -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#f04438]"
        aria-hidden
      />
    </button>
  )

  // The rainbow eyedropper tile (only when the browser supports EyeDropper).
  const eyedropperTile = eyedropperAvailable ? (
    <button
      type="button"
      aria-label="Pick color from screen"
      title="Pick color from screen"
      onClick={pickEyedropper}
      className="flex aspect-square w-full items-center justify-center rounded-[4px] text-white outline-none ring-offset-1 transition-shadow hover:ring-2 hover:ring-[#84adff] focus-visible:ring-2 focus-visible:ring-[#155eef]"
      style={{
        background:
          "conic-gradient(from 0deg, #f04438, #fec84b, #32d583, #36bffa, #155eef, #9b8afb, #f670c7, #f04438)",
      }}
    >
      <Pipette className="size-3 drop-shadow-[0_1px_1px_rgba(16,24,40,0.5)]" aria-hidden />
    </button>
  ) : null

  if (mode === "custom") {
    return (
      <div className="flex w-[260px] flex-col gap-3 font-[family-name:var(--font-inter)]">
        {/* Header — back to the palette (Figma 3321:69694). */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back to colors"
            onClick={() => setMode("swatches")}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[#475467] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <p className="text-sm font-medium leading-5 text-[#101828]">
            Custom color
          </p>
        </div>

        {/* Saturation / value square */}
        <div
          ref={svRef}
          onPointerDown={(event) => {
            event.preventDefault()
            const handle = startDrag(svRef, "xy", (x, y) =>
              commitHsv({ s: x, v: 1 - y })
            )
            handle?.(event.clientX, event.clientY)
          }}
          className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-[8px]"
          style={{
            backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
          }}
        >
          <span
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0px_1px_3px_rgba(16,24,40,0.3)]"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              backgroundColor: solid,
            }}
          />
        </div>

        {/* Hue slider */}
        <div
          ref={hueRef}
          onPointerDown={(event) => {
            event.preventDefault()
            const handle = startDrag(hueRef, "x", (x) => commitHsv({ h: x * 360 }))
            handle?.(event.clientX, event.clientY)
          }}
          className="relative h-2 w-full cursor-pointer rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0px_1px_3px_rgba(16,24,40,0.3)]"
            style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
          />
        </div>

        {/* Alpha slider */}
        <div
          ref={alphaRef}
          onPointerDown={(event) => {
            event.preventDefault()
            const handle = startDrag(alphaRef, "x", (x) => commitAlpha(x))
            handle?.(event.clientX, event.clientY)
          }}
          className="relative h-2 w-full cursor-pointer rounded-full"
          style={{ background: CHECKERBOARD }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${solid})`,
            }}
          />
          <span
            className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0px_1px_3px_rgba(16,24,40,0.3)]"
            style={{ left: `${alpha * 100}%`, backgroundColor: solid }}
          />
        </div>

        {/* HEX + opacity + eyedropper */}
        <div className="flex items-stretch gap-1">
          <span className="inline-flex h-6 shrink-0 items-center rounded-[4px] border border-[#d0d5dd] bg-white px-2 text-sm leading-5 text-[#101828] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
            HEX
          </span>
          <div className="flex h-6 min-w-0 flex-1 items-center rounded-[4px] border border-[#d0d5dd] bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-shadow focus-within:border-[#84adff] focus-within:shadow-[0_0_0_3px_#eff4ff]">
            <span className="flex h-full items-center rounded-l-[4px] border-r border-[#d0d5dd] bg-[#f9fafb] px-1.5 text-sm leading-5 text-[#98a2b3]">
              #
            </span>
            <input
              value={hexText}
              onChange={(event) =>
                setHexText(
                  event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 8)
                )
              }
              onBlur={() => applyHex(hexText)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyHex(hexText)
                }
              }}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-r-[4px] border-0 bg-transparent px-1.5 text-sm leading-5 text-[#101828] outline-none"
            />
          </div>
          <div className="flex h-6 w-16 items-center rounded-[4px] border border-[#d0d5dd] bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-shadow focus-within:border-[#84adff] focus-within:shadow-[0_0_0_3px_#eff4ff]">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(alpha * 100)}
              onChange={(event) => {
                const next = clamp(Number(event.target.value) || 0, 0, 100)
                commitAlpha(next / 100)
              }}
              className="min-w-0 flex-1 border-0 bg-transparent px-1.5 text-right text-sm leading-5 text-[#101828] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="flex h-full items-center rounded-r-[4px] border-l border-[#d0d5dd] bg-[#f9fafb] px-1.5 text-sm leading-5 text-[#98a2b3]">
              %
            </span>
          </div>
          {eyedropperAvailable ? (
            <button
              type="button"
              aria-label="Pick color from screen"
              onClick={pickEyedropper}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white text-[#475467] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:border-[#84adff] focus-visible:shadow-[0_0_0_3px_#eff4ff]"
            >
              <Pipette className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Save the color as a reusable swatch. */}
        <button
          type="button"
          onClick={addCustomColor}
          className="inline-flex h-9 w-full items-center justify-center rounded-[4px] bg-[#155eef] px-3 text-sm font-semibold leading-5 text-white outline-none transition-colors hover:bg-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          Add color
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-[260px] flex-col gap-3 font-[family-name:var(--font-inter)]">
      {/* Brand colors (Figma 3321:68495) */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium leading-5 text-[#101828]">
          Brand colors
        </p>
        <div className="grid grid-cols-10 gap-1">
          {BRAND_COLORS.map((swatch) => (
            <SwatchTile
              key={swatch}
              color={swatch}
              label={swatch}
              active={activeHex === swatch.toLowerCase()}
              onClick={() => applyHex(swatch)}
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-[#eaecf0]" />

      {/* Default colors */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium leading-5 text-[#101828]">
            Default colors
          </p>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold leading-5 text-[#004eeb] outline-none focus-visible:underline"
          >
            <Plus className="size-4" aria-hidden />
            Add
          </button>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {eyedropperTile}
          {noneTile}
        </div>
        <div className="grid grid-cols-10 gap-1">
          {DEFAULT_SWATCHES.map((swatch) => (
            <SwatchTile
              key={swatch}
              color={swatch}
              label={swatch}
              active={activeHex === swatch.toLowerCase()}
              onClick={() => applyHex(swatch)}
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-[#eaecf0]" />

      {/* Custom colors — session-created swatches */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium leading-5 text-[#101828]">
            Custom colors
          </p>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold leading-5 text-[#004eeb] outline-none focus-visible:underline"
          >
            <Plus className="size-4" aria-hidden />
            Add
          </button>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {eyedropperTile}
          {noneTile}
        </div>
        {customColors.length > 0 ? (
          <div className="grid grid-cols-10 gap-1">
            {customColors.map((swatch) => (
              <SwatchTile
                key={swatch}
                color={swatch}
                label={swatch}
                active={activeHex === swatch.toLowerCase()}
                onClick={() => applyHex(swatch)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm leading-5 text-[#98a2b3]">
            Use Add to create a color.
          </p>
        )}
      </div>
    </div>
  )
}
