"use client"

import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
import type { BuilderLayerStyle } from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

const FONT_FAMILIES = [
  { label: "Sans serif", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: 'Georgia, "Times New Roman", Times, serif' },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
]

const FONT_WEIGHTS = [
  { label: "Thin (100)", value: 100 },
  { label: "Light (300)", value: 300 },
  { label: "Regular (400)", value: 400 },
  { label: "Medium (500)", value: 500 },
  { label: "Semibold (600)", value: 600 },
  { label: "Bold (700)", value: 700 },
  { label: "Extrabold (800)", value: 800 },
]

const ALIGNMENTS: {
  value: NonNullable<BuilderLayerStyle["textAlign"]>
  icon: typeof AlignLeft
  label: string
}[] = [
  { value: "left", icon: AlignLeft, label: "Align left" },
  { value: "center", icon: AlignCenter, label: "Align center" },
  { value: "right", icon: AlignRight, label: "Align right" },
  { value: "justify", icon: AlignJustify, label: "Justify" },
]

/** Normalizes an rgb()/rgba() or hex color string into a #rrggbb hex value. */
function toHex(color: string | undefined): string {
  if (!color) {
    return "#000000"
  }
  if (color.startsWith("#")) {
    return color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color
  }
  const match = color.match(/\d+/g)
  if (!match || match.length < 3) {
    return "#000000"
  }
  const [r, g, b] = match.map((part) => Number(part))
  const hex = (value: number) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-inter)] text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-inter)] text-[13px] font-medium text-[#344054]">
      {children}
    </span>
  )
}

const CONTROL_CLASS = cn(
  "h-9 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm text-[#101828] outline-none transition-colors",
  "focus:border-[#9b8afb] focus:ring-2 focus:ring-[#9b8afb]/30"
)

/**
 * Visual edits inspector (Figma reference): replaces the AI chat with a
 * property panel for the selected layer — content, typography, colors, spacing.
 * All controls write through to the layer's overrides so the preview updates
 * live.
 */
export function VisualEditsPanel() {
  const { inspectingLayer, layerText, setLayerText, layerStyles, setLayerStyle } =
    useLayoutBuilder()

  if (!inspectingLayer) {
    return null
  }

  const label = inspectingLayer
  const style = layerStyles[label] ?? {}
  const content = layerText[label] ?? ""

  // Surface the live font family even if it isn't one of the presets.
  const familyOptions = style.fontFamily &&
    !FONT_FAMILIES.some((font) => font.value === style.fontFamily)
    ? [{ label: style.fontFamily, value: style.fontFamily }, ...FONT_FAMILIES]
    : FONT_FAMILIES

  return (
    <div className="flex flex-col gap-5 pb-4">
      <section className="flex flex-col gap-2">
        <SectionLabel>Content</SectionLabel>
        <textarea
          value={content}
          onChange={(event) => setLayerText(label, event.target.value)}
          rows={3}
          className={cn(
            "w-full resize-y rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm text-[#101828] outline-none transition-colors",
            "focus:border-[#9b8afb] focus:ring-2 focus:ring-[#9b8afb]/30"
          )}
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Typography</SectionLabel>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>Font Family</FieldLabel>
          <select
            value={style.fontFamily ?? ""}
            onChange={(event) =>
              setLayerStyle(label, { fontFamily: event.target.value })
            }
            className={CONTROL_CLASS}
          >
            {familyOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Font size</FieldLabel>
            <input
              type="number"
              min={1}
              value={style.fontSize ?? ""}
              onChange={(event) =>
                setLayerStyle(label, {
                  fontSize: Number(event.target.value) || undefined,
                })
              }
              className={CONTROL_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Font style</FieldLabel>
            <select
              value={style.fontStyle ?? "normal"}
              onChange={(event) =>
                setLayerStyle(label, {
                  fontStyle: event.target.value as BuilderLayerStyle["fontStyle"],
                })
              }
              className={CONTROL_CLASS}
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Font Weight</FieldLabel>
            <select
              value={style.fontWeight ?? 400}
              onChange={(event) =>
                setLayerStyle(label, { fontWeight: Number(event.target.value) })
              }
              className={CONTROL_CLASS}
            >
              {FONT_WEIGHTS.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Alignment</FieldLabel>
            <div className="flex h-9 items-center gap-1 rounded-lg border border-[#d0d5dd] bg-white p-1">
              {ALIGNMENTS.map(({ value, icon: Icon, label: alignLabel }) => {
                const active = (style.textAlign ?? "left") === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={alignLabel}
                    aria-pressed={active}
                    onClick={() => setLayerStyle(label, { textAlign: value })}
                    className={cn(
                      "inline-flex h-7 flex-1 items-center justify-center rounded-[6px] outline-none transition-colors [&_svg]:size-4",
                      active
                        ? "bg-[#f4f3ff] text-[#5925dc]"
                        : "text-[#667085] hover:bg-[#f2f4f7]"
                    )}
                  >
                    <Icon aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Colors</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Text Color</FieldLabel>
            <ColorControl
              value={style.color}
              placeholder="Select Color"
              onChange={(next) => setLayerStyle(label, { color: next })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Background color</FieldLabel>
            <ColorControl
              value={style.backgroundColor}
              placeholder="Select Color"
              onChange={(next) => setLayerStyle(label, { backgroundColor: next })}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Spacing</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Letter spacing</FieldLabel>
            <input
              type="number"
              step={0.1}
              value={style.letterSpacing ?? ""}
              placeholder="0"
              onChange={(event) =>
                setLayerStyle(label, {
                  letterSpacing:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              className={CONTROL_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Line height</FieldLabel>
            <input
              type="number"
              step={0.1}
              min={0}
              value={style.lineHeight ?? ""}
              placeholder="1.2"
              onChange={(event) =>
                setLayerStyle(label, {
                  lineHeight:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              className={CONTROL_CLASS}
            />
          </label>
        </div>
      </section>
    </div>
  )
}

function ColorControl({
  value,
  placeholder,
  onChange,
}: {
  value: string | undefined
  placeholder: string
  onChange: (next: string) => void
}) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-2">
      <label
        className="relative size-5 shrink-0 cursor-pointer overflow-hidden rounded border border-[#d0d5dd]"
        style={{ backgroundColor: value || "#ffffff" }}
      >
        <input
          type="color"
          value={toHex(value)}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <span
        className={cn(
          "truncate text-sm",
          value ? "text-[#101828]" : "text-[#98a2b3]"
        )}
      >
        {value || placeholder}
      </span>
    </div>
  )
}
