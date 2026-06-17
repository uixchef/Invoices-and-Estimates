"use client"

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Code2,
  Copy,
  GripVertical,
  ImageIcon,
  Info,
  Move,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { GeneratingCarousel } from "@/components/invoices/builder/generating-carousel"
import {
  VisualEditSelector,
  type SelectorAction,
} from "@/components/invoices/builder/visual-edit-selector"
import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import {
  DELETE_CANCEL_LABEL,
  DELETE_CONFIRMATION_LABEL,
  getDeleteConfirmationDescription,
} from "@/lib/delete-confirmation-copy"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { getDocumentPageProfile } from "@/lib/mediums-data"
import { useMediumsStore } from "@/lib/mediums-store"
import type {
  BuilderLayerStyle,
  GeneratedLayout,
  GeneratedLineItem,
  PlacedElement,
  PlacedElementZone,
} from "@/lib/layout-builder-types"
import { ELEMENT_DRAG_MIME } from "@/lib/layout-builder-types"
import {
  isMultilinePlacedKind,
  isTextPlacedKind,
} from "@/lib/placed-element-defaults"
import { cn } from "@/lib/utils"

/** DnD payload type for reordering top-level document sections via the grip. */
const SECTION_REORDER_MIME = "application/x-invoice-section-reorder"

/** Reorderable top-level body sections, in their default top-to-bottom order. */
const DEFAULT_SECTION_ORDER = ["billing", "items", "totals", "notes"] as const
type SectionUnit = (typeof DEFAULT_SECTION_ORDER)[number]
const isSectionUnit = (value: string): value is SectionUnit =>
  (DEFAULT_SECTION_ORDER as readonly string[]).includes(value)

/** Reorderable body sections of the branded template (the header is pinned). */
const BRANDED_SECTION_ORDER = [
  "customer",
  "items",
  "totals",
  "notes",
  "footer",
] as const

/**
 * Generic top-level section reorder model: owns the current order and produces
 * the `SectionMove` props (drag grip + up/down arrows + drop target) each
 * `SelectableSection` needs. Shared so any document surface can opt sections
 * into reordering with the same interaction as the standard template.
 */
function useSectionReorder(initial: readonly string[]): {
  order: string[]
  moveProps: (unit: string) => SectionMove
} {
  const [order, setOrder] = useState<string[]>([...initial])
  const valid = (unit: string) => initial.includes(unit)

  const moveUnit = (unit: string, direction: -1 | 1) => {
    setOrder((current) => {
      const index = current.indexOf(unit)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) {
        return current
      }
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const dropBefore = (target: string, dragged: string) => {
    if (!valid(dragged) || dragged === target) {
      return
    }
    setOrder((current) => {
      const next = current.filter((unit) => unit !== dragged)
      const targetIndex = next.indexOf(target)
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragged)
      return next
    })
  }

  const moveProps = (unit: string): SectionMove => {
    const index = order.indexOf(unit)
    return {
      unit,
      canUp: index > 0,
      canDown: index >= 0 && index < order.length - 1,
      onUp: () => moveUnit(unit, -1),
      onDown: () => moveUnit(unit, 1),
      onDrop: (dragged) => dropBefore(unit, dragged),
    }
  }

  return { order, moveProps }
}

/** Maps a layer's style overrides to an inline style object. */
function styleFromLayer(
  style?: BuilderLayerStyle,
  /**
   * Text layers render as inline spans, so box props promote them to
   * inline-block. Sections are already block/flex containers, so they pass
   * `false` to keep their own display (otherwise spacing/border edits would
   * collapse the layout).
   */
  promoteInlineBlock = true
): CSSProperties | undefined {
  if (!style) {
    return undefined
  }
  const result: CSSProperties = {}
  if (style.fontFamily) result.fontFamily = style.fontFamily
  if (style.fontSize) result.fontSize = style.fontSize
  if (style.fontStyle) result.fontStyle = style.fontStyle
  if (style.bold) {
    result.fontWeight = 700
  } else if (style.fontWeight) {
    result.fontWeight = style.fontWeight
  }
  if (style.underline) result.textDecoration = "underline"
  if (style.textAlign) result.textAlign = style.textAlign
  if (style.color) result.color = style.color
  if (style.backgroundColor) result.backgroundColor = style.backgroundColor
  if (style.letterSpacing != null) {
    result.letterSpacing = `${style.letterSpacing}px`
  }
  if (style.lineHeight != null) result.lineHeight = style.lineHeight

  // Box-model overrides. Text layers render as inline spans, so promote to
  // inline-block whenever any sizing / spacing / border property is set so the
  // values can actually take effect in the preview.
  const boxKeys = [
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft,
    style.marginTop,
    style.marginRight,
    style.marginBottom,
    style.marginLeft,
    style.width,
    style.height,
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ]
  const hasBox = boxKeys.some((value) => value != null)
  if (hasBox && promoteInlineBlock) result.display = "inline-block"
  if (style.paddingTop != null) result.paddingTop = style.paddingTop
  if (style.paddingRight != null) result.paddingRight = style.paddingRight
  if (style.paddingBottom != null) result.paddingBottom = style.paddingBottom
  if (style.paddingLeft != null) result.paddingLeft = style.paddingLeft
  if (style.marginTop != null) result.marginTop = style.marginTop
  if (style.marginRight != null) result.marginRight = style.marginRight
  if (style.marginBottom != null) result.marginBottom = style.marginBottom
  if (style.marginLeft != null) result.marginLeft = style.marginLeft
  if (style.width != null) result.width = style.width
  if (style.height != null) result.height = style.height

  if (
    style.radiusTopLeft != null ||
    style.radiusTopRight != null ||
    style.radiusBottomRight != null ||
    style.radiusBottomLeft != null
  ) {
    result.borderRadius = `${style.radiusTopLeft ?? 0}px ${
      style.radiusTopRight ?? 0
    }px ${style.radiusBottomRight ?? 0}px ${style.radiusBottomLeft ?? 0}px`
  }

  const hasBorderWidth =
    style.borderTopWidth != null ||
    style.borderRightWidth != null ||
    style.borderBottomWidth != null ||
    style.borderLeftWidth != null
  // Only paint a border once a real line style is picked (the picker defaults to
  // "none"), so per-side widths set with style "none" stay invisible.
  if (hasBorderWidth && style.borderStyle && style.borderStyle !== "none") {
    result.borderStyle = style.borderStyle
    result.borderColor = style.borderColor ?? "#101828"
    result.borderTopWidth = style.borderTopWidth ?? 0
    result.borderRightWidth = style.borderRightWidth ?? 0
    result.borderBottomWidth = style.borderBottomWidth ?? 0
    result.borderLeftWidth = style.borderLeftWidth ?? 0
  }
  return result
}

function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return letters || "B"
}

function Monogram({
  layout,
  onAccent = false,
}: {
  layout: GeneratedLayout
  onAccent?: boolean
}) {
  if (!layout.sections.logo) {
    return null
  }
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
        onAccent ? "bg-white/20 text-white" : "text-white"
      )}
      style={onAccent ? undefined : { backgroundColor: layout.accent }}
      aria-hidden
    >
      {initialsFor(layout.businessName)}
    </div>
  )
}

/**
 * Inline-editable layer. In visual edit mode the value renders into a
 * contentEditable span with a Cursor-style hover/focus outline and commits on
 * blur; otherwise it's plain text. Edits down to an empty value are reverted.
 *
 * Pass `onCommit` for layers backed by a structured `GeneratedLayout` field.
 * Omit it for otherwise-static layers (addresses, section labels, copy…): the
 * edit is then persisted to the generic `layerText` override store keyed by
 * `label`, which is what lets *every* layer be edited without new schema.
 *
 * Hovering reveals the layer's name badge (Cursor's element label) which, when
 * clicked, attaches the layer to the composer as a context chip.
 */
function EditableText({
  value,
  label,
  onCommit,
  className,
  showBadge = true,
}: {
  value: string
  label: string
  /** Structured-field setter. When omitted, edits persist to `layerText[label]`. */
  onCommit?: (next: string) => void
  className?: string
  /** When false, renders bare inline editing without the layer selector chrome
   * (e.g. inside a VisualEditSelector that already owns the selection chrome). */
  showBadge?: boolean
}) {
  const {
    editMode,
    selections,
    isLayerEditing,
    layerText,
    setLayerText,
    layerStyles,
    selectLayer,
    seedLayer,
    isLayerHidden,
    layerDuplicateCount,
    canMoveLayer,
    moveLayer,
  } = useLayoutBuilder()
  const spanRef = useRef<HTMLSpanElement>(null)
  // Bare leaves (inside a section selector) rest as plain text so a click
  // selects the whole enclosing section; a double-click flips this on to edit
  // the text in place.
  const [inlineEditing, setInlineEditing] = useState(false)

  // When inline editing turns on, focus the field and drop the caret at the end.
  useEffect(() => {
    if (!inlineEditing) {
      return
    }
    const node = spanRef.current
    if (!node) {
      return
    }
    node.focus()
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [inlineEditing])

  // Overrides win for display so inspector / inline edits show immediately;
  // structured fields also stay in sync via onCommit (for the code view).
  const current = layerText[label] ?? value
  const isSelected = selections.some((selection) => selection.label === label)
  const appliedStyle = styleFromLayer(layerStyles[label])

  // Deleted layers stay hidden in both edit and preview until undone.
  if (isLayerHidden(label)) {
    return null
  }

  if (!editMode) {
    return (
      <span className={className} style={appliedStyle}>
        {current}
      </span>
    )
  }

  const commit = (next: string) => {
    setLayerText(label, next)
    onCommit?.(next)
  }

  // Captures the layer's live content + computed typography on first inspect so
  // the Visual edits panel opens pre-filled with real values.
  const openInspector = () => {
    const node = spanRef.current
    if (node) {
      const cs = window.getComputedStyle(node)
      const align = ["left", "center", "right", "justify"].includes(cs.textAlign)
        ? (cs.textAlign as BuilderLayerStyle["textAlign"])
        : "left"
      seedLayer(label, {
        content: node.textContent ?? current,
        style: {
          fontFamily: cs.fontFamily,
          fontSize: Math.round(parseFloat(cs.fontSize)) || undefined,
          fontStyle: cs.fontStyle === "italic" ? "italic" : "normal",
          fontWeight: Number(cs.fontWeight) || undefined,
          textAlign: align,
          color: cs.color,
          backgroundColor:
            cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)"
              ? cs.backgroundColor
              : undefined,
        },
      })
    }
    selectLayer(label, "text")
  }

  const editable = (ringClass: string) => (
    <span
      ref={spanRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={0}
      style={appliedStyle}
      // Clicking a layer opens its Visual edits inspector (replaces the chat).
      onClick={(event) => {
        event.stopPropagation()
        openInspector()
      }}
      onBlur={(event) => {
        const next = (event.currentTarget.textContent ?? "").trim()
        if (next && next !== current) {
          commit(next)
        } else {
          event.currentTarget.textContent = current
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          event.currentTarget.textContent = current
          event.currentTarget.blur()
        }
      }}
      className={cn(
        "cursor-text rounded-[3px] outline-none transition-shadow",
        ringClass,
        className
      )}
    >
      {current}
    </span>
  )

  // Bare leaf: selection chrome is owned by the enclosing SelectableSection.
  // A single click bubbles up so the *whole section* is picked (consistent
  // with how BILL TO / Totals are selected); a double-click drops into inline
  // text editing for that one field.
  if (!showBadge) {
    if (inlineEditing) {
      return (
        <span
          ref={spanRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          tabIndex={0}
          style={appliedStyle}
          // Don't let caret clicks bubble up and re-select the section.
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            const next = (event.currentTarget.textContent ?? "").trim()
            if (next && next !== current) {
              commit(next)
            } else {
              event.currentTarget.textContent = current
            }
            setInlineEditing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              event.currentTarget.blur()
            }
            if (event.key === "Escape") {
              event.currentTarget.textContent = current
              event.currentTarget.blur()
            }
          }}
          className={cn(
            "cursor-text rounded-[3px] outline-none ring-2 ring-[#6938ef] transition-shadow",
            className
          )}
        >
          {current}
        </span>
      )
    }
    return (
      <span
        ref={spanRef}
        style={appliedStyle}
        onDoubleClick={(event) => {
          event.stopPropagation()
          setInlineEditing(true)
        }}
        className={cn("cursor-pointer rounded-[3px]", className)}
      >
        {current}
      </span>
    )
  }

  // Every other layer gets the full Cursor-style selector: click to select,
  // hover the selection for the scoped "Describe your edit" prompt. These small
  // inline fields keep only the reorder controls upfront (move up / down) —
  // duplicate / delete live in the inspector's "More options" menu to avoid
  // crowding the compact toolbar.
  const duplicateCount = layerDuplicateCount(label)
  // Only surface a reorder arrow for a direction that's actually available — no
  // permanently-disabled controls cluttering the compact field toolbar. Fields
  // with no registered reorder handler show just the "+".
  const moveActions: SelectorAction[] = []
  if (canMoveLayer(label, "up")) {
    moveActions.push({
      icon: <ArrowUp />,
      label: `Move ${label} up`,
      onClick: () => moveLayer(label, "up"),
    })
  }
  if (canMoveLayer(label, "down")) {
    moveActions.push({
      icon: <ArrowDown />,
      label: `Move ${label} down`,
      onClick: () => moveLayer(label, "down"),
    })
  }
  return (
    <>
      <VisualEditSelector
        label={label}
        selected={isSelected}
        working={isLayerEditing(label)}
        onSelect={openInspector}
        leftActions={moveActions}
        className="inline-flex max-w-full align-baseline"
      >
        {editable("focus:ring-2 focus:ring-[#6938ef]")}
      </VisualEditSelector>
      {Array.from({ length: duplicateCount }, (_, index) => {
        const copyLabel = `${label} copy ${index + 1}`
        return (
          <EditableText
            key={copyLabel}
            value={current}
            label={copyLabel}
            className={className}
          />
        )
      })}
    </>
  )
}

type SafePadding = { top: number; right: number; bottom: number; left: number }

function DocumentHeader({
  layout,
  safePadding,
}: {
  layout: GeneratedLayout
  safePadding: SafePadding
}) {
  const { updateLayout } = useLayoutBuilder()
  const addressLine = "123 Market Street · Suite 400"

  if (layout.style === "bold") {
    return (
      <div
        className="flex items-start justify-between gap-4 py-9 text-white"
        style={{
          backgroundColor: layout.accent,
          paddingRight: safePadding.right,
          paddingLeft: safePadding.left,
        }}
      >
        <div className="flex items-center gap-3">
          <Monogram layout={layout} onAccent />
          <div>
            <p className="text-xl font-bold leading-tight">
              <EditableText
                value={layout.businessName}
                label="Business name"
                onCommit={(businessName) => updateLayout({ businessName })}
              />
            </p>
            <p className="text-sm text-white/80">
              <EditableText value={addressLine} label="Business address" />
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold uppercase tracking-wide">
            <EditableText value={layout.documentType} label="Document type" />
          </p>
          <p className="text-sm text-white/80">
            <EditableText
              value={layout.documentNumber}
              label="Document number"
              onCommit={(documentNumber) => updateLayout({ documentNumber })}
            />
          </p>
        </div>
      </div>
    )
  }

  if (layout.style === "classic") {
    return (
      <div
        className="flex flex-col items-center gap-2 text-center"
        style={{
          paddingLeft: safePadding.left,
          paddingRight: safePadding.right,
        }}
      >
        <Monogram layout={layout} />
        <p className="text-2xl font-semibold text-[#101828]">
          <EditableText
            value={layout.businessName}
            label="Business name"
            onCommit={(businessName) => updateLayout({ businessName })}
          />
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-[#667085]">
          <EditableText value={layout.documentType} label="Document type" />
        </p>
        <p className="text-sm text-[#98a2b3]">
          <EditableText
            value={layout.documentNumber}
            label="Document number"
            onCommit={(documentNumber) => updateLayout({ documentNumber })}
          />
        </p>
      </div>
    )
  }

  // minimal + modern share a left-aligned header; modern adds a top accent bar
  // and tints the document title.
  return (
    <>
      {layout.style === "modern" ? (
        <div className="h-1.5 w-full" style={{ backgroundColor: layout.accent }} />
      ) : null}
      <div
        className="flex items-start justify-between gap-4"
        style={{
          paddingLeft: safePadding.left,
          paddingRight: safePadding.right,
        }}
      >
        <div className="flex items-center gap-3">
          <Monogram layout={layout} />
          <div>
            <p className="text-lg font-semibold text-[#101828]">
              <EditableText
                value={layout.businessName}
                label="Business name"
                onCommit={(businessName) => updateLayout({ businessName })}
              />
            </p>
            <p className="text-sm text-[#667085]">
              <EditableText value={addressLine} label="Business address" />
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-2xl font-semibold"
            style={
              layout.style === "modern" ? { color: layout.accent } : undefined
            }
          >
            <EditableText value={layout.documentType} label="Document type" />
          </p>
          <p className="text-sm text-[#667085]">
            <EditableText
              value={layout.documentNumber}
              label="Document number"
              onCommit={(documentNumber) => updateLayout({ documentNumber })}
            />
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * Wraps a whole document section (header, billing, totals, footer…) so it can be
 * picked in visual-edit mode just like a text leaf. Selecting attaches the
 * section to the composer and reveals the scoped "Describe your edit" prompt.
 * Outside edit mode it renders transparently (only adding a wrapper element when
 * a layout class needs to ride along).
 */
/** Drag/keyboard reorder wiring for a movable top-level document section. */
type SectionMove = {
  /** Stable key for the reorderable unit this section belongs to. */
  unit: string
  /** Whether this unit can move further up / down in the current order. */
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
  /** Drops a dragged section before this one. */
  onDrop: (draggedUnit: string) => void
}

function SelectableSection({
  label,
  className,
  children,
  move,
}: {
  label: string
  className?: string
  children: ReactNode
  move?: SectionMove
}) {
  const {
    editMode,
    selections,
    selectLayer,
    isLayerEditing,
    isLayerHidden,
    layerDuplicateCount,
    layerStyles,
    duplicateLayer,
    requestDeleteLayer,
    registerLayerMover,
  } = useLayoutBuilder()

  // Expose this section's reorder handlers to the inspector's "More options"
  // menu (Move up / Move down) via context. The handler closures churn each
  // render, so we read them through a ref and only re-register when the up/down
  // availability changes — keeping the menu in sync without update loops.
  const moveRef = useRef(move)
  moveRef.current = move
  const hasMove = move != null
  const canMoveUp = move?.canUp ?? false
  const canMoveDown = move?.canDown ?? false
  useEffect(() => {
    if (!hasMove) {
      registerLayerMover(label, null)
      return
    }
    registerLayerMover(label, {
      canUp: canMoveUp,
      canDown: canMoveDown,
      up: () => moveRef.current?.onUp(),
      down: () => moveRef.current?.onDown(),
    })
    return () => registerLayerMover(label, null)
  }, [label, hasMove, canMoveUp, canMoveDown, registerLayerMover])

  if (isLayerHidden(label)) {
    return null
  }

  const duplicateCount = layerDuplicateCount(label)
  // Section-level style edits from the Visual edits panel apply to the section's
  // box (padding, colours, border, radius, spacing). Keep its block/flex display.
  const appliedStyle = styleFromLayer(layerStyles[label], false)

  // Preview / edit-mode-off: drop the selection chrome but keep the applied
  // style overrides (and any duplicates) so edits made in edit mode persist when
  // it's turned off, matching what the user sees while editing.
  if (!editMode) {
    if (!className && !appliedStyle && duplicateCount === 0) {
      return <>{children}</>
    }
    return (
      <>
        <div className={className} style={appliedStyle}>
          {children}
        </div>
        {Array.from({ length: duplicateCount }, (_, index) => (
          <div
            key={`${label} copy ${index + 1}`}
            className={className}
            style={appliedStyle}
          >
            {children}
          </div>
        ))}
      </>
    )
  }

  // Left toolbar mirrors Figma 3197:71570: a "move" drag grip followed by the
  // move-up / move-down arrows. Only sections that opt into reordering get it.
  const leftActions: SelectorAction[] = move
    ? [
        {
          icon: <Move />,
          label: `Drag to move ${label}`,
          onClick: () => {},
          draggable: true,
          onDragStart: (event) => {
            event.dataTransfer.setData(SECTION_REORDER_MIME, move.unit)
            event.dataTransfer.effectAllowed = "move"
          },
        },
        {
          icon: <ArrowUp />,
          label: `Move ${label} up`,
          onClick: move.onUp,
          disabled: !move.canUp,
        },
        {
          icon: <ArrowDown />,
          label: `Move ${label} down`,
          onClick: move.onDown,
          disabled: !move.canDown,
        },
      ]
    : []

  return (
    <>
      <VisualEditSelector
        label={label}
        scope="section"
        selected={selections.some((selection) => selection.label === label)}
        working={isLayerEditing(label)}
        onSelect={() => selectLayer(label)}
        leftActions={leftActions}
        rightActions={[
          {
            icon: <Copy />,
            label: `Duplicate ${label}`,
            onClick: () => duplicateLayer(label),
          },
          {
            icon: <Trash2 />,
            label: `Delete ${label}`,
            onClick: () => requestDeleteLayer(label),
          },
        ]}
        onReorderDragOver={
          move
            ? (event) => {
                if (event.dataTransfer.types.includes(SECTION_REORDER_MIME)) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                }
              }
            : undefined
        }
        onReorderDrop={
          move
            ? (event) => {
                const dragged = event.dataTransfer.getData(SECTION_REORDER_MIME)
                if (dragged) {
                  event.preventDefault()
                  move.onDrop(dragged)
                }
              }
            : undefined
        }
        className={className}
        style={appliedStyle}
      >
        {children}
      </VisualEditSelector>
      {Array.from({ length: duplicateCount }, (_, index) => {
        const copyLabel = `${label} copy ${index + 1}`
        return (
          <div key={copyLabel} className={className} style={appliedStyle}>
            {children}
          </div>
        )
      })}
    </>
  )
}

/**
 * Fallback design width of the invoice paper, used until a medium resolves. The
 * live width comes from the selected medium's `DocumentPageProfile`.
 */
const DOCUMENT_WIDTH = 595
const DOCUMENT_PAGE_GAP = 24

const DOCUMENT_PAPER_SHELL =
  "mx-auto flex w-full flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]"

/**
 * Stacks fixed-height page shells and clips one continuous document flow across
 * them — same mental model as Google Docs page breaks in the builder preview.
 */
function PaginatedDocument({
  pageWidth,
  pageHeight,
  padTop,
  padBottom,
  paperClassName,
  children,
}: {
  pageWidth: number
  pageHeight: number
  padTop: number
  padBottom: number
  paperClassName: string
  children: ReactNode
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)

  // The medium's top/bottom safe area is reserved as empty margin bands on every
  // page, so content only ever flows through the usable area between them.
  const usableHeight = Math.max(pageHeight - padTop - padBottom, 1)

  useLayoutEffect(() => {
    const measure = measureRef.current
    if (!measure) {
      return
    }

    const update = () => {
      const contentHeight = measure.getBoundingClientRect().height
      setPageCount(Math.max(1, Math.ceil(contentHeight / usableHeight)))
    }

    const observer = new ResizeObserver(update)
    observer.observe(measure)
    update()
    return () => observer.disconnect()
  }, [usableHeight, pageWidth, children])

  return (
    <div className="relative flex flex-col" style={{ gap: DOCUMENT_PAGE_GAP }}>
      <div
        ref={measureRef}
        className="pointer-events-none absolute left-0 top-0 opacity-0"
        style={{ width: pageWidth }}
        aria-hidden
      >
        {children}
      </div>

      {Array.from({ length: pageCount }, (_, pageIndex) => (
        <div
          key={pageIndex}
          className={cn(DOCUMENT_PAPER_SHELL, paperClassName)}
          style={{ width: pageWidth, height: pageHeight }}
        >
          <div
            className="w-full"
            style={{ height: pageHeight, paddingTop: padTop, paddingBottom: padBottom }}
          >
            <div className="relative h-full overflow-hidden">
              <div
                className="absolute left-0 right-0 top-0"
                style={{
                  transform: `translateY(-${pageIndex * usableHeight}px)`,
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function parseElementDrag(
  dataTransfer: DataTransfer
): { kind: string; label: string } | null {
  const raw = dataTransfer.getData(ELEMENT_DRAG_MIME)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as { kind?: string; label?: string }
    if (!parsed.kind || !parsed.label) {
      return null
    }
    return { kind: parsed.kind, label: parsed.label }
  } catch {
    return null
  }
}

function PlacedEditableText({
  value,
  onChange,
  editMode,
  className,
  multiline = false,
}: {
  value: string
  onChange: (next: string) => void
  editMode: boolean
  className?: string
  multiline?: boolean
}) {
  if (!editMode) {
    if (multiline) {
      return (
        <div className={className}>
          {value.split("\n").map((line, index) => (
            <p key={index} className={index > 0 ? "mt-1" : undefined}>
              {line}
            </p>
          ))}
        </div>
      )
    }
    return <span className={className}>{value}</span>
  }

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      spellCheck={false}
      onBlur={(event) => {
        const next = multiline
          ? (event.currentTarget.innerText ?? "").trimEnd()
          : (event.currentTarget.textContent ?? "").trim()
        if (next !== value) {
          onChange(next)
        }
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      className={cn(
        "block rounded-[2px] outline-none transition-shadow",
        "ring-1 ring-transparent hover:ring-[#9b8afb] focus:ring-2 focus:ring-[#6938ef]",
        multiline && "min-h-[1.25rem] whitespace-pre-wrap",
        className
      )}
    >
      {value}
    </span>
  )
}

function PlacedElementView({
  element,
  editMode,
  onContentChange,
}: {
  element: PlacedElement
  editMode: boolean
  onContentChange: (content: string) => void
}) {
  const { kind, content } = element
  const multiline = isMultilinePlacedKind(kind)

  const editable = (className: string) => (
    <PlacedEditableText
      value={content}
      onChange={onContentChange}
      editMode={editMode}
      multiline={multiline}
      className={className}
    />
  )

  if (kind === "divider") {
    return <div className="h-px w-full bg-[#eaecf0]" aria-hidden />
  }

  if (kind === "spacer") {
    return <div className="h-6 w-full" aria-hidden />
  }

  if (kind === "image") {
    return (
      <div
        className={cn(
          "flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#d0d5dd] bg-[#f9fafb]",
          editMode && "hover:border-[#84adff] hover:bg-[#f5f8ff]"
        )}
      >
        <ImageIcon className="size-8 text-[#98a2b3]" aria-hidden />
        <span className="font-[family-name:var(--font-inter)] text-sm text-[#667085]">
          {editMode ? "Replace image" : "Image placeholder"}
        </span>
      </div>
    )
  }

  if (kind === "button") {
    return (
      <span className="inline-flex h-9 items-center rounded border border-[#d0d5dd] bg-white px-4 font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {editable("inline")}
      </span>
    )
  }

  if (kind.startsWith("columns-")) {
    const count = Number.parseInt(kind.split("-")[1] ?? "1", 10)
    return (
      <div className="flex w-full gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="min-w-0 flex-1">
            {editable(
              "font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]"
            )}
          </div>
        ))}
      </div>
    )
  }

  if (kind === "table") {
    return (
      <div className="w-full overflow-hidden rounded border border-[#eaecf0]">
        <div className="grid grid-cols-[1fr_56px_80px] gap-3 border-b border-[#eaecf0] bg-[#fcfcfd] px-3 py-2 font-[family-name:var(--font-inter)] text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="grid grid-cols-[1fr_56px_80px] gap-3 px-3 py-2.5 font-[family-name:var(--font-inter)] text-sm text-[#101828]">
          <span className="text-[#667085]">Item name</span>
          <span className="text-right text-[#667085]">1</span>
          <span className="text-right font-medium">$0.00</span>
        </div>
      </div>
    )
  }

  if (kind === "heading") {
    return editable(
      "font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]"
    )
  }

  if (kind === "list") {
    const items = content.split("\n").filter(Boolean)
    return (
      <ul className="list-disc space-y-1 pl-5 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]">
        {items.map((item, index) => (
          <li key={index}>
            {editMode ? (
              <PlacedEditableText
                value={item}
                onChange={(line) => {
                  const next = [...items]
                  next[index] = line
                  onContentChange(next.join("\n"))
                }}
                editMode
                className="inline"
              />
            ) : (
              item
            )}
          </li>
        ))}
      </ul>
    )
  }

  if (kind === "quote") {
    return (
      <blockquote className="border-l-2 border-[#84adff] pl-3 font-[family-name:var(--font-inter)] text-sm italic leading-5 text-[#667085]">
        {editable("block")}
      </blockquote>
    )
  }

  if (kind === "container") {
    return (
      <div className="rounded border border-[#eaecf0] bg-[#fcfcfd] p-4">
        {editable(
          "font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]"
        )}
      </div>
    )
  }

  // paragraph and fallback
  return editable(
    "font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]"
  )
}

/**
 * Drop target between document sections. Invisible until an element is dragged
 * over — then shows a 1.5px insertion line. Renders placed element placeholders
 * after drop.
 */
function ElementDropZone({ zone }: { zone: PlacedElementZone }) {
  const {
    placedElements,
    addPlacedElement,
    updatePlacedElementContent,
    removePlacedElement,
    editMode,
  } = useLayoutBuilder()
  const [dragOver, setDragOver] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<PlacedElement | null>(null)
  const zoneElements = placedElements.filter((element) => element.zone === zone)

  const acceptDrag = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(ELEMENT_DRAG_MIME)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) {
      return
    }
    setDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    const payload = parseElementDrag(event.dataTransfer)
    if (!payload) {
      return
    }
    addPlacedElement({ kind: payload.kind, label: payload.label, zone })
  }

  return (
    <div className="flex flex-col gap-2">
      {zoneElements.map((element) => (
        <div
          key={element.id}
          className={cn(
            "group/placed relative",
            editMode &&
              "rounded-sm ring-1 ring-transparent hover:ring-[#9b8afb]/40"
          )}
        >
          {editMode ? (
            <button
              type="button"
              aria-label={`Remove ${element.label}`}
              onClick={() => setPendingRemove(element)}
              className="absolute -right-1 -top-1 z-10 inline-flex size-6 items-center justify-center rounded-full border border-[#eaecf0] bg-white text-[#667085] opacity-0 shadow-sm outline-none transition-opacity hover:border-[#fda29b] hover:text-[#b42318] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#155eef]/40 group-hover/placed:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <PlacedElementView
            element={element}
            editMode={editMode}
            onContentChange={(content) =>
              updatePlacedElementContent(element.id, content)
            }
          />
        </div>
      ))}

      {/* Transparent hit target; only the 1.5px line shows while dragging over. */}
      <div
        onDragOver={acceptDrag}
        onDragEnter={acceptDrag}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative -my-1 flex h-2 items-center"
        aria-hidden
      >
        <div
          className={cn(
            "w-full rounded-full bg-[#6938ef] transition-opacity duration-150",
            dragOver ? "h-[1.5px] opacity-100" : "h-0 opacity-0"
          )}
        />
      </div>

      <ConfirmationDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemove(null)
          }
        }}
        title="Delete element"
        description={
          pendingRemove
            ? getDeleteConfirmationDescription(pendingRemove.label)
            : null
        }
        confirmLabel={DELETE_CONFIRMATION_LABEL}
        cancelLabel={DELETE_CANCEL_LABEL}
        variant="destructive"
        onConfirm={() => {
          if (pendingRemove) {
            removePlacedElement(pendingRemove.id)
          }
          setPendingRemove(null)
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  )
}

function DocumentStage({ children }: { children: ReactNode }) {
  const { mediumId } = useLayoutBuilder()
  const documentWidth = getDocumentPageProfile(mediumId).widthPx || DOCUMENT_WIDTH
  const outerRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  )

  useLayoutEffect(() => {
    const outer = outerRef.current
    const doc = docRef.current
    if (!outer || !doc) {
      return
    }

    const update = () => {
      // clientWidth excludes the pane's vertical scrollbar, so the scaled
      // document always fits the usable width and keeps the pane's padding.
      const available = outer.clientWidth
      const next = available > 0 ? Math.min(1, available / documentWidth) : 1
      setScale(next)
      setSize({ width: documentWidth * next, height: doc.offsetHeight * next })
    }

    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(doc)
    update()
    // Re-measure once layout settles (e.g. when the code pane opens and the
    // preview pane reflows in the same commit) so the fit never lags a frame.
    const raf = requestAnimationFrame(update)
    window.addEventListener("resize", update)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
    }
  }, [documentWidth])

  return (
    // overflow-hidden guarantees the scaled document can never spill past the
    // pane's padding and break the rounded canvas frame, even mid-reflow.
    <div ref={outerRef} className="w-full min-w-0 overflow-hidden">
      <div
        className="mx-auto"
        style={size ? { width: size.width, height: size.height } : undefined}
      >
        <div
          ref={docRef}
          style={{
            width: documentWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Editable builder surface for the detailed branded invoice template (Figma node
 * 3333:158560). Mirrors `BrandedInvoiceDocument` (the pure renderer used by cards
 * and the preview panel) but wraps every text leaf in `EditableText` and every
 * region in `SelectableSection`, so the same click-to-select + inline-edit +
 * scoped-prompt affordances the other styles have apply here too. Pure renderer
 * and this editable twin share markup so the two can never visually drift.
 */
function BrandedDocumentSurface() {
  const { generatedLayout: layout, updateLayout, mediumId } = useLayoutBuilder()
  const pageProfile = getDocumentPageProfile(mediumId)

  const accent = layout.accent
  const lightAccent = "#eaecf5"
  const money = (value: number) => formatMoney(layout.currencySymbol, value)
  const title = /invoice/i.test(layout.documentType)
    ? "INVOICE"
    : layout.documentType.toUpperCase()

  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  )
  const discountRate = layout.discountRate || 0.12
  const discount = subtotal * discountRate
  const taxableSubtotal = subtotal - discount
  const centralRate = 0.1
  const cityRate = 0.08
  const centralTax = taxableSubtotal * centralRate
  const cityTax = taxableSubtotal * cityRate
  const deposit = 50
  const amountDue = taxableSubtotal + centralTax + cityTax - deposit
  const paymentHalf = amountDue / 2
  const taxPct = Math.round((layout.taxRate || 0.18) * 100)

  const businessSlug =
    layout.businessName
      .split(",")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "studio"

  const hint = "text-[14px] leading-5 text-[#475467]"
  const totalLabel =
    "flex-1 px-3 text-[16px] leading-6 font-medium overflow-hidden text-ellipsis whitespace-nowrap"
  const totalAmount =
    "w-[120px] px-4 text-right text-[16px] leading-6 font-medium text-[#101828]"

  // Reorderable body sections (the header is pinned, like the standard surface).
  // The grip drag + up/down arrows on each section selector rewrite this order.
  const { order: sectionOrder, moveProps } = useSectionReorder(
    BRANDED_SECTION_ORDER
  )

  return (
    <PaginatedDocument
      pageWidth={pageProfile.widthPx}
      pageHeight={pageProfile.heightPx}
      padTop={0}
      padBottom={0}
      paperClassName="font-[family-name:var(--font-inter)]"
    >
      <div className="bg-white text-[#101828]">
        {/* Business information (pinned) */}
        <SelectableSection
          label="Business header"
          className="flex items-start justify-between gap-4 overflow-hidden p-4"
        >
          <div className="flex flex-col gap-0.5">
            <p className={hint}>
              <EditableText
                value={layout.businessName}
                label="Business name"
                onCommit={(businessName) => updateLayout({ businessName })}
              />
            </p>
            <p className={hint}>
              <EditableText value={`www.${businessSlug}.co`} label="Business website" />
            </p>
            <p className={hint}>
              <EditableText value="+91 86900 01213" label="Business phone" />
            </p>
            <p className={hint}>
              <EditableText
                value="2/112, Friends Colony, Raja Park"
                label="Business address line 1"
              />
            </p>
            <p className={hint}>
              <EditableText
                value="Jaipur, Rajasthan, India, 302031"
                label="Business address line 2"
              />
            </p>
          </div>
          <p
            className="text-[20px] font-semibold leading-[30px]"
            style={{ color: accent }}
          >
            <EditableText value={title} label="Document title" />
          </p>
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            {initialsFor(layout.businessName)}
          </div>
        </SelectableSection>

        {(() => {
          const unitNodes: Record<string, ReactNode> = {
            customer: (
        // Customer information + info bar
        <SelectableSection
          label="Customer information"
          className="flex items-start justify-between border-t border-[#eaecf0] pb-4 pl-4"
          move={moveProps("customer")}
        >
          <div className="flex flex-col gap-1 pt-2">
            <p className="text-[14px] font-medium leading-5 text-[#101828]">
              <EditableText value="Billed to" label="Billed to label" />
            </p>
            <div className="flex flex-col gap-0.5">
              <p className={hint}>
                <EditableText
                  value={layout.clientName}
                  label="Client name"
                  onCommit={(clientName) => updateLayout({ clientName })}
                />
              </p>
              <p className={hint}>
                <EditableText value="hey@uixchef.com" label="Client email" />
              </p>
              <p className={hint}>
                <EditableText value="+91 86900 01213" label="Client phone" />
              </p>
              <p className={hint}>
                <EditableText
                  value="2/112, Friends Colony, Raja Park"
                  label="Client address line 1"
                />
              </p>
              <p className={hint}>
                <EditableText
                  value="Jaipur, Rajasthan, India, 302031"
                  label="Client address line 2"
                />
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex">
              <div
                className="flex flex-col items-center justify-center gap-1 p-4 text-center text-[14px] leading-5"
                style={{ backgroundColor: lightAccent, color: accent }}
              >
                <p className="font-medium">
                  <EditableText value="Issue date" label="Issue date label" />
                </p>
                <EditableText
                  value={layout.issueDate}
                  label="Issue date"
                  onCommit={(issueDate) => updateLayout({ issueDate })}
                />
              </div>
              <div
                className="flex flex-col items-center justify-center gap-1 p-4 text-center text-[14px] leading-5"
                style={{ backgroundColor: accent, color: "#ffffff" }}
              >
                <p className="font-medium">
                  <EditableText value="Invoice no." label="Invoice no. label" />
                </p>
                <EditableText
                  value={layout.documentNumber}
                  label="Invoice number"
                  onCommit={(documentNumber) => updateLayout({ documentNumber })}
                />
              </div>
              <div
                className="flex flex-col items-center justify-center gap-1 p-4 text-center text-[14px] leading-5"
                style={{ backgroundColor: lightAccent, color: accent }}
              >
                <p className="font-medium">
                  <EditableText value="Due date" label="Due date label" />
                </p>
                <EditableText
                  value={layout.dueDate}
                  label="Due date"
                  onCommit={(dueDate) => updateLayout({ dueDate })}
                />
              </div>
            </div>
            <div
              className="flex w-[114px] items-center justify-center rounded px-2.5 py-1.5 text-[16px] font-semibold leading-6 text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
              style={{ backgroundColor: accent }}
            >
              {`Pay ${money(amountDue)}`}
            </div>
          </div>
        </SelectableSection>
            ),
            items: (
        // Products table
        <SelectableSection
          label="Items table"
          className="flex flex-col border-b border-[#d0d5dd]"
          move={moveProps("items")}
        >
          <div className="flex">
            <div className="flex h-9 flex-1 items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
              <EditableText value="Item" label="Item header" showBadge={false} />
            </div>
            <div className="flex h-9 w-[110px] items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
              <EditableText value="Price" label="Price header" showBadge={false} />
            </div>
            <div className="flex h-9 w-[60px] items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
              <EditableText value="Qty" label="Qty header" showBadge={false} />
            </div>
            <div className="flex h-9 w-[90px] items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
              <EditableText value="Tax" label="Tax header" showBadge={false} />
            </div>
            <div className="flex h-9 w-[120px] items-center justify-end border-b border-[#d0d5dd] px-4 text-right text-[16px] font-semibold leading-6 text-[#101828]">
              <EditableText value="Subtotal" label="Subtotal header" showBadge={false} />
            </div>
          </div>
          {layout.lineItems.map((item, index) => (
            <Fragment key={index}>
              <div
                className={cn("flex", index !== 0 && "border-b border-[#d0d5dd]")}
              >
                <div className="flex flex-1 items-center px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                  <EditableText
                    value={item.description}
                    label={`Item ${index + 1} name`}
                    showBadge={false}
                    onCommit={(description) =>
                      updateLayout({
                        lineItems: layout.lineItems.map((line, lineIndex) =>
                          lineIndex === index ? { ...line, description } : line
                        ),
                      })
                    }
                  />
                </div>
                <div className="flex w-[110px] items-center px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                  {money(item.rate)}
                </div>
                <div className="flex w-[60px] items-center px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                  {item.qty}
                </div>
                <div className="flex w-[90px] items-center gap-1 px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                  <span>{taxPct}%</span>
                  <Info className="size-4 shrink-0 text-[#98a2b3]" aria-hidden />
                </div>
                <div className="flex w-[120px] items-center justify-end px-4 py-1 text-right text-[16px] font-medium leading-6 text-[#475467]">
                  {money(item.qty * item.rate)}
                </div>
              </div>
              {index === 0 ? (
                <div className="border-b border-[#d0d5dd] px-4 pb-1 pt-0.5">
                  <p className={hint}>
                    <EditableText
                      value="Sustainably sourced from Colombia and Ethiopia, these medium-roast beans offer rich notes of dark chocolate, caramel, and citrus. Perfect for any brewing method, they deliver a smooth, full-bodied cup every time."
                      label="Item 1 description"
                      showBadge={false}
                    />
                  </p>
                </div>
              ) : null}
            </Fragment>
          ))}
        </SelectableSection>
            ),
            totals: (
        // Totals
        <SelectableSection
          label="Totals"
          className="flex flex-col gap-1 py-2"
          move={moveProps("totals")}
        >
          <div className="flex w-full pl-[71px]">
            <span className={cn(totalLabel, "text-[#101828]")}>
              <EditableText value="Subtotal" label="Subtotal label" showBadge={false} />
            </span>
            <span className={totalAmount}>{money(subtotal)}</span>
          </div>
          <div className="flex w-full pl-[71px]">
            <span className={totalLabel} style={{ color: accent }}>
              <EditableText
                value={`Discount (${Math.round(discountRate * 100)}%)`}
                label="Discount label"
                showBadge={false}
              />
            </span>
            <span className={totalAmount}>{`-${money(discount)}`}</span>
          </div>
          <div className="flex w-full pl-[71px]">
            <span className={cn(totalLabel, "text-[#101828]")}>
              <EditableText
                value="Taxable subtotal"
                label="Taxable subtotal label"
                showBadge={false}
              />
            </span>
            <span className={totalAmount}>{money(taxableSubtotal)}</span>
          </div>
          <div className="flex w-full pl-[71px]">
            <span className={totalLabel} style={{ color: accent }}>
              <EditableText
                value={`Central tax (${Math.round(centralRate * 100)}% on ${money(taxableSubtotal)})`}
                label="Central tax label"
                showBadge={false}
              />
            </span>
            <span className={totalAmount}>{money(centralTax)}</span>
          </div>
          <div className="flex w-full pl-[71px]">
            <span className={totalLabel} style={{ color: accent }}>
              <EditableText
                value={`City tax (${Math.round(cityRate * 100)}% on ${money(taxableSubtotal)})`}
                label="City tax label"
                showBadge={false}
              />
            </span>
            <span className={totalAmount}>{money(cityTax)}</span>
          </div>
          <div className="flex w-full pl-[71px]">
            <span className={cn(totalLabel, "text-[#101828]")}>
              <EditableText value="Deposit (Check)" label="Deposit label" showBadge={false} />
            </span>
            <span className={totalAmount}>{`-${money(deposit)}`}</span>
          </div>

          <div className="my-1 h-px w-full bg-[#d0d5dd]" />

          <div className="flex flex-col gap-1">
            {[
              { label: "Payment 1 of 2", due: "Due Aug 15, 2024", key: "1" },
              { label: "Payment 2 of 2", due: "Due Sept 30, 2024", key: "2" },
            ].map((payment) => (
              <div key={payment.key} className="flex w-full items-center">
                <div className="flex w-[79px] items-center justify-start">
                  <span className="rounded-xl bg-[#fffaeb] px-2 text-[14px] font-medium leading-5 text-[#b54708]">
                    Pending
                  </span>
                </div>
                <div className="pl-1 pr-2">
                  <span
                    className="text-[16px] font-medium leading-6"
                    style={{ color: accent }}
                  >
                    <EditableText
                      value={payment.label}
                      label={`Payment ${payment.key} label`}
                      showBadge={false}
                    />
                  </span>
                </div>
                <div className="flex-1 px-3">
                  <span
                    className="text-[16px] font-medium leading-6"
                    style={{ color: accent }}
                  >
                    <EditableText
                      value={payment.due}
                      label={`Payment ${payment.key} due`}
                      showBadge={false}
                    />
                  </span>
                </div>
                <div className="px-4 text-right text-[16px] font-medium leading-6 text-[#475467]">
                  {money(paymentHalf)}
                </div>
              </div>
            ))}
          </div>

          <div className="my-1 h-px w-full bg-[#d0d5dd]" />

          <div className="flex w-full items-center justify-between pl-[71px]">
            <span className="w-[240px] px-3 text-[16px] font-medium leading-6 text-[#101828]">
              <EditableText
                value={`Amount due (in ${layout.currencyCode})`}
                label="Amount due label"
                showBadge={false}
              />
            </span>
            <span className="w-[120px] px-4 text-right text-[16px] font-medium leading-6 text-[#101828]">
              {money(amountDue)}
            </span>
          </div>
        </SelectableSection>
            ),
            notes: (
        // Notes
        <SelectableSection
          label="Notes"
          className="flex flex-col gap-1 p-4"
          move={moveProps("notes")}
        >
          <p className="text-[14px] font-medium leading-5 text-[#101828]">
            <EditableText value="Note to customer" label="Note label" showBadge={false} />
          </p>
          <p className="text-[14px] leading-5 text-[#475467]">
            <EditableText
              value={`Thank you for your business.${
                layout.emphasis ? ` Designed to emphasise ${layout.emphasis}.` : ""
              }`}
              label="Note body"
              showBadge={false}
            />
          </p>
        </SelectableSection>
            ),
            footer: (
        // Footer hint
        <SelectableSection
          label="Footer note"
          className="flex items-center p-4"
          move={moveProps("footer")}
        >
          <p className="text-[14px] leading-5 text-[#475467]">
            <EditableText
              value="Reverse charge (Article 197 - Directive 2006/112 EC)"
              label="Footer note text"
              showBadge={false}
            />
          </p>
        </SelectableSection>
            ),
          }
          return sectionOrder.map((unit) => (
            <Fragment key={unit}>{unitNodes[unit]}</Fragment>
          ))
        })()}
      </div>
    </PaginatedDocument>
  )
}

/**
 * Real, rendered document shown once generation completes. A fixed-width paper
 * card wrapped in `DocumentStage`, which scales it to fit the canvas on smaller
 * screens — same in full preview and split view (Figma 3189:58977).
 */
function DocumentSurface() {
  const {
    generatedLayout: layout,
    updateLayout,
    editMode,
    selections,
    selectLayer,
    isLayerEditing,
    layerStyles,
    mediumId,
  } = useLayoutBuilder()

  const [pendingDeleteItem, setPendingDeleteItem] = useState<number | null>(
    null
  )

  const pageProfile = getDocumentPageProfile(mediumId)
  const { padding: safePadding } = pageProfile

  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  )
  const discount = layout.sections.discount ? subtotal * layout.discountRate : 0
  const tax = layout.sections.taxes ? (subtotal - discount) * layout.taxRate : 0
  const total = subtotal - discount + tax
  const money = (value: number) => formatMoney(layout.currencySymbol, value)
  const isClassic = layout.style === "classic"

  // Line-item operations for the visual-edit selector. Each writes the full
  // array back through updateLayout so edits overlay the generated layout.
  const setItems = (items: GeneratedLineItem[]) =>
    updateLayout({ lineItems: items })
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= layout.lineItems.length) {
      return
    }
    const items = [...layout.lineItems]
    ;[items[index], items[target]] = [items[target], items[index]]
    setItems(items)
  }
  const duplicateItem = (index: number) => {
    const items = [...layout.lineItems]
    items.splice(index + 1, 0, { ...items[index] })
    setItems(items)
  }
  const deleteItem = (index: number) => {
    if (layout.lineItems.length <= 1) {
      return
    }
    setItems(layout.lineItems.filter((_, i) => i !== index))
  }
  const addItemBelow = (index: number) => {
    const items = [...layout.lineItems]
    items.splice(index + 1, 0, { description: "New item", qty: 1, rate: 0 })
    setItems(items)
  }

  // Order of the reorderable top-level body sections. The grip drag + move
  // up/down arrows on each section selector rewrite this list, and the body is
  // rendered in this order. Header is pinned and never enters the list.
  const [sectionOrder, setSectionOrder] = useState<SectionUnit[]>([
    ...DEFAULT_SECTION_ORDER,
  ])
  const moveUnit = (unit: SectionUnit, direction: -1 | 1) => {
    setSectionOrder((order) => {
      const index = order.indexOf(unit)
      const target = index + direction
      if (index < 0 || target < 0 || target >= order.length) {
        return order
      }
      const next = [...order]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const dropUnitBefore = (target: SectionUnit, dragged: string) => {
    if (!isSectionUnit(dragged) || dragged === target) {
      return
    }
    setSectionOrder((order) => {
      const next = order.filter((unit) => unit !== dragged)
      const targetIndex = next.indexOf(target)
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragged)
      return next
    })
  }
  const moveProps = (unit: SectionUnit): SectionMove => {
    const index = sectionOrder.indexOf(unit)
    return {
      unit,
      canUp: index > 0,
      canDown: index >= 0 && index < sectionOrder.length - 1,
      onUp: () => moveUnit(unit, -1),
      onDown: () => moveUnit(unit, 1),
      onDrop: (dragged) => dropUnitBefore(unit, dragged),
    }
  }

  const paperClassName = isClassic
    ? "font-serif"
    : "font-[family-name:var(--font-inter)]"

  return (
    <>
    <PaginatedDocument
      pageWidth={pageProfile.widthPx}
      pageHeight={pageProfile.heightPx}
      padTop={safePadding.top}
      padBottom={safePadding.bottom}
      paperClassName={paperClassName}
    >
      <div className="flex flex-col">
        <SelectableSection label="Header" className="ring-inset">
          <DocumentHeader layout={layout} safePadding={safePadding} />
        </SelectableSection>

        <div
          className="flex flex-1 flex-col gap-6 pt-8"
          style={{
            paddingLeft: safePadding.left,
            paddingRight: safePadding.right,
          }}
        >
        {(() => {
          const unitNodes: Record<SectionUnit, ReactNode> = {
            billing: (
              <Fragment key="billing">
        <SelectableSection
          label="Billing details"
          className="flex justify-between gap-6"
          move={moveProps("billing")}
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
              <EditableText value="Bill to" label="Bill to label" />
            </p>
            <p className="text-sm font-semibold text-[#101828]">
              <EditableText
                value={layout.clientName}
                label="Client name"
                onCommit={(clientName) => updateLayout({ clientName })}
              />
            </p>
            <p className="text-sm text-[#667085]">
              <EditableText value="456 Client Avenue" label="Client address line 1" />
            </p>
            <p className="text-sm text-[#667085]">
              <EditableText
                value="San Francisco, CA 94103"
                label="Client address line 2"
              />
            </p>
          </div>
          <div className="flex flex-col gap-1.5 text-right">
            <div className="flex justify-between gap-10">
              <span className="text-sm text-[#667085]">
                <EditableText value="Issued" label="Issued label" />
              </span>
              <span className="text-sm font-medium text-[#101828]">
                <EditableText
                  value={layout.issueDate}
                  label="Issue date"
                  onCommit={(issueDate) => updateLayout({ issueDate })}
                />
              </span>
            </div>
            <div className="flex justify-between gap-10">
              <span className="text-sm text-[#667085]">
                <EditableText value="Due" label="Due label" />
              </span>
              <span className="text-sm font-medium text-[#101828]">
                <EditableText
                  value={layout.dueDate}
                  label="Due date"
                  onCommit={(dueDate) => updateLayout({ dueDate })}
                />
              </span>
            </div>
            <div className="flex justify-between gap-10">
              <span className="text-sm text-[#667085]">
                <EditableText value="Currency" label="Currency label" />
              </span>
              <span className="text-sm font-medium text-[#101828]">
                <EditableText
                  value={layout.currencyCode}
                  label="Currency code"
                  onCommit={(currencyCode) => updateLayout({ currencyCode })}
                />
              </span>
            </div>
          </div>
        </SelectableSection>
        <ElementDropZone zone="after-billing" />
              </Fragment>
            ),
            items: (
              <Fragment key="items">
        {layout.sections.items ? (
          <div className="flex flex-col">
            <SelectableSection label="Table header" move={moveProps("items")}>
              <div
                className="flex items-center gap-4 border-b-2 py-2 text-xs font-semibold uppercase tracking-wide text-[#98a2b3]"
                style={{ borderColor: layout.accent }}
              >
                <span className="flex-1">
                  <EditableText value="Description" label="Description header" />
                </span>
                <span className="w-12 text-right">
                  <EditableText value="Qty" label="Qty header" />
                </span>
                <span className="w-24 text-right">
                  <EditableText value="Rate" label="Rate header" />
                </span>
                <span className="w-28 text-right">
                  <EditableText value="Amount" label="Amount header" />
                </span>
              </div>
            </SelectableSection>
            {layout.lineItems.map((item, index) => {
              const itemLabel = `Item ${index + 1}`
              // Layer style edits (padding, colours, border, radius…) for this row
              // are kept block-level so they don't collapse the flex row layout.
              const itemStyle = styleFromLayer(layerStyles[itemLabel], false)
              const row = (
                <div className="flex items-center gap-4 border-b border-[#eaecf0] py-3 text-sm text-[#101828]">
                  <span className="flex-1">
                    <EditableText
                      value={item.description}
                      label={`${itemLabel} description`}
                      showBadge={false}
                      onCommit={(description) =>
                        updateLayout({
                          lineItems: layout.lineItems.map((line, lineIndex) =>
                            lineIndex === index
                              ? { ...line, description }
                              : line
                          ),
                        })
                      }
                    />
                  </span>
                  <span className="w-12 text-right text-[#667085]">
                    {item.qty}
                  </span>
                  <span className="w-24 text-right text-[#667085]">
                    {money(item.rate)}
                  </span>
                  <span className="w-28 text-right font-medium">
                    {money(item.qty * item.rate)}
                  </span>
                </div>
              )

              if (!editMode) {
                return (
                  <div key={index} style={itemStyle}>
                    {row}
                  </div>
                )
              }

              return (
                <VisualEditSelector
                  key={index}
                  label={itemLabel}
                  selected={selections.some(
                    (selection) => selection.label === itemLabel
                  )}
                  working={isLayerEditing(itemLabel)}
                  onSelect={() => selectLayer(itemLabel)}
                  style={itemStyle}
                  showAddElement={false}
                  leftActions={[
                    {
                      icon: <ArrowUp />,
                      label: "Move up",
                      onClick: () => moveItem(index, -1),
                      disabled: index === 0,
                    },
                    {
                      icon: <ArrowDown />,
                      label: "Move down",
                      onClick: () => moveItem(index, 1),
                      disabled: index === layout.lineItems.length - 1,
                    },
                    {
                      icon: <Plus />,
                      label: "Add item below",
                      onClick: () => addItemBelow(index),
                    },
                  ]}
                  rightActions={[
                    {
                      icon: <Copy />,
                      label: "Duplicate item",
                      onClick: () => duplicateItem(index),
                    },
                    {
                      icon: <Trash2 />,
                      label: "Delete item",
                      onClick: () => setPendingDeleteItem(index),
                      disabled: layout.lineItems.length <= 1,
                    },
                  ]}
                >
                  {row}
                </VisualEditSelector>
              )
            })}
          </div>
        ) : null}
        <ElementDropZone zone="after-items" />
              </Fragment>
            ),
            totals: (
              <Fragment key="totals">
        <SelectableSection
          label="Totals"
          className="flex justify-end"
          move={moveProps("totals")}
        >
          <div className="flex w-60 flex-col gap-2">
            <div className="flex justify-between text-sm text-[#667085]">
              <span>
                <EditableText value="Subtotal" label="Subtotal label" />
              </span>
              <span className="text-[#101828]">{money(subtotal)}</span>
            </div>
            {layout.sections.discount ? (
              <div className="flex justify-between text-sm text-[#667085]">
                <span>Discount ({Math.round(layout.discountRate * 100)}%)</span>
                <span className="text-[#101828]">-{money(discount)}</span>
              </div>
            ) : null}
            {layout.sections.taxes ? (
              <div className="flex justify-between text-sm text-[#667085]">
                <span>Tax ({Math.round(layout.taxRate * 100)}%)</span>
                <span className="text-[#101828]">{money(tax)}</span>
              </div>
            ) : null}
            <div className="mt-1 flex items-baseline justify-between border-t border-[#eaecf0] pt-2">
              <span className="text-sm font-semibold text-[#101828]">
                <EditableText value="Total" label="Total label" />
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: layout.accent }}
              >
                {money(total)}
              </span>
            </div>
          </div>
        </SelectableSection>

        {layout.sections.onlinePayment ? (
          <SelectableSection label="Pay online" className="flex justify-end">
            <div
              className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: layout.accent }}
            >
              <EditableText value="Pay online" label="Pay online button" />
            </div>
          </SelectableSection>
        ) : null}

        <ElementDropZone zone="after-totals" />
              </Fragment>
            ),
            notes: (
              <Fragment key="notes">
        {layout.sections.notes ||
        layout.sections.terms ||
        layout.sections.paymentDetails ? (
          <SelectableSection
            label="Notes & terms"
            className="mt-auto flex flex-col gap-4 border-t border-[#eaecf0] pt-6"
            move={moveProps("notes")}
          >
            {layout.sections.notes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                  <EditableText value="Notes" label="Notes heading" />
                </p>
                <p className="mt-1 text-sm text-[#667085]">
                  <EditableText
                    value={`Thank you for your business.${
                      layout.emphasis
                        ? ` Designed to emphasise ${layout.emphasis}.`
                        : ""
                    }`}
                    label="Notes body"
                  />
                </p>
              </div>
            ) : null}
            {layout.sections.terms ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                  <EditableText value="Payment terms" label="Payment terms heading" />
                </p>
                <p className="mt-1 text-sm text-[#667085]">
                  <EditableText
                    value="Payment due within 14 days. Late payments may incur a 1.5% monthly fee."
                    label="Payment terms body"
                  />
                </p>
              </div>
            ) : null}
            {layout.sections.paymentDetails ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                  <EditableText
                    value="Payment details"
                    label="Payment details heading"
                  />
                </p>
                <div className="mt-1 flex flex-col gap-0.5 text-sm text-[#667085]">
                  <EditableText
                    value={`Bank: ${layout.businessName} · Acct 0042 1188`}
                    label="Payment details account"
                  />
                  <EditableText
                    value="Routing 110000000 · SWIFT NWBKUS33"
                    label="Payment details routing"
                  />
                </div>
              </div>
            ) : null}
          </SelectableSection>
        ) : null}

        <ElementDropZone zone="after-notes" />
              </Fragment>
            ),
          }
          return sectionOrder.map((unit) => unitNodes[unit])
        })()}
        <ElementDropZone zone="end" />
        </div>
      </div>
    </PaginatedDocument>

    <ConfirmationDialog
      open={pendingDeleteItem !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPendingDeleteItem(null)
        }
      }}
      title="Delete item"
      description="Are you sure you want to delete this item? You can undo this action from the toolbar"
      confirmLabel={DELETE_CONFIRMATION_LABEL}
      cancelLabel={DELETE_CANCEL_LABEL}
      variant="destructive"
      onConfirm={() => {
        if (pendingDeleteItem !== null) {
          deleteItem(pendingDeleteItem)
        }
        setPendingDeleteItem(null)
      }}
      onCancel={() => setPendingDeleteItem(null)}
    />
    </>
  )
}

/**
 * Generated source for the document, plus a map of each selectable layer label
 * to the line range it occupies. The labels and `data-el` markers mirror the
 * preview's `EditableText` / `SelectableSection` labels so a selection in the
 * preview maps 1:1 to a highlighted (and scrolled-to) region in the editor.
 */
type CodeBuild = { code: string; ranges: Record<string, [number, number]> }

function buildCode(
  layout: GeneratedLayout,
  overrides: Record<string, string> = {}
): CodeBuild {
  const lines: string[] = []
  const ranges: Record<string, [number, number]> = {}
  const sym = layout.currencySymbol
  const money = (value: number) => `${sym}${value.toFixed(2)}`
  // Edited text wins (same precedence as the preview's EditableText), so the
  // code and the rendered document always show the same content.
  const ov = (label: string, fallback: string) => overrides[label] ?? fallback
  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  )
  const discount = layout.sections.discount ? subtotal * layout.discountRate : 0
  const tax = layout.sections.taxes ? (subtotal - discount) * layout.taxRate : 0
  const total = subtotal - discount + tax

  const add = (text: string) => {
    lines.push(text)
  }
  // Records the range for one or more labels that live on a single line.
  const tag = (labels: string | string[], text: string) => {
    const index = lines.length
    lines.push(text)
    for (const label of Array.isArray(labels) ? labels : [labels]) {
      ranges[label] = [index, index]
    }
  }
  // Records the range for a multi-line block (the section labels).
  const block = (label: string, fn: () => void) => {
    const start = lines.length
    fn()
    ranges[label] = [start, lines.length - 1]
  }

  add(`<!doctype html>`)
  add(`<html lang="en">`)
  add(`  <head>`)
  add(`    <meta charset="utf-8" />`)
  add(`    <title>${layout.documentType} · ${layout.businessName}</title>`)
  add(`    <style>`)
  add(`      :root { --accent: ${layout.accent}; }`)
  add(
    `      body { font-family: ${
      layout.style === "classic" ? "Georgia, serif" : "Inter, sans-serif"
    }; color: #101828; margin: 0; }`
  )
  add(`      .muted { color: #667085; }`)
  add(`      .doc-title { color: var(--accent); font-size: 24px; font-weight: 600; }`)
  add(`      table { width: 100%; border-collapse: collapse; }`)
  add(`      th { border-bottom: 2px solid var(--accent); text-align: left; }`)
  add(`      td, th { padding: 8px 0; }`)
  add(`      .num { text-align: right; }`)
  add(`      .total { color: var(--accent); font-weight: 700; }`)
  add(`      .pay-online { display: inline-block; background: var(--accent); color: #fff; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none; }`)
  add(`    </style>`)
  add(`  </head>`)
  add(`  <body>`)

  add(`    <!-- Header -->`)
  block("Header", () => {
    add(`    <header data-el="Header">`)
    tag(
      "Business name",
      `      <h1 data-el="Business name">${ov("Business name", layout.businessName)}</h1>`
    )
    tag(
      "Business address",
      `      <p class="muted" data-el="Business address">${ov(
        "Business address",
        "123 Market Street · Suite 400"
      )}</p>`
    )
    tag(
      "Document type",
      `      <p class="doc-title" data-el="Document type">${ov(
        "Document type",
        layout.documentType
      )}</p>`
    )
    tag(
      "Document number",
      `      <p class="muted" data-el="Document number">${ov(
        "Document number",
        layout.documentNumber
      )}</p>`
    )
    add(`    </header>`)
  })

  add(`    <!-- Billing details -->`)
  block("Billing details", () => {
    add(`    <section data-el="Billing details">`)
    tag(
      "Bill to label",
      `      <p class="muted" data-el="Bill to label">${ov("Bill to label", "Bill to")}</p>`
    )
    tag(
      "Client name",
      `      <p data-el="Client name">${ov("Client name", layout.clientName)}</p>`
    )
    tag(
      "Client address line 1",
      `      <p class="muted" data-el="Client address line 1">${ov(
        "Client address line 1",
        "456 Client Avenue"
      )}</p>`
    )
    tag(
      "Client address line 2",
      `      <p class="muted" data-el="Client address line 2">${ov(
        "Client address line 2",
        "San Francisco, CA 94103"
      )}</p>`
    )
    tag(
      ["Issued label", "Issue date"],
      `      <p><span data-el="Issued label">${ov(
        "Issued label",
        "Issued"
      )}</span> <span data-el="Issue date">${ov("Issue date", layout.issueDate)}</span></p>`
    )
    tag(
      ["Due label", "Due date"],
      `      <p><span data-el="Due label">${ov(
        "Due label",
        "Due"
      )}</span> <span data-el="Due date">${ov("Due date", layout.dueDate)}</span></p>`
    )
    tag(
      ["Currency label", "Currency code"],
      `      <p><span data-el="Currency label">${ov(
        "Currency label",
        "Currency"
      )}</span> <span data-el="Currency code">${ov(
        "Currency code",
        layout.currencyCode
      )}</span></p>`
    )
    add(`    </section>`)
  })

  if (layout.sections.items) {
    add(`    <!-- Line items -->`)
    add(`    <table>`)
    block("Table header", () => {
      add(`      <thead data-el="Table header">`)
      add(`        <tr>`)
      tag(
        "Description header",
        `          <th>${ov("Description header", "Description")}</th>`
      )
      tag("Qty header", `          <th class="num">${ov("Qty header", "Qty")}</th>`)
      tag("Rate header", `          <th class="num">${ov("Rate header", "Rate")}</th>`)
      tag(
        "Amount header",
        `          <th class="num">${ov("Amount header", "Amount")}</th>`
      )
      add(`        </tr>`)
      add(`      </thead>`)
    })
    add(`      <tbody>`)
    layout.lineItems.forEach((item, index) => {
      const label = `Item ${index + 1}`
      block(label, () => {
        add(`        <tr data-el="${label}">`)
        tag(
          `${label} description`,
          `          <td data-el="${label} description">${ov(
            `${label} description`,
            item.description
          )}</td>`
        )
        add(`          <td class="num">${item.qty}</td>`)
        add(`          <td class="num">${money(item.rate)}</td>`)
        add(`          <td class="num">${money(item.qty * item.rate)}</td>`)
        add(`        </tr>`)
      })
    })
    add(`      </tbody>`)
    add(`    </table>`)
  }

  add(`    <!-- Totals -->`)
  block("Totals", () => {
    add(`    <section data-el="Totals">`)
    tag(
      "Subtotal label",
      `      <p><span data-el="Subtotal label">${ov(
        "Subtotal label",
        "Subtotal"
      )}</span> <span class="num">${money(subtotal)}</span></p>`
    )
    if (layout.sections.discount) {
      add(`      <p>Discount (${Math.round(layout.discountRate * 100)}%) <span class="num">-${money(discount)}</span></p>`)
    }
    if (layout.sections.taxes) {
      add(`      <p>Tax (${Math.round(layout.taxRate * 100)}%) <span class="num">${money(tax)}</span></p>`)
    }
    tag(
      "Total label",
      `      <p class="total"><span data-el="Total label">${ov(
        "Total label",
        "Total"
      )}</span> <span class="num">${money(total)}</span></p>`
    )
    add(`    </section>`)
  })

  if (layout.sections.onlinePayment) {
    add(`    <!-- Pay online -->`)
    block("Pay online", () => {
      tag(
        "Pay online button",
        `    <a class="pay-online" href="#" data-el="Pay online button">${ov(
          "Pay online button",
          "Pay online"
        )}</a>`
      )
    })
  }

  if (
    layout.sections.notes ||
    layout.sections.terms ||
    layout.sections.paymentDetails
  ) {
    add(`    <!-- Notes & terms -->`)
    block("Notes & terms", () => {
      add(`    <section data-el="Notes &amp; terms">`)
      if (layout.sections.notes) {
        tag(
          "Notes heading",
          `      <h3 data-el="Notes heading">${ov("Notes heading", "Notes")}</h3>`
        )
        tag(
          "Notes body",
          `      <p class="muted" data-el="Notes body">${ov(
            "Notes body",
            `Thank you for your business.${
              layout.emphasis ? ` Designed to emphasise ${layout.emphasis}.` : ""
            }`
          )}</p>`
        )
      }
      if (layout.sections.terms) {
        tag(
          "Payment terms heading",
          `      <h3 data-el="Payment terms heading">${ov(
            "Payment terms heading",
            "Payment terms"
          )}</h3>`
        )
        tag(
          "Payment terms body",
          `      <p class="muted" data-el="Payment terms body">${ov(
            "Payment terms body",
            "Payment due within 14 days. Late payments may incur a 1.5% monthly fee."
          )}</p>`
        )
      }
      if (layout.sections.paymentDetails) {
        tag(
          "Payment details heading",
          `      <h3 data-el="Payment details heading">${ov(
            "Payment details heading",
            "Payment details"
          )}</h3>`
        )
        tag(
          "Payment details account",
          `      <p class="muted" data-el="Payment details account">${ov(
            "Payment details account",
            `Bank: ${layout.businessName} · Acct 0042 1188`
          )}</p>`
        )
        tag(
          "Payment details routing",
          `      <p class="muted" data-el="Payment details routing">${ov(
            "Payment details routing",
            "Routing 110000000 · SWIFT NWBKUS33"
          )}</p>`
        )
      }
      add(`    </section>`)
    })
  }

  add(`  </body>`)
  add(`</html>`)

  return { code: lines.join("\n"), ranges }
}

// Syntax palette from Figma (Email Marketing · Code snippet, 299:76555).
const CODE_COLORS = {
  comment: "#79716b",
  text: "#f9fafb",
  tag: "#84adff",
  attr: "#faa7e0",
  value: "#6ce9a6",
  cssProp: "#6ce9a6",
  number: "#faa7e0",
  selector: "#faa7e0",
  punct: "#f9fafb",
} as const

type CodeToken = { text: string; color: string }

function tokenizeTag(tag: string, push: (text: string, color: string) => void) {
  let i = 0
  let lead = "<"
  i = 1
  if (tag[i] === "/") {
    lead += "/"
    i += 1
  }
  push(lead, CODE_COLORS.punct)

  const nameMatch = tag.slice(i).match(/^!?[a-zA-Z][\w-]*/)
  if (nameMatch) {
    push(nameMatch[0], CODE_COLORS.tag)
    i += nameMatch[0].length
  }

  while (i < tag.length) {
    const ch = tag[i]
    if (ch === ">" || ch === "/" || ch === "=") {
      push(ch, CODE_COLORS.punct)
      i += 1
      continue
    }
    if (/\s/.test(ch)) {
      let k = i
      while (k < tag.length && /\s/.test(tag[k])) k += 1
      push(tag.slice(i, k), CODE_COLORS.text)
      i = k
      continue
    }
    if (ch === '"' || ch === "'") {
      let k = i + 1
      while (k < tag.length && tag[k] !== ch) k += 1
      k = k < tag.length ? k + 1 : k
      push(tag.slice(i, k), CODE_COLORS.value)
      i = k
      continue
    }
    let k = i
    while (k < tag.length && !/[\s=>/"']/.test(tag[k])) k += 1
    push(tag.slice(i, k), CODE_COLORS.attr)
    i = k
  }
}

function tokenizeCss(css: string, push: (text: string, color: string) => void) {
  let i = 0
  let inBlock = false
  let afterColon = false

  while (i < css.length) {
    const ch = css[i]
    if (/\s/.test(ch)) {
      let k = i
      while (k < css.length && /\s/.test(css[k])) k += 1
      push(css.slice(i, k), CODE_COLORS.text)
      i = k
      continue
    }
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i)
      const stop = end === -1 ? css.length : end + 2
      push(css.slice(i, stop), CODE_COLORS.comment)
      i = stop
      continue
    }
    if (ch === "{") {
      inBlock = true
      afterColon = false
      push(ch, CODE_COLORS.punct)
      i += 1
      continue
    }
    if (ch === "}") {
      inBlock = false
      afterColon = false
      push(ch, CODE_COLORS.punct)
      i += 1
      continue
    }
    if (ch === ";") {
      afterColon = false
      push(ch, CODE_COLORS.punct)
      i += 1
      continue
    }
    if (ch === ":") {
      if (inBlock) afterColon = true
      push(ch, CODE_COLORS.punct)
      i += 1
      continue
    }
    let k = i
    while (k < css.length && !/[\s{};:]/.test(css[k])) k += 1
    const word = css.slice(i, k)
    if (!inBlock) {
      push(word, /^[.#]/.test(word) ? CODE_COLORS.selector : CODE_COLORS.text)
    } else if (!afterColon) {
      push(word, CODE_COLORS.cssProp)
    } else {
      push(word, /^#?-?\d/.test(word) ? CODE_COLORS.number : CODE_COLORS.text)
    }
    i = k
  }
}

/** Tokenizes generated HTML into per-line colored spans for the code editor. */
function highlightHtml(code: string): CodeToken[][] {
  const tokens: CodeToken[] = []
  const push = (text: string, color: string) => {
    if (text) tokens.push({ text, color })
  }

  let i = 0
  const n = code.length
  while (i < n) {
    if (code.startsWith("<!--", i)) {
      const end = code.indexOf("-->", i)
      const stop = end === -1 ? n : end + 3
      push(code.slice(i, stop), CODE_COLORS.comment)
      i = stop
      continue
    }
    if (code[i] === "<") {
      const end = code.indexOf(">", i)
      const stop = end === -1 ? n : end + 1
      const tag = code.slice(i, stop)
      tokenizeTag(tag, push)
      i = stop

      const nameMatch = tag.match(/^<\s*([a-zA-Z][\w-]*)/)
      const isClosing = /^<\s*\//.test(tag)
      if (
        nameMatch &&
        nameMatch[1].toLowerCase() === "style" &&
        !isClosing &&
        !tag.endsWith("/>")
      ) {
        const cssEnd = code.indexOf("</style>", i)
        const cssStop = cssEnd === -1 ? n : cssEnd
        tokenizeCss(code.slice(i, cssStop), push)
        i = cssStop
      }
      continue
    }
    const next = code.indexOf("<", i)
    const stop = next === -1 ? n : next
    push(code.slice(i, stop), CODE_COLORS.text)
    i = stop
  }

  const lines: CodeToken[][] = [[]]
  for (const token of tokens) {
    const parts = token.text.split("\n")
    parts.forEach((part, index) => {
      if (index > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ text: part, color: token.color })
    })
  }
  return lines
}

// Left offset of the code text: gutter width (w-16 = 64px) + code padding (16px).
// The editable textarea overlay must start at the same x to align with the
// highlighted layer beneath it.
const CODE_TEXT_INDENT = 80

/**
 * Header strip above the code editor. To match the reference (Email Marketing
 * 299:76555), the editor is bare in its default attached state — editing a line
 * auto-detaches, so no explicit "eject" affordance is needed. The bar only
 * surfaces once detached, carrying the detached status and a two-step revert
 * (guards against discarding raw edits on a stray click).
 */
function CodeEditorBar() {
  const { isCodeDetached, reattachCode } = useLayoutBuilder()
  const [confirmingRevert, setConfirmingRevert] = useState(false)

  // Collapse the revert confirmation if the user navigates away from it.
  useEffect(() => {
    if (!isCodeDetached && confirmingRevert) {
      setConfirmingRevert(false)
    }
  }, [isCodeDetached, confirmingRevert])

  // Attached state mirrors the reference: a clean editor with no chrome.
  if (!isCodeDetached) {
    return null
  }

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#292524] bg-[#1c1917] pr-2 pl-4">
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-[#d0d5dd]">
        <Code2 className="size-3.5 text-[#98a2b3]" aria-hidden />
        Editing code directly
      </span>

      <span className="rounded-full bg-[#3a2d75] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d9d6fe]">
        Detached
      </span>

      <div className="min-w-px flex-1" />

      {confirmingRevert ? (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#fda29b]">Discard code edits?</span>
          <button
            type="button"
            onClick={reattachCode}
            className="inline-flex h-6 items-center rounded-[4px] bg-[#b42318] px-2 text-[11px] font-semibold text-white outline-none transition-colors hover:bg-[#912018] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            Revert
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRevert(false)}
            className="inline-flex h-6 items-center rounded-[4px] px-2 text-[11px] font-medium text-[#d0d5dd] outline-none transition-colors hover:bg-[#292524] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            Keep editing
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingRevert(true)}
          className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-[#3f3a36] px-2 text-[11px] font-medium text-[#d0d5dd] outline-none transition-colors hover:bg-[#292524] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <RotateCcw className="size-3" aria-hidden />
          Revert to layout
        </button>
      )}
    </div>
  )
}

/**
 * Renders the raw-code buffer in a sandboxed iframe (detached mode). Auto-sizes
 * to its content height so the surrounding preview pane owns the scroll, mirroring
 * how the structured `DocumentSurface` grows with content.
 */
function CodePreviewFrame({ html }: { html: string }) {
  const { mediumId } = useLayoutBuilder()
  const pageWidth = getDocumentPageProfile(mediumId).widthPx || DOCUMENT_WIDTH
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(0)

  // Each srcDoc change reloads the iframe, so coalesce rapid keystrokes into a
  // single update — the preview stays responsive without flickering on every key.
  const [doc, setDoc] = useState(html)
  useEffect(() => {
    const id = window.setTimeout(() => setDoc(html), 200)
    return () => window.clearTimeout(id)
  }, [html])

  const syncHeight = useCallback(() => {
    const frameDoc = frameRef.current?.contentDocument
    if (frameDoc?.body) {
      setHeight(
        frameDoc.documentElement.scrollHeight || frameDoc.body.scrollHeight
      )
    }
  }, [])

  return (
    <div
      className="mx-auto flex w-full flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]"
      style={{ maxWidth: pageWidth }}
    >
      <iframe
        ref={frameRef}
        title="Invoice code preview"
        srcDoc={doc}
        onLoad={syncHeight}
        // allow-same-origin (without allow-scripts) lets us measure content
        // height for auto-sizing while still blocking any script the user pastes.
        sandbox="allow-same-origin"
        className="w-full border-0"
        style={{ height: height ? `${height}px` : "60vh" }}
      />
    </div>
  )
}

/**
 * Editable source view of the generated document, shown alongside the preview
 * when the Code editor is open. Mirrors the Email Marketing code snippet (Figma
 * 299:76555): warm-gray gutter, dark editor surface, and syntax highlighting.
 *
 * Behaves like a real editor: until the first edit it shows the generated code
 * (a live projection of the structured model). Editing — or the bar's "Edit code
 * directly" — takes the code live as the source of truth, so anything typed
 * (including new structure like extra line-item rows) renders verbatim in the
 * preview. "Revert to layout" restores the structured + AI model.
 */
function LayoutCodeEditor() {
  const {
    generatedLayout: layout,
    selections,
    layerText,
    codeOverride,
    isCodeDetached,
    detachCode,
    updateCodeOverride,
  } = useLayoutBuilder()
  const { code, ranges } = useMemo(
    () => buildCode(layout, layerText),
    [layout, layerText]
  )

  // Before any edit the editor shows the generated `code` (a live projection of
  // the structured model). The first edit makes the code the source of truth:
  // the buffer is taken over verbatim and the preview renders exactly what's
  // typed — so structural changes (e.g. pasting another line-item row) appear,
  // like a real code editor. The structured model is restorable via the bar's
  // "Revert to layout".
  const displayText = isCodeDetached ? codeOverride ?? "" : code
  const lines = useMemo(() => highlightHtml(displayText), [displayText])

  // Single active selection mirrors into the editor. The selected layer's lines
  // get a highlighted state and the first line is scrolled into view — both on
  // selection change and when the editor first opens with a layer selected.
  // Detached raw code has no structured ranges to map, so highlighting is off.
  const activeLabel = isCodeDetached ? null : selections[0]?.label ?? null
  const range = activeLabel ? ranges[activeLabel] : undefined
  const start = range?.[0] ?? -1
  const end = range?.[1] ?? -1

  const activeLineRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (start >= 0) {
      activeLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    }
  }, [start, end])

  return (
    <div className="relative min-h-full w-max min-w-full font-mono text-[13px] leading-5">
      <div className="py-4">
        {lines.map((line, index) => {
          const active = index >= start && index <= end
          return (
            <div
              key={index}
              ref={index === start ? activeLineRef : undefined}
              className={cn("flex", active && "bg-[#6938ef]/15")}
            >
              <span
                className={cn(
                  "sticky left-0 w-16 shrink-0 select-none px-4 text-right tabular-nums",
                  // Gutter blends into the editor surface (Email Marketing
                  // 299:76555) — dim numbers on the same dark background.
                  active ? "bg-[#3a2d75] text-white" : "bg-[#1c1917] text-[#79716b]"
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "flex-1 whitespace-pre px-4 text-[#f9fafb]",
                  active && "shadow-[inset_2px_0_0_0_#6938ef]"
                )}
              >
                {line.length === 0
                  ? "\u00A0"
                  : line.map((token, tokenIndex) => (
                      <span key={tokenIndex} style={{ color: token.color }}>
                        {token.text}
                      </span>
                    ))}
              </span>
            </div>
          )
        })}
      </div>
      <textarea
        value={displayText}
        onChange={(event) => {
          if (isCodeDetached) {
            updateCodeOverride(event.target.value)
            return
          }
          // First edit: take the code live as the source of truth.
          detachCode(event.target.value)
        }}
        spellCheck={false}
        wrap="off"
        aria-label="Edit invoice code"
        style={{ paddingLeft: CODE_TEXT_INDENT }}
        className="absolute inset-0 resize-none overflow-hidden whitespace-pre border-0 bg-transparent py-4 pr-4 font-mono text-[13px] leading-5 text-transparent caret-white outline-none [tab-size:2] selection:bg-[#6938ef]/40"
      />
    </div>
  )
}

// Split view: code editor on the left, invoice preview filling the right
// (Figma 3189:58977 / Email Marketing 299:76555). The code pane honors the drag
// fraction (50% by default) so it fills its share of wide viewports rather than
// being pinned to a fixed width; these guards just keep both panes usable.
const MIN_CODE_PX = 280
const MIN_PREVIEW_PX = 320
const SPLIT_KEYBOARD_STEP = 0.04

/**
 * Canvas empty state for a blank start (Figma 3268:37410 / 3268:38357). Two
 * paths out: insert elements manually (opens the Add elements palette) or hand
 * off to Invoice AI (focuses the welcome prompt input).
 */
function CanvasBlankEmptyState({
  onInsertElements,
  onGenerate,
}: {
  onInsertElements: () => void
  onGenerate: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-[#f9fafb] p-6">
      <div className="flex w-[440px] max-w-full flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-[family-name:var(--font-inter)] text-lg font-semibold leading-7 text-[#101828]">
            Start creating your invoice layout
          </p>
          <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
            Add elements manually or let AI build your page — your creative
            journey starts here!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onInsertElements}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#d0d5dd] bg-white px-4 py-2.5 outline-none transition-colors",
              "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#344054]",
              "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            )}
          >
            <Plus className="size-5 shrink-0" strokeWidth={2} aria-hidden />
            Insert elements
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#6938ef] bg-[#6938ef] px-4 py-2.5 outline-none transition-colors",
              "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-white",
              "shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:border-[#5925dc] hover:bg-[#5925dc] focus-visible:ring-2 focus-visible:ring-[#6938ef]/40"
            )}
          >
            <AutoAwesomeIcon className="size-5 shrink-0" />
            Generate with AI
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Thick blue insertion line shown at the active drop position on the blank page
 * (matches the funnel-builder drop affordance). End caps + a 3px bar read as a
 * clear "your element lands here" cue. Collapses to nothing when inactive.
 */
function DropIndicator({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "flex w-full items-center transition-opacity duration-150",
        active ? "opacity-100" : "h-0 opacity-0"
      )}
      aria-hidden
    >
      <span className="size-2 shrink-0 rounded-full bg-[#2970ff]" />
      <span className="h-[3px] flex-1 rounded-full bg-[#2970ff]" />
      <span className="size-2 shrink-0 rounded-full bg-[#2970ff]" />
    </div>
  )
}

/**
 * Drop target on the blank build-from-scratch page. `seam` is the thin gap
 * between placed blocks; `fill` is the tall empty-page target shown before the
 * first element exists. Both insert at `index` so a drop lands exactly where
 * the blue line previews.
 */
function BlankDropZone({
  index,
  variant = "seam",
}: {
  index: number
  variant?: "seam" | "fill" | "tail"
}) {
  const { addPlacedElement } = useLayoutBuilder()
  const [over, setOver] = useState(false)

  const accept = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(ELEMENT_DRAG_MIME)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    setOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) {
      return
    }
    setOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    // Stop the canvas-level handler from treating this as a miss/revert.
    event.stopPropagation()
    setOver(false)
    const payload = parseElementDrag(event.dataTransfer)
    if (!payload) {
      return
    }
    addPlacedElement({
      kind: payload.kind,
      label: payload.label,
      zone: "end",
      index,
    })
  }

  if (variant === "fill") {
    return (
      <div
        onDragOver={accept}
        onDragEnter={accept}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed p-8 text-center transition-colors",
          over ? "border-[#2970ff] bg-[#eff8ff]" : "border-[#d0d5dd] bg-transparent"
        )}
      >
        <DropIndicator active={over} />
        <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
          Drop elements here to start building
        </p>
        <p className="font-[family-name:var(--font-inter)] text-xs leading-[18px] text-[#98a2b3]">
          Drag any element from the Add elements panel onto the page
        </p>
      </div>
    )
  }

  // The trailing zone grows to fill the rest of the sheet so a drop anywhere in
  // the empty space below the last block appends to the end.
  if (variant === "tail") {
    return (
      <div
        onDragOver={accept}
        onDragEnter={accept}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex min-h-[56px] flex-1 flex-col pt-1.5"
        aria-hidden
      >
        <DropIndicator active={over} />
      </div>
    )
  }

  return (
    <div
      onDragOver={accept}
      onDragEnter={accept}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative -my-1.5 flex h-3 items-center"
      aria-hidden
    >
      <DropIndicator active={over} />
    </div>
  )
}

/** A placed block on the blank page: inline-editable, with a hover remove control. */
function BlankPlacedElement({ element }: { element: PlacedElement }) {
  const {
    inspectingLayer,
    inspectLayer,
    seedLayer,
    isLayerEditing,
    layerText,
    layerStyles,
    updatePlacedElementContent,
    duplicatePlacedElement,
    removePlacedElement,
  } = useLayoutBuilder()
  const [pendingRemove, setPendingRemove] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)

  // Inspector / inline edits win for display, mirroring the AI-flow layers so a
  // dropped element behaves identically once it lands on the page.
  const label = element.label
  const displayContent = layerText[label] ?? element.content
  // Selected ring tracks the open Visual edits inspector — we deliberately don't
  // push a composer selection chip here (keeps the AiComposer unchanged).
  const isSelected = inspectingLayer === label
  const appliedStyle = styleFromLayer(layerStyles[label])

  // Capture the element's live content + computed typography on first inspect so
  // the Visual edits panel opens pre-filled, exactly like the AI-flow layers.
  const openInspector = () => {
    const node = nodeRef.current
    if (node) {
      const cs = window.getComputedStyle(node)
      const align = ["left", "center", "right", "justify"].includes(cs.textAlign)
        ? (cs.textAlign as BuilderLayerStyle["textAlign"])
        : "left"
      seedLayer(label, {
        content: displayContent,
        style: {
          fontFamily: cs.fontFamily,
          fontSize: Math.round(parseFloat(cs.fontSize)) || undefined,
          fontStyle: cs.fontStyle === "italic" ? "italic" : "normal",
          fontWeight: Number(cs.fontWeight) || undefined,
          textAlign: align,
          color: cs.color,
        },
      })
    }
    inspectLayer(label, isTextPlacedKind(element.kind) ? "text" : "container")
  }

  return (
    <>
      <VisualEditSelector
        label={label}
        selected={isSelected}
        working={isLayerEditing(label)}
        onSelect={openInspector}
        rightActions={[
          {
            icon: <Copy />,
            label: `Duplicate ${label}`,
            onClick: () => duplicatePlacedElement(element.id),
          },
          {
            icon: <Trash2 />,
            label: `Delete ${label}`,
            onClick: () => setPendingRemove(true),
          },
        ]}
        className="block"
      >
        <div ref={nodeRef} style={appliedStyle}>
          <PlacedElementView
            element={
              displayContent === element.content
                ? element
                : { ...element, content: displayContent }
            }
            editMode
            onContentChange={(content) =>
              updatePlacedElementContent(element.id, content)
            }
          />
        </div>
      </VisualEditSelector>
      <ConfirmationDialog
        open={pendingRemove}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemove(false)
          }
        }}
        title="Delete element"
        description={getDeleteConfirmationDescription(element.label)}
        confirmLabel={DELETE_CONFIRMATION_LABEL}
        cancelLabel={DELETE_CANCEL_LABEL}
        variant="destructive"
        onConfirm={() => {
          removePlacedElement(element.id)
          setPendingRemove(false)
        }}
        onCancel={() => setPendingRemove(false)}
      />
    </>
  )
}

/**
 * The blank build-from-scratch page: a white invoice-sized sheet that only ever
 * holds the elements the user drops (no invoice scaffold). Drop seams between
 * blocks let new elements be inserted at any position.
 */
function BlankPage() {
  const { placedElements, mediumId } = useLayoutBuilder()
  const profile = getDocumentPageProfile(mediumId)
  const { padding } = profile

  return (
    <DocumentStage>
      <div
        className={cn(DOCUMENT_PAPER_SHELL, "font-[family-name:var(--font-inter)]")}
        style={{ minHeight: profile.heightPx }}
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{
            minHeight: profile.heightPx,
            paddingTop: padding.top,
            paddingBottom: padding.bottom,
            paddingLeft: padding.left,
            paddingRight: padding.right,
          }}
        >
          {placedElements.length === 0 ? (
            <BlankDropZone index={0} variant="fill" />
          ) : (
            <>
              <BlankDropZone index={0} />
              {placedElements.map((element, elementIndex) => (
                <Fragment key={element.id}>
                  <BlankPlacedElement element={element} />
                  {elementIndex < placedElements.length - 1 ? (
                    <BlankDropZone index={elementIndex + 1} />
                  ) : null}
                </Fragment>
              ))}
              <BlankDropZone index={placedElements.length} variant="tail" />
            </>
          )}
        </div>
      </div>
    </DocumentStage>
  )
}

/**
 * Blank-start canvas. At rest with nothing placed it shows the empty-state CTAs
 * (Figma 3268:37410). Dragging an element from the Add elements palette swaps in
 * the blank page so the thick blue insertion line previews where the drop will
 * land; dropping places the element on the page (build-from-scratch — no invoice
 * scaffold). Dragging back out before dropping restores the empty state. Once
 * any element exists, the page stays visible.
 */
function BlankCanvas({
  onInsertElements,
  onGenerate,
}: {
  onInsertElements: () => void
  onGenerate: () => void
}) {
  const { placedElements } = useLayoutBuilder()
  const [dragging, setDragging] = useState(false)
  // Enter/leave fire for every nested child during a drag; a depth counter
  // tells a real boundary crossing apart from movement between children.
  const depthRef = useRef(0)

  // Safety net for a cancelled drag: when a drag ends without a drop (dropped
  // off-canvas, or Escape), the canvas may never receive a balanced dragleave —
  // the element under the cursor can unmount mid-drag. `dragend`/`drop` fire
  // globally at the end of any drag, so reset there to restore the empty state.
  useEffect(() => {
    const reset = () => {
      depthRef.current = 0
      setDragging(false)
    }
    window.addEventListener("dragend", reset)
    window.addEventListener("drop", reset)
    return () => {
      window.removeEventListener("dragend", reset)
      window.removeEventListener("drop", reset)
    }
  }, [])

  const carriesElement = (event: React.DragEvent) =>
    event.dataTransfer.types.includes(ELEMENT_DRAG_MIME)

  const handleDragEnter = (event: React.DragEvent) => {
    if (!carriesElement(event)) {
      return
    }
    event.preventDefault()
    depthRef.current += 1
    setDragging(true)
  }

  const handleDragOver = (event: React.DragEvent) => {
    if (!carriesElement(event)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleDragLeave = (event: React.DragEvent) => {
    if (!carriesElement(event)) {
      return
    }
    depthRef.current = Math.max(0, depthRef.current - 1)
    if (depthRef.current === 0) {
      setDragging(false)
    }
  }

  const handleDrop = () => {
    depthRef.current = 0
    setDragging(false)
  }

  const hasContent = placedElements.length > 0
  const showPage = hasContent || dragging

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {showPage ? (
        <div className="flex min-w-0 flex-1 items-start justify-center overflow-auto bg-[#f9fafb] p-4">
          <BlankPage />
        </div>
      ) : (
        <CanvasBlankEmptyState
          onInsertElements={onInsertElements}
          onGenerate={onGenerate}
        />
      )}
    </div>
  )
}

/**
 * The "AI working" canvas outline: a light beam travels around the canvas border
 * while the AI customizes existing content, so the user keeps seeing their work
 * (no full-screen takeover or content tint) with clear feedback that a change is
 * in flight. Pointer-events-none so the content underneath stays inert.
 */
function CanvasWorkingEdge() {
  return (
    <div
      aria-hidden
      className="canvas-working-edge pointer-events-none absolute inset-0 z-10"
    />
  )
}

/**
 * Companion to the working edge: a soft light band sweeps across the canvas
 * while the AI is acting on existing content, layering a "live" shimmer over the
 * layout for the duration of the action. Pointer-events-none so content stays
 * inert; pairs with the traveling edge beam.
 */
function CanvasWorkingShimmer() {
  return (
    <div
      aria-hidden
      className="canvas-working-shimmer pointer-events-none absolute inset-0 z-10"
    />
  )
}

export function LayoutBuilderCanvas() {
  const {
    status,
    hasGeneratedOnce,
    aiEditingLayer,
    placedElements,
    codeOpen,
    previewOpen,
    codeOverride,
    isCodeDetached,
    isBlankSession,
    openAddElements,
    focusPrompt,
    canvasToast,
    generatedLayout,
    mediumId,
  } = useLayoutBuilder()
  // Resolves medium context for future preview sizing; kept for parity with prompt selection.
  useMediumsStore()

  // The detailed branded template has its own editable surface (mirrors the pure
  // `BrandedInvoiceDocument` used by cards + preview, so they can't drift). Other
  // styles use the standard editable `DocumentSurface`.
  const documentBody =
    generatedLayout.style === "branded" ? (
      <BrandedDocumentSurface />
    ) : (
      <DocumentSurface />
    )

  const isReady = status === "ready"
  // Blank build-from-scratch session (Figma 3268:37410): the canvas owns its own
  // empty / drag / placed-content states, so it stays mounted for the whole
  // session until the user hands off to AI generation (status leaves "idle").
  const blankMode = isBlankSession && status === "idle"
  // User dropped elements and then asked the AI to customize them: keep their
  // build-from-scratch page on screen (no generating carousel takeover) while
  // the AI works, overlaid with the working glow (Figma 3300:45143).
  const customizingPlaced =
    placedElements.length > 0 && !blankMode && !isReady
  // Traveling outline beam while the AI is engaged with content already on the
  // canvas (placed elements or a generated layout) — through reasoning, asking
  // clarifying questions, and generating.
  const aiWorking =
    status === "thinking" || status === "reasoning" || status === "asking"
  // The full-screen generating animation is only for the very first build while
  // it's actively running with nothing on the canvas yet. Gating on an active
  // generating status (not merely "not generated") means an idle builder — e.g.
  // a refresh with no restored layout — never spins the animation forever. Once
  // a layout exists or the user is customizing placed elements, follow-up
  // prompts keep the canvas visible instead.
  const showCarousel =
    aiWorking && !hasGeneratedOnce && !blankMode && !customizingPlaced
  // A scoped prompt-box edit owns the working glow inside its own container, so
  // the canvas-wide beam stands down — the change reads as local, not a
  // full-invoice regeneration.
  const showWorkingEdge =
    aiWorking &&
    (placedElements.length > 0 || hasGeneratedOnce) &&
    !aiEditingLayer
  const showCode = isReady && codeOpen
  const showPreview = isReady && previewOpen
  const showSplit = showCode && showPreview

  // Fraction of the split given to the code editor (the rest is the preview).
  const [codeFraction, setCodeFraction] = useState(0.5)
  const splitRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const clampFraction = useCallback((fraction: number) => {
    const width = splitRef.current?.clientWidth ?? 0
    if (width <= 0) {
      return Math.min(0.8, Math.max(0.2, fraction))
    }
    const min = Math.max(MIN_CODE_PX / width, 0.2)
    // Reserve room for the preview; the code pane otherwise fills its fraction.
    const max = Math.min(1 - MIN_PREVIEW_PX / width, 0.8)
    // Guard against inverted bounds on very narrow canvases.
    if (min > max) {
      return 0.5
    }
    return Math.min(max, Math.max(min, fraction))
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
    },
    []
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || !splitRef.current) {
        return
      }
      const rect = splitRef.current.getBoundingClientRect()
      setCodeFraction(clampFraction((event.clientX - rect.left) / rect.width))
    },
    [clampFraction]
  )

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) {
        return
      }
      draggingRef.current = false
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // pointer may already be released
      }
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    },
    []
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setCodeFraction((fraction) => clampFraction(fraction - SPLIT_KEYBOARD_STEP))
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        setCodeFraction((fraction) => clampFraction(fraction + SPLIT_KEYBOARD_STEP))
      }
    },
    [clampFraction]
  )

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col p-4">
      <div
        ref={splitRef}
        data-builder-surface
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-[12px] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]",
          showCode && !showPreview
            ? "bg-[#1c1917]"
            : showCarousel
              ? "bg-white"
              : "bg-[#f9fafb]"
        )}
      >
        {blankMode ? (
          <BlankCanvas
            onInsertElements={openAddElements}
            onGenerate={focusPrompt}
          />
        ) : customizingPlaced ? (
          <div className="flex min-w-0 flex-1 items-start justify-center overflow-auto bg-[#f9fafb] p-4">
            <BlankPage />
          </div>
        ) : showCarousel ? (
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <GeneratingCarousel />
          </div>
        ) : showSplit ? (
          <>
            <div
              className="flex h-full shrink-0 flex-col overflow-hidden bg-[#1c1917]"
              style={{ width: `${codeFraction * 100}%` }}
            >
              <CodeEditorBar />
              <div className="min-h-0 flex-1 overflow-auto">
                <LayoutCodeEditor />
              </div>
            </div>
            <div className="flex h-full min-w-0 flex-1 items-start justify-center overflow-auto border-l border-[#eaecf0] bg-[#f9fafb] p-4">
              {isCodeDetached ? (
                <CodePreviewFrame html={codeOverride ?? ""} />
              ) : (
                <DocumentStage>{documentBody}</DocumentStage>
              )}
            </div>

            {/* Drag handle on the code/preview seam (Figma 3189:58977). Pinned to
                the split fraction and vertically centred without taking layout
                width, so dragging only resizes the two panes. */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize code editor"
              aria-valuenow={Math.round(codeFraction * 100)}
              aria-valuemin={20}
              aria-valuemax={80}
              tabIndex={0}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={handleKeyDown}
              style={{ left: `${codeFraction * 100}%` }}
              className="group absolute top-1/2 z-20 flex h-12 w-4 -translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <span className="flex h-12 w-4 items-center justify-center rounded-full border border-[#eaecf0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.1)] transition-colors group-hover:border-[#d0d5dd]">
                <GripVertical
                  className="size-4 text-[#98a2b3] transition-colors group-hover:text-[#475467] group-focus-visible:text-[#6938ef]"
                  aria-hidden
                />
              </span>
            </div>
          </>
        ) : showCode ? (
          <div className="flex h-full w-full flex-col overflow-hidden bg-[#1c1917]">
            <CodeEditorBar />
            <div className="min-h-0 flex-1 overflow-auto">
              <LayoutCodeEditor />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-start justify-center overflow-auto bg-[#f9fafb] p-4">
            {isCodeDetached ? (
              <CodePreviewFrame html={codeOverride ?? ""} />
            ) : (
              <DocumentStage>{documentBody}</DocumentStage>
            )}
          </div>
        )}

        {showWorkingEdge ? <CanvasWorkingShimmer /> : null}
        {showWorkingEdge ? <CanvasWorkingEdge /> : null}

        {canvasToast ? <CanvasToast message={canvasToast} /> : null}
      </div>
    </div>
  )
}

/**
 * Transient confirmation toast pinned to the horizontal center of the canvas
 * (edit confirmations like applied/cleared conditional rules). AI-related
 * feedback stays in the panel; this surfaces document edits over the canvas.
 * Matches the dashboard success toast treatment; auto-dismissed by the context.
 */
function CanvasToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
      <div className="animate-in fade-in-0 slide-in-from-top-1 flex items-center gap-1.5 rounded-[8px] border border-[#6ce9a6] bg-[#ecfdf3] py-1.5 pl-2.5 pr-3 shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]">
        <CheckCircle2 className="size-4 shrink-0 text-[#027a48]" aria-hidden />
        <span className="font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#027a48]">
          {message}
        </span>
      </div>
    </div>
  )
}
