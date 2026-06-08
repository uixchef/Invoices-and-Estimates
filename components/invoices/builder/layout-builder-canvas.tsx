"use client"

import {
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
  Code2,
  Copy,
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { GeneratingCarousel } from "@/components/invoices/builder/generating-carousel"
import { VisualEditSelector } from "@/components/invoices/builder/visual-edit-selector"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { useMediumsStore } from "@/lib/mediums-store"
import type {
  BuilderLayerStyle,
  GeneratedLayout,
  GeneratedLineItem,
} from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

/** Maps a layer's style overrides to an inline style object. */
function styleFromLayer(style?: BuilderLayerStyle): CSSProperties | undefined {
  if (!style) {
    return undefined
  }
  const result: CSSProperties = {}
  if (style.fontFamily) result.fontFamily = style.fontFamily
  if (style.fontSize) result.fontSize = style.fontSize
  if (style.fontStyle) result.fontStyle = style.fontStyle
  if (style.fontWeight) result.fontWeight = style.fontWeight
  if (style.textAlign) result.textAlign = style.textAlign
  if (style.color) result.color = style.color
  if (style.backgroundColor) result.backgroundColor = style.backgroundColor
  if (style.letterSpacing != null) {
    result.letterSpacing = `${style.letterSpacing}px`
  }
  if (style.lineHeight != null) result.lineHeight = style.lineHeight
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
    sendMessage,
    layerText,
    setLayerText,
    layerStyles,
    selectLayer,
    seedLayer,
  } = useLayoutBuilder()
  const spanRef = useRef<HTMLSpanElement>(null)

  // Overrides win for display so inspector / inline edits show immediately;
  // structured fields also stay in sync via onCommit (for the code view).
  const current = layerText[label] ?? value
  const isSelected = selections.some((selection) => selection.label === label)
  const appliedStyle = styleFromLayer(layerStyles[label])

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
    selectLayer(label)
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

  // Bare editing (selection chrome is provided by an enclosing selector).
  if (!showBadge) {
    return editable(
      "ring-1 ring-transparent hover:ring-[#9b8afb] focus:ring-2 focus:ring-[#6938ef]"
    )
  }

  // Every other layer gets the full Cursor-style selector: click to select,
  // hover the selection for the scoped "Describe your edit" prompt.
  return (
    <VisualEditSelector
      label={label}
      selected={isSelected}
      onSelect={() => selectLayer(label)}
      onSubmitPrompt={(text) => sendMessage(`${label}: ${text}`)}
      className="inline-flex max-w-full align-baseline"
    >
      {editable("focus:ring-2 focus:ring-[#6938ef]")}
    </VisualEditSelector>
  )
}

function DocumentHeader({ layout }: { layout: GeneratedLayout }) {
  const { updateLayout } = useLayoutBuilder()
  const addressLine = "123 Market Street · Suite 400"

  if (layout.style === "bold") {
    return (
      <div
        className="flex items-start justify-between gap-4 p-10 text-white"
        style={{ backgroundColor: layout.accent }}
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
      <div className="flex flex-col items-center gap-2 px-10 pt-10 text-center">
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
      <div className="flex items-start justify-between gap-4 px-10 pt-10">
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
function SelectableSection({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  const { editMode, selections, addSelection, sendMessage } = useLayoutBuilder()

  if (!editMode) {
    return className ? <div className={className}>{children}</div> : <>{children}</>
  }

  return (
    <VisualEditSelector
      label={label}
      selected={selections.some((selection) => selection.label === label)}
      onSelect={() => addSelection(label)}
      onSubmitPrompt={(text) => sendMessage(`${label}: ${text}`)}
      className={className}
    >
      {children}
    </VisualEditSelector>
  )
}

/** Design width of the invoice paper; the stage scales to fit within this. */
const DOCUMENT_WIDTH = 595

/**
 * Fits the fixed-width invoice document to the available pane width by scaling
 * it down (never up) with a transform, so it stays fully visible with the pane's
 * gutter preserved on every side — no horizontal overflow or left-edge clipping
 * on small or zoomed screens. The placeholder box takes the scaled dimensions so
 * vertical scroll and centering stay correct, and `min-w-0` lets it shrink below
 * the document's intrinsic width inside the flex pane.
 */
function DocumentStage({ children }: { children: ReactNode }) {
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
      const available = outer.clientWidth
      const next = Math.min(1, available / DOCUMENT_WIDTH)
      setScale(next)
      setSize({ width: DOCUMENT_WIDTH * next, height: doc.offsetHeight * next })
    }

    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(doc)
    update()
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outerRef} className="w-full min-w-0">
      <div
        className="mx-auto"
        style={size ? { width: size.width, height: size.height } : undefined}
      >
        <div
          ref={docRef}
          style={{
            width: DOCUMENT_WIDTH,
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
    addSelection,
    sendMessage,
  } = useLayoutBuilder()

  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  )
  const tax = layout.sections.taxes ? subtotal * layout.taxRate : 0
  const total = subtotal + tax
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

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[595px] flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]",
        isClassic ? "font-serif" : "font-[family-name:var(--font-inter)]"
      )}
    >
      <SelectableSection label="Header" className="ring-inset">
        <DocumentHeader layout={layout} />
      </SelectableSection>

      <div className="flex flex-1 flex-col gap-6 px-10 py-8">
        <SelectableSection label="Billing details" className="flex justify-between gap-6">
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

        {layout.sections.items ? (
          <div className="flex flex-col">
            <SelectableSection label="Table header">
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
                return <div key={index}>{row}</div>
              }

              return (
                <VisualEditSelector
                  key={index}
                  label={itemLabel}
                  selected={selections.some(
                    (selection) => selection.label === itemLabel
                  )}
                  onSelect={() => addSelection(itemLabel)}
                  onSubmitPrompt={(text) =>
                    sendMessage(`${itemLabel}: ${text}`)
                  }
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
                      onClick: () => deleteItem(index),
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

        <SelectableSection label="Totals" className="flex justify-end">
          <div className="flex w-60 flex-col gap-2">
            <div className="flex justify-between text-sm text-[#667085]">
              <span>
                <EditableText value="Subtotal" label="Subtotal label" />
              </span>
              <span className="text-[#101828]">{money(subtotal)}</span>
            </div>
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

        {layout.sections.notes || layout.sections.terms ? (
          <SelectableSection
            label="Notes & terms"
            className="mt-auto flex flex-col gap-4 border-t border-[#eaecf0] pt-6"
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
          </SelectableSection>
        ) : null}
      </div>
    </div>
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
  const tax = layout.sections.taxes ? subtotal * layout.taxRate : 0
  const total = subtotal + tax

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

  if (layout.sections.notes || layout.sections.terms) {
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
 * Header strip above the code editor. In attached mode it offers an explicit
 * "eject" to raw-code editing; in detached mode it shows the detached status and
 * a two-step revert (guards against discarding raw edits on a stray click).
 */
function CodeEditorBar() {
  const {
    generatedLayout: layout,
    layerText,
    isCodeDetached,
    detachCode,
    reattachCode,
  } = useLayoutBuilder()
  const [confirmingRevert, setConfirmingRevert] = useState(false)

  // Collapse the revert confirmation if the user navigates away from it.
  useEffect(() => {
    if (!isCodeDetached && confirmingRevert) {
      setConfirmingRevert(false)
    }
  }, [isCodeDetached, confirmingRevert])

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#292524] bg-[#1c1917] pr-2 pl-4">
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-[#d0d5dd]">
        <Code2 className="size-3.5 text-[#98a2b3]" aria-hidden />
        {isCodeDetached ? "Editing code directly" : "Code"}
      </span>

      {isCodeDetached ? (
        <span className="rounded-full bg-[#3a2d75] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d9d6fe]">
          Detached
        </span>
      ) : null}

      <div className="min-w-px flex-1" />

      {isCodeDetached ? (
        confirmingRevert ? (
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
        )
      ) : (
        <button
          type="button"
          onClick={() => detachCode(buildCode(layout, layerText).code)}
          className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-[#3f3a36] px-2 text-[11px] font-medium text-[#d0d5dd] outline-none transition-colors hover:bg-[#292524] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <Code2 className="size-3" aria-hidden />
          Edit code directly
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
    <div className="mx-auto flex w-full max-w-[595px] flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]">
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
                  active ? "bg-[#3a2d75] text-white" : "bg-[#292524] text-[#d0d5dd]"
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
// (Figma 3189:58977). The code pane width is draggable; these guards keep both
// panes usable on any canvas width.
const MIN_CODE_PX = 280
const MAX_CODE_PX = 520
const MIN_PREVIEW_PX = 320
const SPLIT_KEYBOARD_STEP = 0.04

export function LayoutBuilderCanvas() {
  const { status, codeOpen, previewOpen, codeOverride, isCodeDetached } =
    useLayoutBuilder()
  // Resolves medium context for future preview sizing; kept for parity with prompt selection.
  useMediumsStore()

  const isReady = status === "ready"
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
    // Code editor is capped at MAX_CODE_PX so the preview always keeps room.
    const max = Math.min(1 - MIN_PREVIEW_PX / width, 0.8, MAX_CODE_PX / width)
    // Guard against inverted bounds on very narrow canvases.
    if (min > max) {
      return Math.min(0.5, MAX_CODE_PX / width)
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
    <div className="flex min-h-0 w-full flex-1 flex-col p-4">
      <div
        ref={splitRef}
        className={cn(
          "relative flex min-h-0 flex-1 overflow-hidden rounded-[12px] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]",
          showCode && !showPreview ? "bg-[#1c1917]" : isReady ? "bg-[#f9fafb]" : "bg-white"
        )}
      >
        {!isReady ? (
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <GeneratingCarousel />
          </div>
        ) : showSplit ? (
          <>
            <div
              className="flex h-full shrink-0 flex-col overflow-hidden bg-[#1c1917]"
              style={{ width: `min(${codeFraction * 100}%, ${MAX_CODE_PX}px)` }}
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
                <DocumentStage>
                  <DocumentSurface />
                </DocumentStage>
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
              style={{ left: `min(${codeFraction * 100}%, ${MAX_CODE_PX}px)` }}
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
              <DocumentStage>
                <DocumentSurface />
              </DocumentStage>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
