"use client"

import { useMemo, useRef, type CSSProperties } from "react"
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react"

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

/** Real, rendered document shown once generation completes. */
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
        "mx-auto flex aspect-[1/1.414] w-full max-w-[640px] flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.1),0_1px_2px_rgba(16,24,40,0.06)]",
        isClassic ? "font-serif" : "font-[family-name:var(--font-inter)]"
      )}
    >
      <DocumentHeader layout={layout} />

      <div className="flex flex-1 flex-col gap-6 px-10 py-8">
        <div className="flex justify-between gap-6">
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
        </div>

        {layout.sections.items ? (
          <div className="flex flex-col">
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

        <div className="flex justify-end">
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
        </div>

        {layout.sections.notes || layout.sections.terms ? (
          <div className="mt-auto flex flex-col gap-4 border-t border-[#eaecf0] pt-6">
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
          </div>
        ) : null}
      </div>
    </div>
  )
}

function buildHtml(layout: GeneratedLayout): string {
  const rows = layout.lineItems
    .map(
      (item) =>
        `      <tr>\n        <td>${item.description}</td>\n        <td class="num">${item.qty}</td>\n        <td class="num">${layout.currencySymbol}${item.rate.toFixed(2)}</td>\n        <td class="num">${layout.currencySymbol}${(item.qty * item.rate).toFixed(2)}</td>\n      </tr>`
    )
    .join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${layout.documentType} · ${layout.businessName}</title>
    <style>
      :root { --accent: ${layout.accent}; }
      body { font-family: ${
        layout.style === "classic" ? "Georgia, serif" : "Inter, sans-serif"
      }; color: #101828; }
      .doc-title { color: var(--accent); font-size: 24px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; }
      th { border-bottom: 2px solid var(--accent); text-align: left; }
      td, th { padding: 8px 0; }
      .num { text-align: right; }
      .total { color: var(--accent); font-weight: 700; }
    </style>
  </head>
  <body>
    <header>
      <h1>${layout.businessName}</h1>
      <p class="doc-title">${layout.documentType} — ${layout.documentNumber}</p>
    </header>
    <table>
      <thead>
        <tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </body>
</html>`
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

/**
 * Source view of the generated document, shown alongside the preview when the
 * Code editor is open. Mirrors the Email Marketing code snippet (Figma
 * 299:76555): warm-gray gutter, dark editor surface, and syntax highlighting.
 */
function LayoutCodeEditor() {
  const { generatedLayout: layout } = useLayoutBuilder()
  const lines = useMemo(() => highlightHtml(buildHtml(layout)), [layout])

  return (
    <div className="flex min-h-full w-max min-w-full font-mono text-[13px] leading-5">
      <div className="sticky left-0 shrink-0 select-none bg-[#292524] px-4 py-4 text-right text-[#d0d5dd]">
        {lines.map((_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <div className="flex-1 whitespace-pre px-4 pb-6 pt-4 text-[#f9fafb]">
        {lines.map((line, index) => (
          <div key={index}>
            {line.length === 0
              ? "\u00A0"
              : line.map((token, tokenIndex) => (
                  <span key={tokenIndex} style={{ color: token.color }}>
                    {token.text}
                  </span>
                ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function LayoutBuilderCanvas() {
  const { status, codeOpen, previewOpen } = useLayoutBuilder()
  // Resolves medium context for future preview sizing; kept for parity with prompt selection.
  useMediumsStore()

  const isReady = status === "ready"
  const showCode = isReady && codeOpen
  const showPreview = isReady && previewOpen
  const showSplit = showCode && showPreview

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden rounded-[12px] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]",
          showCode && !showPreview ? "bg-[#1c1917]" : isReady ? "bg-[#f9fafb]" : "bg-white"
        )}
      >
        {!isReady ? (
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <GeneratingCarousel />
          </div>
        ) : showSplit ? (
          <>
            <div className="h-full w-1/2 min-w-0 overflow-auto bg-[#1c1917]">
              <LayoutCodeEditor />
            </div>
            <div className="flex h-full w-1/2 min-w-0 justify-center overflow-auto border-l border-[#eaecf0] bg-[#f9fafb] p-6">
              <DocumentSurface />
            </div>
          </>
        ) : showCode ? (
          <div className="h-full w-full overflow-auto bg-[#1c1917]">
            <LayoutCodeEditor />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center overflow-auto bg-[#f9fafb] p-6">
            <DocumentSurface />
          </div>
        )}
      </div>
    </div>
  )
}
