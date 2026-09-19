"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Box,
  Heading,
  Image as ImageIcon,
  ListOrdered,
  Pilcrow,
  Quote,
  RectangleHorizontal,
  Search,
  SeparatorHorizontal,
  Table as TableIcon,
  UnfoldVertical,
} from "lucide-react"

import { SavedItemRow } from "@/components/invoices/builder/saved-item-row"
import { Input } from "@/components/highrise/input-text"
import { LEFT_PANEL_SEARCH_WRAP } from "@/lib/builder-left-panel"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { savedItemMatchesQuery } from "@/lib/saved-items"
import { cn } from "@/lib/utils"

/** Mini column-layout glyph used by the 1–4 column tiles (Figma 3147:21863). */
function ColumnsGlyph({ count }: { count: number }) {
  return (
    <div className="flex w-8 items-center gap-0.5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-5 flex-1 rounded-[2px] bg-[#eaecf0]" />
      ))}
    </div>
  )
}

type AddElement = { id: string; label: string; icon: ReactNode }
type AddSection = { id: string; label: string; items: AddElement[] }

// Catalogue mirrors the Figma "Quick Add" palette (Text / Layout / Media / Data).
const SECTIONS: AddSection[] = [
  {
    id: "text",
    label: "Text",
    items: [
      { id: "heading", label: "Heading", icon: <Heading aria-hidden /> },
      { id: "paragraph", label: "Paragraph", icon: <Pilcrow aria-hidden /> },
      { id: "list", label: "List", icon: <ListOrdered aria-hidden /> },
      { id: "quote", label: "Quote", icon: <Quote aria-hidden /> },
      {
        id: "divider",
        label: "Divider",
        icon: <SeparatorHorizontal aria-hidden />,
      },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    items: [
      { id: "container", label: "Container", icon: <Box aria-hidden /> },
      { id: "columns-1", label: "1", icon: <ColumnsGlyph count={1} /> },
      { id: "columns-2", label: "2", icon: <ColumnsGlyph count={2} /> },
      { id: "columns-3", label: "3", icon: <ColumnsGlyph count={3} /> },
      { id: "columns-4", label: "4", icon: <ColumnsGlyph count={4} /> },
      { id: "spacer", label: "Spacer", icon: <UnfoldVertical aria-hidden /> },
    ],
  },
  {
    id: "media",
    label: "Media",
    items: [
      { id: "image", label: "Image", icon: <ImageIcon aria-hidden /> },
      {
        id: "button",
        label: "Button",
        icon: <RectangleHorizontal aria-hidden />,
      },
    ],
  },
  {
    id: "data",
    label: "Data",
    items: [{ id: "table", label: "Table", icon: <TableIcon aria-hidden /> }],
  },
]

/**
 * Quick-Add tile (Figma 118:20190 / 118:20187). Two ways to insert: drag onto
 * the canvas, or click/press to drop it at the end of the document. States map
 * to design tokens:
 * - Default: gray/300 border, white, 4px radius, no shadow
 * - Hover: blue/300 border, white, 8px radius, Shadow/md
 * - Active (pressing / dragging): blue/700 border, gray/25, 8px radius, Shadow/md
 * - Disabled: gray/200 border, gray/25, 4px radius, gray/400 text
 */
function tileAriaLabel(item: AddElement): string {
  if (item.id.startsWith("columns-")) {
    return `Add ${item.id.slice("columns-".length)}-column layout — drag onto the layout, or press to insert`
  }
  return `Add ${item.label} — drag onto the layout, or press to insert`
}

function ElementTile({
  item,
  disabled = false,
  onAdd,
}: {
  item: AddElement
  disabled?: boolean
  onAdd: (item: AddElement) => void
}) {
  const { beginElementDrag, elementDrag } = useLayoutBuilder()
  const origin = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const lifted =
    elementDrag?.mode === "insert" && elementDrag.kind === item.id

  return (
    <button
      type="button"
      aria-label={tileAriaLabel(item)}
      aria-grabbed={lifted}
      disabled={disabled}
      draggable={false}
      data-dragging={lifted ? "true" : undefined}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) {
          return
        }
        origin.current = { x: event.clientX, y: event.clientY }
        dragging.current = false
        event.currentTarget.setPointerCapture(event.pointerId)
        event.preventDefault()
      }}
      onPointerMove={(event) => {
        if (!origin.current || disabled) {
          return
        }
        const distance = Math.hypot(
          event.clientX - origin.current.x,
          event.clientY - origin.current.y
        )
        if (!dragging.current && distance < 4) {
          return
        }
        if (!dragging.current) {
          dragging.current = true
          beginElementDrag({
            mode: "insert",
            kind: item.id,
            label: item.label,
            x: event.clientX,
            y: event.clientY,
          })
        }
      }}
      onPointerUp={(event) => {
        origin.current = null
        if (!dragging.current && !disabled) {
          onAdd(item)
        }
        dragging.current = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      }}
      onPointerCancel={() => {
        origin.current = null
        dragging.current = false
      }}
      className={cn(
        "flex select-none flex-col items-center justify-center gap-1 border bg-white px-3 py-4 text-[#101828] outline-none",
        "transition-[color,background-color,border-color,box-shadow,border-radius] motion-reduce:transition-none",
        "rounded-[4px] border-[#d0d5dd]",
        !disabled &&
          "cursor-grab hover:rounded-[8px] hover:border-[#84adff] hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)] focus-visible:rounded-[8px] focus-visible:border-[#84adff] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        !disabled &&
          "active:cursor-grabbing active:rounded-[8px] active:border-[#004eeb] active:bg-[#fcfcfd] active:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)]",
        "data-[dragging=true]:rounded-[8px] data-[dragging=true]:border-[#004eeb] data-[dragging=true]:bg-[#eff8ff] data-[dragging=true]:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)]",
        disabled &&
          "cursor-not-allowed rounded-[4px] border-[#eaecf0] bg-[#fcfcfd] text-[#98a2b3] shadow-none"
      )}
    >
      <span className="flex size-10 items-center justify-center [&_svg]:size-7 [&_svg]:stroke-[1.5]">
        {item.icon}
      </span>
      <span className="w-full truncate text-center font-[family-name:var(--font-inter)] text-sm leading-5">
        {item.label}
      </span>
    </button>
  )
}


/**
 * Figma: Add elements panel (3147:23660 / Quick Add 3147:21863). Replaces the AI
 * conversation in the panel while the composer stays docked below. Tiles insert
 * by drag onto the invoice canvas or by click/keyboard activation.
 */
export function AddElementsPanel() {
  const [query, setQuery] = useState("")
  const savedRef = useRef<HTMLDivElement>(null)
  const { addPlacedElement, savedItems, insertSavedItem, revealSavedItems } =
    useLayoutBuilder()

  useEffect(() => {
    if (revealSavedItems) {
      savedRef.current?.scrollIntoView({ block: "start" })
    }
  }, [revealSavedItems])

  const handleAdd = (item: AddElement) => {
    addPlacedElement({ kind: item.id, label: item.label, zone: "end" })
  }

  const term = query.trim().toLowerCase()
  const sections = useMemo(() => {
    if (!term) {
      return SECTIONS
    }
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.label.toLowerCase().includes(term)
      ),
    })).filter((section) => section.items.length > 0)
  }, [term])

  const visibleSaved = term
    ? savedItems.filter((item) => savedItemMatchesQuery(item, term))
    : savedItems
  const showSavedSection = term ? visibleSaved.length > 0 : true

  const savedBlock = showSavedSection ? (
            <div
              ref={savedRef}
              data-saved-items
              className="flex flex-col gap-1.5 pb-4"
            >
              <p className="font-[family-name:var(--font-inter)] text-xs font-medium uppercase tracking-wide text-[#98a2b3]">
                Saved items
              </p>
              {visibleSaved.length === 0 ? (
                <p className="font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]">
                  Save a block from any layout to reuse it here.
                </p>
              ) : (
                <div role="list" aria-label="Saved items" className="flex flex-col gap-0.5">
                  {visibleSaved.map((item) => (
                    <SavedItemRow
                      key={item.id}
                      item={item}
                      siblings={savedItems}
                      onInsert={insertSavedItem}
                    />
                  ))}
                </div>
              )}
            </div>
  ) : null

  return (
    <>
      <div className={LEFT_PANEL_SEARCH_WRAP}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search elements"
            className="h-9 pl-8 font-[family-name:var(--font-inter)] text-base leading-6"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-2">
        {sections.length === 0 && visibleSaved.length === 0 ? (
          <p className="px-1 py-6 text-center font-[family-name:var(--font-inter)] text-sm text-[#667085]">
            No elements match “{query}”.
          </p>
        ) : (
          <>
            {term ? savedBlock : null}
            {sections.map((section) => (
              <div key={section.id} className="flex flex-col gap-3">
                <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
                  {section.label}
                </p>
                <div
                  role="group"
                  aria-label={section.label}
                  className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,100px),1fr))] gap-3"
                >
                  {section.items.map((item) => (
                    <ElementTile key={item.id} item={item} onAdd={handleAdd} />
                  ))}
                </div>
              </div>
            ))}
            {!term ? savedBlock : null}
          </>
        )}
      </div>
    </>
  )
}

