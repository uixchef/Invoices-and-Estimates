"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Box,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Italic,
  Link2,
  Minus,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  Underline,
  X,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ColorPicker } from "@/components/invoices/builder/color-picker"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import type {
  BuilderConditionRule,
  BuilderLayerStyle,
} from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

/**
 * Spacing icons reused from the medium builder (`/public/icons/safe-area`) so
 * padding, margin, and the uniform/per-side toggle read identically across the
 * product. Corner- and border-radius glyphs come from the same Figma source
 * (`/public/icons/edits`).
 */
const SAFE_AREA = "/icons/safe-area"
const PADDING_ICON = {
  left: `${SAFE_AREA}/flex-align-left.png`,
  top: `${SAFE_AREA}/flex-align-top.png`,
  right: `${SAFE_AREA}/flex-align-right.png`,
  bottom: `${SAFE_AREA}/flex-align-bottom.png`,
} as const
const MARGIN_ICON = {
  horizontal: `${SAFE_AREA}/distribute-spacing-horizontal.png`,
  vertical: `${SAFE_AREA}/distribute-spacing-vertical.png`,
} as const
const MAXIMIZE_ICON = `${SAFE_AREA}/maximize-02.png`
const MAXIMIZE_ICON_ACTIVE = `${SAFE_AREA}/maximize-02-blue.png`

const EDIT_ICONS = "/icons/edits"
const ROUNDED_CORNER_ICON = `${EDIT_ICONS}/rounded-corner.svg`
const CORNER_RADIUS_ALL_ICON = `${EDIT_ICONS}/corner-radius.png`
/** Border-width glyphs (Figma 3245:42292): a uniform "line weight" collapsed
 *  icon and per-side stroke glyphs in the matrix's [Left, Top, Right, Bottom]
 *  cell order. */
const BORDER_WIDTH_ICON = {
  all: `${EDIT_ICONS}/line-weight.png`,
  top: `${EDIT_ICONS}/border-top.svg`,
  right: `${EDIT_ICONS}/border-right.svg`,
  bottom: `${EDIT_ICONS}/border-bottom.svg`,
  left: `${EDIT_ICONS}/grid-dots-left.svg`,
} as const
/** Renders a static (PNG/SVG) icon asset at the matrix-cell icon size. */
function IconImg({
  src,
  className,
  style,
}: {
  src: string
  className?: string
  style?: React.CSSProperties
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      style={style}
      className={cn("block size-3.5 shrink-0", className)}
    />
  )
}

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans serif", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: 'Georgia, "Times New Roman", Times, serif' },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
]

const FONT_WEIGHTS = [
  { label: "Default", value: "" },
  { label: "Thin (100)", value: "100" },
  { label: "Light (300)", value: "300" },
  { label: "Regular (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semibold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
  { label: "Extrabold (800)", value: "800" },
]

const BORDER_STYLES: { label: string; value: NonNullable<BuilderLayerStyle["borderStyle"]> }[] = [
  { label: "none", value: "none" },
  { label: "solid", value: "solid" },
  { label: "dashed", value: "dashed" },
  { label: "dotted", value: "dotted" },
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

/**
 * Full catalog of invoice data fields a layer can bind to (PM-defined). Shown in
 * both the "Change" and "Add field" pickers. Hierarchical labels disambiguate
 * the repeated leaves (e.g. Business vs Contact "Phone"); the underlying data
 * path is intentionally omitted per product direction.
 */
const CONNECTABLE_FIELDS = [
  "Invoice number",
  "Invoice number prefix",
  "Title",
  "Internal name",
  "Status",
  "Currency (ISO 4217)",
  "Issue date",
  "Due date",
  "Sent at",
  "Last paid at",
  "Business details › Business name",
  "Business details › Phone",
  "Business details › Website",
  "Business details › Logo",
  "Business details › Address › Address line 1",
  "Business details › Address › Address line 2",
  "Business details › Address › City",
  "Business details › Address › State / Region",
  "Business details › Address › Country code",
  "Business details › Address › Postal code",
  "Contact details › Contact ID",
  "Contact details › Name",
  "Contact details › Email",
  "Contact details › Phone",
  "Contact details › Company",
  "Contact details › Address › Address line 1",
  "Contact details › Address › Address line 2",
  "Contact details › Address › City",
  "Contact details › Address › State / Region",
  "Contact details › Address › Country code",
  "Contact details › Address › Postal code",
  "Sent from › Sender name",
  "Sent from › Sender email",
  "Sent by",
  "Discount › Discount value",
  "Discount › Discount type",
  "Subtotal",
  "Total tax",
  "Total discount",
  "Total",
  "Invoice total",
  "Amount paid",
  "Amount due",
  "Automatic taxes enabled",
  "Automatic taxes calculated",
  "Tax address type",
  "Payment schedule › Schedule type",
  "Tips › Tips enabled",
  "Payment methods › Stripe › Bank debit only",
  "Payment methods › NMI › Bank debit only",
]

/**
 * Data fields bound to a given layer. A container (section) exposes every field
 * it contains; a single text leaf binds to exactly one. Keyed by the canvas's
 * selectable labels so the Advanced panel reflects the real selection.
 */
const CONNECTED_FIELDS_BY_LAYER: Record<string, string[]> = {
  // Containers
  Header: ["Company name", "Business address", "Document type", "Invoice number"],
  "Billing details": [
    "Client name",
    "Address line 1",
    "Address line 2",
    "Issue date",
    "Due date",
    "Currency",
  ],
  Totals: ["Subtotal", "Tax total", "Grand total"],
  "Table header": ["Item description", "Quantity", "Unit price", "Line total"],
  "Pay online": ["Online payment link", "Grand total"],
  // Single leaves
  "Business name": ["Company name"],
  "Business address": ["Business address"],
  "Document type": ["Document type"],
  "Document number": ["Invoice number"],
  "Client name": ["Client name"],
  "Client address line 1": ["Address line 1"],
  "Client address line 2": ["Address line 2"],
  "Issue date": ["Issue date"],
  "Due date": ["Due date"],
  "Currency code": ["Currency"],
}

/** Resolves the connected fields for whichever layer is selected on the canvas. */
function connectedFieldsFor(label: string | null): string[] {
  if (!label) {
    return []
  }
  if (label in CONNECTED_FIELDS_BY_LAYER) {
    return CONNECTED_FIELDS_BY_LAYER[label]
  }
  // Line-item rows are labelled "Item 1", "Item 2", … and share a binding set.
  if (label.startsWith("Item ")) {
    return ["Item description", "Quantity", "Unit price", "Line total"]
  }
  return []
}

/** Conditional-logic accordion items — all share the same show/hide form. */
const CONDITION_ACCORDIONS: {
  key: "condition" | "repeat" | "wrap"
  icon: React.ReactNode
  label: string
  tooltip: string
}[] = [
  {
    key: "condition",
    icon: <Eye className="size-3.5" aria-hidden />,
    label: "Show / hide conditionally...",
    tooltip:
      "Only show this element when a field meets a condition — e.g. show a “PAID” stamp only when status is paid.",
  },
  {
    key: "repeat",
    icon: <Repeat className="size-3.5" aria-hidden />,
    label: "Repeat for each...",
    tooltip:
      "Repeat this element once for every item in a list — e.g. one table row per line item.",
  },
  {
    key: "wrap",
    icon: <Box className="size-3.5" aria-hidden />,
    label: "Wrap with...",
    tooltip:
      "Focus this element on one object so its fields get short names — e.g. wrap with the customer, then use {name} instead of {customer.name}.",
  },
]

/** Confirmation toast copy per conditional-logic card (Apply / Remove). */
const RULE_APPLIED_TOAST: Record<"condition" | "repeat" | "wrap", string> = {
  condition: "Conditional rule applied",
  repeat: "Repeat rule applied",
  wrap: "Wrap rule applied",
}

const RULE_CLEARED_TOAST: Record<"condition" | "repeat" | "wrap", string> = {
  condition: "Conditional rule removed",
  repeat: "Repeat rule removed",
  wrap: "Wrap rule removed",
}

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
    <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#101828]">
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
      {children}
    </span>
  )
}

function PanelDivider() {
  return <div className="h-px w-full shrink-0 bg-[#eaecf0]" />
}

const INPUT_SHELL = cn(
  "flex h-8 w-full items-center gap-2 rounded-[4px] border border-[#d0d5dd] bg-white px-2",
  "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-shadow",
  "focus-within:border-[#84adff] focus-within:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]"
)

/**
 * Hides the browser's native number spinner — these inputs use the explicit
 * +/− stepper buttons (and matrix cells) for incrementing instead.
 */
const NO_SPINNER = cn(
  "[appearance:textfield]",
  "[&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
  "[&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
)

/** Compact numeric stepper (Figma "Input Field" with +/−). */
function Stepper({
  value,
  placeholder,
  step = 1,
  min,
  onChange,
}: {
  value: number | undefined
  placeholder?: string
  step?: number
  min?: number
  onChange: (next: number | undefined) => void
}) {
  const clamp = (next: number) => (min != null ? Math.max(min, next) : next)
  const bump = (delta: number) => onChange(clamp((value ?? 0) + delta))

  return (
    <div className={INPUT_SHELL}>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent p-0 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828] outline-none placeholder:text-[#98a2b3]",
          NO_SPINNER
        )}
      />
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => bump(-step)}
          className="inline-flex size-5 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Increase"
          onClick={() => bump(step)}
          className="inline-flex size-5 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/**
 * "Select" control rendered with our shared HighRise dropdown (matching
 * PlaceholderSelect) instead of a native <select>: a bordered trigger that
 * aligns with the adjacent steppers (h-8) plus a check-marked menu.
 */
function SelectField({
  value,
  options,
  onChange,
}: {
  value: string
  options: { label: string; value: string }[]
  onChange: (next: string) => void
}) {
  const selected = options.find((option) => option.value === value) ?? options[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-8 w-full items-center gap-2 rounded-[4px] border border-[#d0d5dd] bg-white px-2 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-shadow hover:bg-[#f9fafb] focus-visible:border-[#84adff] focus-visible:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)] data-[state=open]:border-[#84adff] data-[state=open]:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]"
        >
          <span className="min-w-0 flex-1 truncate text-left font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828]">
            {selected?.label ?? ""}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-[#667085] transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[80] min-w-[var(--radix-dropdown-menu-trigger-width)] font-[family-name:var(--font-inter)]"
      >
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <DropdownMenuItem
              key={option.value || option.label}
              onSelect={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-none px-2 py-1.5 text-sm leading-5",
                isActive
                  ? "bg-[#eff4ff] text-[#004eeb] focus:bg-[#eff4ff] focus:text-[#004eeb]"
                  : "text-[#475467]"
              )}
            >
              <span className="truncate">{option.label}</span>
              {isActive ? (
                <Check className="size-4 shrink-0 text-[#004eeb]" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Single matrix cell: icon + right-aligned numeric input. */
function MatrixCell({
  icon,
  value,
  onChange,
}: {
  icon: React.ReactNode
  value: number | undefined
  onChange: (next: number | undefined) => void
}) {
  return (
    <div className={INPUT_SHELL}>
      <span className="shrink-0 text-[#667085]">{icon}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder="0"
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent p-0 text-right font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828] outline-none placeholder:text-[#98a2b3]",
          NO_SPINNER
        )}
      />
    </div>
  )
}

/**
 * Per-side / per-corner expand toggle pinned to a field's label row (Figma
 * 3350:51354). Collapsed shows the plain maximize-02 glyph; expanded fills with
 * blue/200 to read as active. Replaces the old inline toggle that sat beside the
 * matrix so the inputs can span the field's full width.
 */
function ExpandToggle({
  expanded,
  onToggle,
  label,
}: {
  expanded: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={expanded}
      aria-label={
        expanded ? `Edit ${label} together` : `Edit ${label} individually`
      }
      onClick={onToggle}
      className={cn(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        expanded ? "bg-[#b2ccff]" : "text-[#475467] hover:bg-[#f2f4f7]"
      )}
    >
      <IconImg src={expanded ? MAXIMIZE_ICON_ACTIVE : MAXIMIZE_ICON} className="size-[18px]" />
    </button>
  )
}

/** Field label row with a right-aligned expand toggle (Figma 3350:51354). */
function ExpandableFieldLabel({
  children,
  expanded,
  onToggle,
}: {
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex h-5 items-center justify-between gap-2">
      <FieldLabel>{children}</FieldLabel>
      <ExpandToggle
        expanded={expanded}
        onToggle={onToggle}
        label={String(children)}
      />
    </div>
  )
}

function ColorField({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (next: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(INPUT_SHELL, "cursor-pointer text-left outline-none")}
      >
        <span
          className="size-6 shrink-0 overflow-hidden rounded-[4px] border border-[#d0d5dd]"
          style={{ backgroundColor: value || "#ffffff" }}
          aria-hidden
        />
        <span
          className={cn(
            "truncate font-[family-name:var(--font-inter)] text-sm uppercase leading-5",
            value ? "text-[#101828]" : "normal-case text-[#98a2b3]"
          )}
        >
          {value ? toHex(value) : "Select color"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[80] p-3">
        <ColorPicker value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Edits inspector (Figma 3246:40316 / 3246:56726). Replaces the AI chat with a
 * two-tab property panel for the selected layer:
 *  - Style: typography, colors, spacing, sizing, and border — wired live to the
 *    layer's overrides so the preview updates instantly.
 *  - Advanced: conditional visibility, repetition, and data-field binding — UI
 *    scaffolding for forward-looking dynamic-content features.
 */
export function VisualEditsPanel() {
  const {
    inspectingLayer,
    inspectingLayerKind,
    editsTab,
    layerStyles,
    setLayerStyle,
    layerText,
    setLayerText,
  } = useLayoutBuilder()

  if (!inspectingLayer) {
    return null
  }

  if (editsTab === "advanced") {
    return <AdvancedTab />
  }

  if (editsTab === "content") {
    return (
      <ContentTab
        label={inspectingLayer}
        // "Content" only applies to individual text layers, not sections /
        // containers, which have no single editable string of their own.
        content={
          inspectingLayerKind === "text"
            ? (layerText[inspectingLayer] ?? "")
            : null
        }
        setContent={(next) => setLayerText(inspectingLayer, next)}
      />
    )
  }

  return (
    <StyleTab
      label={inspectingLayer}
      style={layerStyles[inspectingLayer] ?? {}}
      setLayerStyle={setLayerStyle}
    />
  )
}

/**
 * Content tab (Figma 3344:47420). Edits the layer's text (text leaves only) and
 * manages the data fields bound to the layer. Connected-field management lives
 * here now — the Advanced tab is reserved for conditional logic.
 */
function ContentTab({
  label,
  content,
  setContent,
}: {
  label: string
  /**
   * Editable text for an individual text layer; null for sections / containers
   * (which hide the "Content" field entirely).
   */
  content: string | null
  setContent: (next: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 pb-4">
      {content !== null ? (
        <section className="flex flex-col gap-1">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            aria-label={`Content for ${label}`}
            className={cn(
              "min-h-[56px] w-full resize-y rounded-[4px] border border-[#d0d5dd] bg-white p-1.5",
              "font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828]",
              "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-shadow",
              "placeholder:text-[#98a2b3]",
              "focus-visible:border-[#84adff] focus-visible:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]"
            )}
          />
        </section>
      ) : null}

      <ConnectedFields label={label} />
    </div>
  )
}

function StyleTab({
  label,
  style,
  setLayerStyle,
}: {
  label: string
  style: BuilderLayerStyle
  setLayerStyle: (label: string, patch: Partial<BuilderLayerStyle>) => void
}) {
  // Padding & margin start collapsed (uniform H/V); the maximize toggle expands
  // each to per-side editing, matching the medium builder's safe-area control.
  const [paddingPerSide, setPaddingPerSide] = useState(false)
  const [marginPerSide, setMarginPerSide] = useState(false)
  const [radiusPerCorner, setRadiusPerCorner] = useState(false)
  const [borderWidthPerSide, setBorderWidthPerSide] = useState(false)

  const set = (patch: Partial<BuilderLayerStyle>) => setLayerStyle(label, patch)

  const setMarginSide = (
    side: "Top" | "Right" | "Bottom" | "Left",
    next: number | undefined
  ) => {
    set({ [`margin${side}`]: next } as Partial<BuilderLayerStyle>)
  }

  const setMarginAxis = (axis: "horizontal" | "vertical", next: number | undefined) => {
    if (axis === "horizontal") {
      set({ marginLeft: next, marginRight: next })
    } else {
      set({ marginTop: next, marginBottom: next })
    }
  }

  const toggleMarginPerSide = () => {
    if (marginPerSide) {
      set({ marginRight: style.marginLeft, marginBottom: style.marginTop })
    }
    setMarginPerSide((prev) => !prev)
  }

  const familyOptions =
    style.fontFamily && !FONT_FAMILIES.some((font) => font.value === style.fontFamily)
      ? [{ label: "Custom", value: style.fontFamily }, ...FONT_FAMILIES]
      : FONT_FAMILIES

  const setPaddingSide = (
    side: "Top" | "Right" | "Bottom" | "Left",
    next: number | undefined
  ) => {
    set({ [`padding${side}`]: next } as Partial<BuilderLayerStyle>)
  }

  // Collapsed view: one value drives both sides of an axis.
  const setPaddingAxis = (axis: "horizontal" | "vertical", next: number | undefined) => {
    if (axis === "horizontal") {
      set({ paddingLeft: next, paddingRight: next })
    } else {
      set({ paddingTop: next, paddingBottom: next })
    }
  }

  const togglePaddingPerSide = () => {
    // When collapsing, fold the trailing sides back onto their axis lead so the
    // uniform inputs reflect a single value per axis.
    if (paddingPerSide) {
      set({ paddingRight: style.paddingLeft, paddingBottom: style.paddingTop })
    }
    setPaddingPerSide((prev) => !prev)
  }

  // Collapsed view: one value drives all four corners.
  const setRadiusUniform = (next: number | undefined) => {
    set({
      radiusTopLeft: next,
      radiusTopRight: next,
      radiusBottomRight: next,
      radiusBottomLeft: next,
    })
  }

  const setRadiusCorner = (
    corner: "TopLeft" | "TopRight" | "BottomRight" | "BottomLeft",
    next: number | undefined
  ) => {
    set({ [`radius${corner}`]: next } as Partial<BuilderLayerStyle>)
  }

  // Maximize toggles per-corner editing; collapsing folds every corner back onto
  // the top-left lead so the single uniform input reflects one value.
  const toggleRadiusPerCorner = () => {
    if (radiusPerCorner) {
      setRadiusUniform(style.radiusTopLeft)
    }
    setRadiusPerCorner((prev) => !prev)
  }

  // Border width mirrors the radius control: collapsed to a single uniform value,
  // expanding to per-side editing (Figma 3245:42292).
  const setBorderWidthSide = (
    side: "Top" | "Right" | "Bottom" | "Left",
    next: number | undefined
  ) => {
    set({ [`border${side}Width`]: next } as Partial<BuilderLayerStyle>)
  }

  const setBorderWidthUniform = (next: number | undefined) => {
    set({
      borderTopWidth: next,
      borderRightWidth: next,
      borderBottomWidth: next,
      borderLeftWidth: next,
    })
  }

  const toggleBorderWidthPerSide = () => {
    if (borderWidthPerSide) {
      setBorderWidthUniform(style.borderTopWidth)
    }
    setBorderWidthPerSide((prev) => !prev)
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Typography */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Typography</SectionLabel>

        <label className="flex flex-col gap-1">
          <FieldLabel>Font family</FieldLabel>
          <SelectField
            value={style.fontFamily ?? ""}
            options={familyOptions}
            onChange={(next) => set({ fontFamily: next || undefined })}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <FieldLabel>Weight</FieldLabel>
            <SelectField
              value={style.bold ? "700" : (style.fontWeight?.toString() ?? "")}
              options={FONT_WEIGHTS}
              onChange={(next) =>
                set({
                  fontWeight: next ? Number(next) : undefined,
                  bold: next === "700" ? true : false,
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Size</FieldLabel>
            <Stepper
              value={style.fontSize}
              min={1}
              placeholder="16"
              onChange={(next) => set({ fontSize: next })}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <FieldLabel>Style</FieldLabel>
            <div className="flex items-start gap-1">
              <StyleToggleButton
                active={Boolean(style.bold)}
                label="Bold"
                onClick={() => set({ bold: !style.bold })}
              >
                <Bold className="size-4" aria-hidden />
              </StyleToggleButton>
              <StyleToggleButton
                active={style.fontStyle === "italic"}
                label="Italic"
                onClick={() =>
                  set({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })
                }
              >
                <Italic className="size-4" aria-hidden />
              </StyleToggleButton>
              <StyleToggleButton
                active={Boolean(style.underline)}
                label="Underline"
                onClick={() => set({ underline: !style.underline })}
              >
                <Underline className="size-4" aria-hidden />
              </StyleToggleButton>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Alignment</FieldLabel>
            <div className="flex h-8 items-stretch overflow-hidden rounded-[4px] border border-[#d0d5dd]">
              {ALIGNMENTS.map(({ value, icon: Icon, label: alignLabel }, index) => (
                <SegmentToggle
                  key={value}
                  active={(style.textAlign ?? "left") === value}
                  label={alignLabel}
                  onClick={() => set({ textAlign: value })}
                  last={index === ALIGNMENTS.length - 1}
                >
                  <Icon className="size-4" aria-hidden />
                </SegmentToggle>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PanelDivider />

      {/* Colors */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Colors</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <FieldLabel>Text</FieldLabel>
            <ColorField value={style.color} onChange={(next) => set({ color: next })} />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Background</FieldLabel>
            <ColorField
              value={style.backgroundColor}
              onChange={(next) => set({ backgroundColor: next })}
            />
          </label>
        </div>
      </section>

      <PanelDivider />

      {/* Spacing */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Spacing</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <ExpandableFieldLabel
              expanded={paddingPerSide}
              onToggle={togglePaddingPerSide}
            >
              Padding
            </ExpandableFieldLabel>
            <SpacingMatrix
              perSide={paddingPerSide}
              values={{
                top: style.paddingTop,
                right: style.paddingRight,
                bottom: style.paddingBottom,
                left: style.paddingLeft,
              }}
              onAxisChange={setPaddingAxis}
              onSideChange={setPaddingSide}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ExpandableFieldLabel
              expanded={marginPerSide}
              onToggle={toggleMarginPerSide}
            >
              Margin
            </ExpandableFieldLabel>
            <SpacingMatrix
              perSide={marginPerSide}
              values={{
                top: style.marginTop,
                right: style.marginRight,
                bottom: style.marginBottom,
                left: style.marginLeft,
              }}
              onAxisChange={setMarginAxis}
              onSideChange={setMarginSide}
            />
          </div>
        </div>
      </section>

      <PanelDivider />

      {/* Sizing */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Sizing</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <FieldLabel>Width</FieldLabel>
            <Stepper
              value={style.width}
              min={0}
              placeholder="Auto"
              onChange={(next) => set({ width: next })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Height</FieldLabel>
            <Stepper
              value={style.height}
              min={0}
              placeholder="Auto"
              onChange={(next) => set({ height: next })}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <FieldLabel>Line height</FieldLabel>
            <Stepper
              value={style.lineHeight}
              step={0.1}
              min={0}
              placeholder="1.5"
              onChange={(next) => set({ lineHeight: next })}
            />
          </label>
          <div className="flex flex-col gap-1">
            <ExpandableFieldLabel
              expanded={radiusPerCorner}
              onToggle={toggleRadiusPerCorner}
            >
              Corner radius
            </ExpandableFieldLabel>
            <RadiusMatrix
              style={style}
              collapsedIcon={<IconImg src={CORNER_RADIUS_ALL_ICON} />}
              icons={{
                topLeft: (
                  <IconImg src={ROUNDED_CORNER_ICON} style={{ transform: "scaleX(-1)" }} />
                ),
                topRight: <IconImg src={ROUNDED_CORNER_ICON} />,
                bottomLeft: (
                  <IconImg src={ROUNDED_CORNER_ICON} style={{ transform: "rotate(180deg)" }} />
                ),
                bottomRight: (
                  <IconImg src={ROUNDED_CORNER_ICON} style={{ transform: "scaleY(-1)" }} />
                ),
              }}
              perCorner={radiusPerCorner}
              onCornerChange={setRadiusCorner}
              onUniformChange={setRadiusUniform}
            />
          </div>
        </div>
      </section>

      <PanelDivider />

      {/* Border (Figma 3245:42292) */}
      <section className="flex flex-col gap-3">
        <SectionLabel>Border</SectionLabel>
        <div className="grid grid-cols-2 items-start gap-4">
          <div className="flex flex-col gap-1">
            <ExpandableFieldLabel
              expanded={borderWidthPerSide}
              onToggle={toggleBorderWidthPerSide}
            >
              Width
            </ExpandableFieldLabel>
            <BorderWidthMatrix
              perSide={borderWidthPerSide}
              values={{
                top: style.borderTopWidth,
                right: style.borderRightWidth,
                bottom: style.borderBottomWidth,
                left: style.borderLeftWidth,
              }}
              onSideChange={setBorderWidthSide}
              onUniformChange={setBorderWidthUniform}
            />
          </div>
          <label className="flex flex-col gap-1">
            <FieldLabel>Style</FieldLabel>
            <SelectField
              value={style.borderStyle ?? "none"}
              options={BORDER_STYLES}
              onChange={(next) =>
                set({ borderStyle: next as BuilderLayerStyle["borderStyle"] })
              }
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <FieldLabel>Color</FieldLabel>
            <ColorField
              value={style.borderColor}
              onChange={(next) => set({ borderColor: next })}
            />
          </label>
        </div>
      </section>
    </div>
  )
}

/**
 * Independent style toggle (Bold / Italic / Underline) — Figma 3247:63441.
 * Unlike the alignment content switcher, these are separate bordered buttons
 * that fill with gray (#f2f4f7) when pressed.
 */
function StyleToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 flex-1 items-center justify-center rounded-[4px] border border-[#d0d5dd] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        active
          ? "bg-[#f2f4f7] text-[#1d2939]"
          : "bg-white text-[#475467] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#f9fafb]"
      )}
    >
      {children}
    </button>
  )
}

function SegmentToggle({
  active,
  label,
  onClick,
  last = false,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#155eef]/40",
        !last && "border-r border-[#d0d5dd]",
        active
          ? "bg-[#eff4ff] text-[#004eeb]"
          : "bg-white text-[#475467] hover:bg-[#f9fafb]"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Shared spacing control for Padding and Margin (Figma 3246:40319). Collapsed by
 * default to a uniform horizontal/vertical pair; the maximize toggle expands it
 * to per-side editing. Padding and Margin render from this single component so
 * they stay behaviourally identical.
 */
function SpacingMatrix({
  perSide,
  values,
  onAxisChange,
  onSideChange,
}: {
  perSide: boolean
  values: {
    top: number | undefined
    right: number | undefined
    bottom: number | undefined
    left: number | undefined
  }
  onAxisChange: (axis: "horizontal" | "vertical", next: number | undefined) => void
  onSideChange: (
    side: "Top" | "Right" | "Bottom" | "Left",
    next: number | undefined
  ) => void
}) {
  return perSide ? (
    <div className="grid grid-cols-2 gap-2">
      <MatrixCell
        icon={<IconImg src={PADDING_ICON.left} />}
        value={values.left}
        onChange={(next) => onSideChange("Left", next)}
      />
      <MatrixCell
        icon={<IconImg src={PADDING_ICON.top} />}
        value={values.top}
        onChange={(next) => onSideChange("Top", next)}
      />
      <MatrixCell
        icon={<IconImg src={PADDING_ICON.right} />}
        value={values.right}
        onChange={(next) => onSideChange("Right", next)}
      />
      <MatrixCell
        icon={<IconImg src={PADDING_ICON.bottom} />}
        value={values.bottom}
        onChange={(next) => onSideChange("Bottom", next)}
      />
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <MatrixCell
        icon={<IconImg src={MARGIN_ICON.horizontal} />}
        value={values.left}
        onChange={(next) => onAxisChange("horizontal", next)}
      />
      <MatrixCell
        icon={<IconImg src={MARGIN_ICON.vertical} />}
        value={values.top}
        onChange={(next) => onAxisChange("vertical", next)}
      />
    </div>
  )
}

/**
 * Corner-/border-radius control (Figma 3245:41442). Mirrors `SpacingMatrix`:
 * collapsed to a single uniform value, expanding to per-corner editing when the
 * maximize toggle is pressed.
 */
function RadiusMatrix({
  style,
  collapsedIcon,
  icons,
  perCorner,
  onCornerChange,
  onUniformChange,
}: {
  style: BuilderLayerStyle
  /** Glyph for the collapsed (uniform) single input. */
  collapsedIcon: React.ReactNode
  /** Per-corner glyphs in [TopLeft, TopRight, BottomLeft, BottomRight] order. */
  icons: {
    topLeft: React.ReactNode
    topRight: React.ReactNode
    bottomLeft: React.ReactNode
    bottomRight: React.ReactNode
  }
  perCorner: boolean
  onCornerChange: (
    corner: "TopLeft" | "TopRight" | "BottomRight" | "BottomLeft",
    next: number | undefined
  ) => void
  onUniformChange: (next: number | undefined) => void
}) {
  return perCorner ? (
    <div className="grid grid-cols-2 gap-2">
      <MatrixCell
        icon={icons.topLeft}
        value={style.radiusTopLeft}
        onChange={(next) => onCornerChange("TopLeft", next)}
      />
      <MatrixCell
        icon={icons.topRight}
        value={style.radiusTopRight}
        onChange={(next) => onCornerChange("TopRight", next)}
      />
      <MatrixCell
        icon={icons.bottomLeft}
        value={style.radiusBottomLeft}
        onChange={(next) => onCornerChange("BottomLeft", next)}
      />
      <MatrixCell
        icon={icons.bottomRight}
        value={style.radiusBottomRight}
        onChange={(next) => onCornerChange("BottomRight", next)}
      />
    </div>
  ) : (
    <MatrixCell
      icon={collapsedIcon}
      value={style.radiusTopLeft}
      onChange={onUniformChange}
    />
  )
}

/**
 * Border-width control (Figma 3245:42292). Mirrors `RadiusMatrix`: collapsed to a
 * single uniform "line weight" input, expanding to per-side (top / right / bottom
 * / left) editing in the matrix's [Left, Top, Right, Bottom] cell order.
 */
function BorderWidthMatrix({
  perSide,
  values,
  onSideChange,
  onUniformChange,
}: {
  perSide: boolean
  values: {
    top: number | undefined
    right: number | undefined
    bottom: number | undefined
    left: number | undefined
  }
  onSideChange: (
    side: "Top" | "Right" | "Bottom" | "Left",
    next: number | undefined
  ) => void
  onUniformChange: (next: number | undefined) => void
}) {
  return perSide ? (
    <div className="grid grid-cols-2 gap-2">
      <MatrixCell
        icon={<IconImg src={BORDER_WIDTH_ICON.left} />}
        value={values.left}
        onChange={(next) => onSideChange("Left", next)}
      />
      <MatrixCell
        icon={<IconImg src={BORDER_WIDTH_ICON.top} />}
        value={values.top}
        onChange={(next) => onSideChange("Top", next)}
      />
      <MatrixCell
        icon={<IconImg src={BORDER_WIDTH_ICON.right} />}
        value={values.right}
        onChange={(next) => onSideChange("Right", next)}
      />
      <MatrixCell
        icon={<IconImg src={BORDER_WIDTH_ICON.bottom} />}
        value={values.bottom}
        onChange={(next) => onSideChange("Bottom", next)}
      />
    </div>
  ) : (
    <MatrixCell
      icon={<IconImg src={BORDER_WIDTH_ICON.all} />}
      value={values.top}
      onChange={onUniformChange}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Advanced tab                                                        */
/* ------------------------------------------------------------------ */

/**
 * Searchable field picker body shared by the "Change" (rebind) and "Add field"
 * flows so both stay visually and behaviourally identical.
 */
function FieldSearchList({
  search,
  onSearchChange,
  selected,
  onSelect,
}: {
  search: string
  onSearchChange: (value: string) => void
  /** Currently bound field, highlighted with a check (rebind flow only). */
  selected?: string
  onSelect: (field: string) => void
}) {
  const matches = CONNECTABLE_FIELDS.filter((field) =>
    field.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="flex flex-col gap-1 bg-white px-4 pb-3 pt-3">
      <div className="flex h-7 items-center gap-2 rounded-[4px] border border-[#d0d5dd] bg-white px-2 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-shadow focus-within:border-[#84adff] focus-within:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]">
        <Search className="size-4 shrink-0 text-[#667085]" aria-hidden />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search fields"
          autoFocus
          className="min-w-0 flex-1 border-0 bg-transparent p-0 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828] outline-none placeholder:text-[#667085]"
        />
      </div>
      <ul role="listbox" className="flex max-h-[220px] flex-col overflow-y-auto">
        {matches.length === 0 ? (
          <li className="px-2 py-1 font-[family-name:var(--font-inter)] text-sm text-[#98a2b3]">
            No matching fields
          </li>
        ) : (
          matches.map((option) => {
            const isSelected = option === selected
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(option)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:bg-[#f4f3ff]",
                    isSelected && "bg-[#f5f8ff] font-medium"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-[#155eef]" aria-hidden />
                  ) : null}
                </button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

function AdvancedTab() {
  const {
    inspectingLayer,
    layerRules,
    setLayerRule,
    clearLayerRule,
    showCanvasToast,
  } = useLayoutBuilder()
  const [openCard, setOpenCard] = useState<"condition" | "repeat" | "wrap" | null>(
    null
  )
  // Applied rules for the inspected layer drive each card's saved state.
  const rules = inspectingLayer ? (layerRules[inspectingLayer] ?? {}) : {}

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Conditional logic */}
      <section className="flex flex-col gap-1">
        <SectionLabel>Conditional logic</SectionLabel>

        <div className="flex flex-col gap-2">
          {CONDITION_ACCORDIONS.map(({ key, icon, label, tooltip }) => (
            <ConditionAccordion
              key={key}
              icon={icon}
              label={label}
              tooltip={tooltip}
              selectOnly={key !== "condition"}
              open={openCard === key}
              onToggle={() => setOpenCard((prev) => (prev === key ? null : key))}
              rule={rules[key]}
              onApply={(rule) => {
                if (inspectingLayer) {
                  setLayerRule(inspectingLayer, key, rule)
                }
                setOpenCard(null)
                showCanvasToast(RULE_APPLIED_TOAST[key])
              }}
              onClear={() => {
                if (inspectingLayer) {
                  clearLayerRule(inspectingLayer, key)
                }
                setOpenCard(null)
                showCanvasToast(RULE_CLEARED_TOAST[key])
              }}
              onCancel={() => setOpenCard(null)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

/**
 * Connected-fields manager (Figma 3344:47420). Mirrors the layer selected on
 * the canvas: a container lists every data field it contains; a single leaf
 * shows just its one binding. Add / Change / Disconnect edit a local copy that
 * resets when the selection moves. Lives in the Content tab.
 */
function ConnectedFields({ label }: { label: string }) {
  // Index of the row whose binding is being changed (its picker is open).
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  // Whether the "Add field" accordion is open at the top of the list.
  const [addingField, setAddingField] = useState(false)
  const [search, setSearch] = useState("")

  const baseFields = useMemo(() => connectedFieldsFor(label), [label])
  const [fields, setFields] = useState<string[]>(baseFields)
  useEffect(() => {
    setFields(baseFields)
    setEditingIndex(null)
    setAddingField(false)
    setSearch("")
  }, [baseFields])

  const openAddField = () => {
    setAddingField(true)
    setEditingIndex(null)
    setSearch("")
  }

  return (
    <>
      {/* Connected fields — mirrors the layer selected on the canvas. A
          container lists every data field it contains; a single leaf shows just
          its one binding. */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Connected fields</SectionLabel>
          <button
            type="button"
            onClick={openAddField}
            className="inline-flex shrink-0 items-center gap-1 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#004eeb] outline-none focus-visible:underline"
          >
            <Plus className="size-4" aria-hidden />
            Add field
          </button>
        </div>

        {fields.length === 0 && !addingField ? (
          <p className="rounded-[8px] border border-dashed border-[#d0d5dd] px-4 py-3 text-center font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]">
            This layer has no connected fields.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-[#d0d5dd]">
            {/* Active "Add field" accordion — sits at the top until a field is
                chosen. It carries a Cancel (not Delete) since nothing is bound
                yet; picking a field promotes it to a normal connected row. */}
            {addingField ? (
              <div className="relative z-10 rounded-[8px] ring-1 ring-inset ring-[#84adff]">
                <div className="flex h-14 items-center gap-3 border-b border-[#84adff] bg-[#eff4ff] px-4">
                  <AccordionIcon active>
                    <Link2 className="size-3.5" aria-hidden />
                  </AccordionIcon>
                  <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#667085]">
                    Select a field
                  </span>
                  <button
                    type="button"
                    aria-label="Cancel adding field"
                    onClick={() => {
                      setAddingField(false)
                      setSearch("")
                    }}
                    className="inline-flex size-[18px] items-center justify-center rounded text-[#475467] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                  >
                    <X className="size-[18px]" aria-hidden />
                  </button>
                </div>
                <FieldSearchList
                  search={search}
                  onSearchChange={setSearch}
                  onSelect={(option) => {
                    setFields((prev) => [option, ...prev])
                    setAddingField(false)
                    setSearch("")
                  }}
                />
              </div>
            ) : null}

            {fields.map((field, index) => {
              const editing = editingIndex === index
              return (
                <div
                  key={`${field}-${index}`}
                  className={cn(
                    "relative",
                    (addingField || index > 0) && "border-t border-[#d0d5dd]",
                    // Only the row being changed is outlined in primary
                    // (Figma 3246:56729 active state).
                    editing && "z-10 rounded-[8px] ring-1 ring-inset ring-[#84adff]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-14 items-center gap-3 px-4",
                      editing ? "border-b border-[#84adff] bg-[#eff4ff]" : "bg-white"
                    )}
                  >
                    <AccordionIcon active={editing}>
                      <Link2 className="size-3.5" aria-hidden />
                    </AccordionIcon>
                    <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#101828]">
                      {field}
                    </span>
                    {editing ? (
                      <button
                        type="button"
                        aria-label={`Cancel changing ${field}`}
                        onClick={() => {
                          setEditingIndex(null)
                          setSearch("")
                        }}
                        className="inline-flex size-[18px] items-center justify-center rounded text-[#475467] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                      >
                        <X className="size-[18px]" aria-hidden />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Change ${field}`}
                        onClick={() => {
                          setEditingIndex(index)
                          setAddingField(false)
                          setSearch("")
                        }}
                        className="inline-flex size-[18px] items-center justify-center rounded text-[#475467] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                      >
                        <Pencil className="size-[18px]" aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Disconnect ${field}`}
                      onClick={() => {
                        setFields((prev) => prev.filter((_, i) => i !== index))
                        setEditingIndex(null)
                      }}
                      className="inline-flex size-[18px] items-center justify-center rounded text-[#475467] outline-none transition-colors hover:text-[#b42318] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                    >
                      <Trash2 className="size-[18px]" aria-hidden />
                    </button>
                  </div>

                  {editing ? (
                    <FieldSearchList
                      search={search}
                      onSearchChange={setSearch}
                      selected={field}
                      onSelect={(option) => {
                        setFields((prev) =>
                          prev.map((value, i) => (i === index ? option : value))
                        )
                        setEditingIndex(null)
                        setSearch("")
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

/** 24px rounded icon chip used in accordion headers (Figma 3245:60612). */
function AccordionIcon({
  active = false,
  children,
}: {
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-[6px]",
        active ? "bg-[#d1e0ff] text-[#155eef]" : "bg-[#f2f4f7] text-[#475467]"
      )}
    >
      {children}
    </span>
  )
}

/**
 * Conditional-logic accordion item (Figma 3245:60602). Collapsed it reads like
 * a card; expanded it reveals the shared show/hide form. Only one item is open
 * at a time, and Cancel/Apply collapse it back to the default state.
 */
function ConditionAccordion({
  icon,
  label,
  tooltip,
  open,
  onToggle,
  rule,
  onApply,
  onCancel,
  onClear,
  selectOnly = false,
}: {
  icon: React.ReactNode
  label: string
  tooltip: string
  open: boolean
  onToggle: () => void
  /** The applied rule for this card (undefined when nothing is saved yet). */
  rule?: BuilderConditionRule
  /** Saves the edited rule (and shows a confirmation toast in the parent). */
  onApply: (rule: BuilderConditionRule) => void
  /** Collapses without saving. */
  onCancel: () => void
  /** Removes the saved rule. */
  onClear: () => void
  /**
   * Repeat / Wrap only need a field picker, so this drops the show/hide toggle
   * and the condition ("Is set") select that the conditional-logic card uses.
   */
  selectOnly?: boolean
}) {
  // Draft edits live here until Apply; seeded from the saved rule each time the
  // card opens so reopening shows the persisted configuration.
  const [mode, setMode] = useState<"show" | "hide">(rule?.mode ?? "show")
  const [field, setField] = useState<string | undefined>(rule?.field)
  const [operator, setOperator] = useState<string>(rule?.operator ?? "Is set")

  useEffect(() => {
    if (open) {
      setMode(rule?.mode ?? "show")
      setField(rule?.field)
      setOperator(rule?.operator ?? "Is set")
    }
  }, [open, rule])

  const isConfigured = Boolean(rule?.field)
  const canApply = Boolean(field)
  const summary = isConfigured
    ? selectOnly
      ? rule?.field
      : `${rule?.mode === "hide" ? "Hide if" : "Show if"} ${rule?.field} · ${rule?.operator ?? "Is set"}`
    : null

  const apply = () => {
    if (!canApply) {
      return
    }
    onApply(selectOnly ? { field } : { mode, field, operator })
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border transition-colors",
        open
          ? "border-[#84adff]"
          : isConfigured
            ? "border-[#84adff]"
            : "border-[#d0d5dd]"
      )}
    >
      <div
        className={cn(
          "flex min-h-[52px] items-center gap-2 px-4 transition-colors",
          open ? "bg-[#eff4ff]" : "bg-white hover:bg-[#f9fafb]"
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#155eef]/40"
        >
          <AccordionIcon active={open || isConfigured}>{icon}</AccordionIcon>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="min-w-0 truncate font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#101828]">
              {label}
            </span>
            {!open && summary ? (
              <span className="min-w-0 truncate font-[family-name:var(--font-inter)] text-xs leading-4 text-[#475467]">
                {summary}
              </span>
            ) : null}
          </span>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`About ${label.replace(/\.\.\.$/, "")}`}
              className="inline-flex size-[18px] shrink-0 items-center justify-center rounded text-[#98a2b3] outline-none transition-colors hover:text-[#667085] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <Info className="size-[18px]" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="z-[80] max-w-[260px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>

      {open ? (
        <div className="flex flex-col gap-2 bg-white px-4 py-3">
          {!selectOnly ? (
            <div className="flex h-7 items-stretch overflow-hidden rounded-[4px] border border-[#d0d5dd]">
              <button
                type="button"
                onClick={() => setMode("show")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 border-r border-[#d0d5dd] font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 outline-none transition-colors",
                  mode === "show"
                    ? "bg-[#eff4ff] text-[#004eeb]"
                    : "bg-white text-[#475467] hover:bg-[#f9fafb]"
                )}
              >
                <Eye className="size-4" aria-hidden />
                Show only if
              </button>
              <button
                type="button"
                onClick={() => setMode("hide")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 outline-none transition-colors",
                  mode === "hide"
                    ? "bg-[#eff4ff] text-[#004eeb]"
                    : "bg-white text-[#475467] hover:bg-[#f9fafb]"
                )}
              >
                <EyeOff className="size-4" aria-hidden />
                Hide if
              </button>
            </div>
          ) : null}

          <PlaceholderSelect
            placeholder="Select field"
            options={CONDITION_FIELDS}
            value={field}
            onChange={setField}
          />
          {!selectOnly ? (
            <PlaceholderSelect
              options={CONDITION_OPERATORS}
              value={operator}
              onChange={setOperator}
            />
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            {isConfigured ? (
              <button
                type="button"
                onClick={onClear}
                className="mr-auto inline-flex h-7 items-center justify-center rounded-[4px] px-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#b42318] outline-none transition-colors hover:bg-[#fef3f2] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              >
                Remove
              </button>
            ) : null}
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-7 items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white px-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#475467] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!canApply}
              className="inline-flex h-7 items-center justify-center rounded-[4px] border border-[#155eef] bg-[#155eef] px-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#0040c1] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 disabled:cursor-not-allowed disabled:border-[#d0d5dd] disabled:bg-[#eaecf0] disabled:text-[#98a2b3] disabled:shadow-none"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Condition operators offered by the conditional-logic select (screenshot). */
const CONDITION_OPERATORS = [
  "Is set",
  "Is empty",
  "Equals",
  "Does not equal",
  "Greater than",
  "Greater than or equal",
  "Less than",
  "Less than or equal",
] as const

/** Invoice fields offered by the conditional-logic field picker. */
const CONDITION_FIELDS = [
  "Invoice number",
  "Invoice number prefix",
  "Title",
  "Internal name",
  "Status",
  "Currency (ISO 4217)",
  "Issue date",
  "Due date",
  "Sent at",
  "Last paid at",
] as const

function PlaceholderSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value?: string
  placeholder?: string
  /** When provided, the control opens a HighRise dropdown of choices. */
  options?: readonly string[]
  /**
   * When provided, the select is controlled: `value` is the source of truth and
   * every pick is reported here (no internal copy), so a parent can persist it.
   */
  onChange?: (next: string) => void
}) {
  const [internal, setInternal] = useState<string | undefined>(value)
  // Controlled when a parent owns the value via onChange; uncontrolled otherwise.
  const display = onChange ? value : (internal ?? value)
  const choose = (next: string) => {
    if (onChange) {
      onChange(next)
    } else {
      setInternal(next)
    }
  }

  const trigger = (
    <button
      type="button"
      className="group flex h-7 w-full items-center gap-2 rounded-[4px] border border-[#d0d5dd] bg-white px-2 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 data-[state=open]:border-[#84adff] data-[state=open]:ring-2 data-[state=open]:ring-[#155eef]/40"
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left font-[family-name:var(--font-inter)] text-sm leading-5",
          display ? "text-[#101828]" : "text-[#667085]"
        )}
      >
        {display ?? placeholder}
      </span>
      <ChevronDown
        className="size-4 shrink-0 text-[#667085] transition-transform duration-200 group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </button>
  )

  if (!options) {
    return trigger
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[80] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] font-[family-name:var(--font-inter)]"
      >
        {options.map((option) => {
          const isActive = option === display
          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => choose(option)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-none px-2 py-1.5 text-sm leading-5",
                isActive
                  ? "bg-[#eff4ff] text-[#004eeb] focus:bg-[#eff4ff] focus:text-[#004eeb]"
                  : "text-[#475467]"
              )}
            >
              <span className="truncate">{option}</span>
              {isActive ? (
                <Check
                  className="size-4 shrink-0 text-[#004eeb]"
                  aria-hidden
                />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
