"use client"

import { useMemo, useState, type ReactNode } from "react"
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

import { Input } from "@/components/highrise/input-text"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
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
 * Quick-Add tile (Figma 118:20190). States map to design tokens:
 * - Default: gray/300 border, white, 4px radius, no shadow
 * - Hover: blue/300 border, white, 8px radius, Shadow/md
 * - Active (pressed / dragging): blue/700 border, gray/25, 8px radius, Shadow/md
 * - Disabled: gray/200 border, gray/25, 4px radius, gray/400 text
 * Active doubles as the drag state; while no drop target is wired the same
 * visual is applied during a native drag via `data-dragging`.
 */
function ElementTile({
  item,
  onSelect,
  disabled = false,
}: {
  item: AddElement
  onSelect: () => void
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      draggable={!disabled}
      data-dragging={dragging ? "true" : undefined}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", item.id)
        event.dataTransfer.effectAllowed = "copy"
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "flex flex-col items-center justify-center gap-1 border bg-white px-3 py-4 text-[#101828] outline-none",
        "transition-[color,background-color,border-color,box-shadow,border-radius]",
        // Default
        "rounded-[4px] border-[#d0d5dd]",
        // Hover (guarded so it never applies to a disabled tile)
        "enabled:hover:cursor-pointer enabled:hover:rounded-[8px] enabled:hover:border-[#84adff] enabled:hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)]",
        // Pressed (Figma "Active")
        "enabled:active:rounded-[8px] enabled:active:border-[#004eeb] enabled:active:bg-[#fcfcfd] enabled:active:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)]",
        // Dragging — same visual as Active
        "data-[dragging=true]:rounded-[8px] data-[dragging=true]:border-[#004eeb] data-[dragging=true]:bg-[#fcfcfd] data-[dragging=true]:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)]",
        // Focus (accessibility — not shown in Figma but required for keyboard use)
        "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        // Disabled
        "disabled:cursor-not-allowed disabled:rounded-[4px] disabled:border-[#eaecf0] disabled:bg-[#fcfcfd] disabled:text-[#98a2b3] disabled:shadow-none"
      )}
    >
      <span className="flex size-10 items-center justify-center [&_svg]:size-7 [&_svg]:stroke-[1.5]">
        {item.icon}
      </span>
      <span className="w-full truncate font-[family-name:var(--font-inter)] text-sm leading-5">
        {item.label}
      </span>
    </button>
  )
}

/**
 * Figma: Add elements panel (3147:23660 / Quick Add 3147:21863). Replaces the AI
 * conversation in the panel while the composer stays docked below. Picking a
 * tile asks the AI to insert that element, then dismisses the palette.
 */
export function AddElementsPanel() {
  const { sendMessage, closeAddElements } = useLayoutBuilder()
  const [query, setQuery] = useState("")

  const sections = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return SECTIONS
    }
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.label.toLowerCase().includes(term)
      ),
    })).filter((section) => section.items.length > 0)
  }, [query])

  const handleSelect = (item: AddElement) => {
    sendMessage(`Add a ${item.label.toLowerCase()} element to the layout`)
    closeAddElements()
  }

  return (
    <>
      {/* Search lives in the fixed panel header (Figma 3147:22258), directly under
          the title, so it stays put while the element list scrolls. Reuses the
          dashboard's shared HighRise Input for consistent styling and focus states. */}
      <div className="shrink-0 px-4 pt-3 pb-4">
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
        {sections.length === 0 ? (
          <p className="px-1 py-6 text-center font-[family-name:var(--font-inter)] text-sm text-[#667085]">
            No elements match “{query}”.
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-3">
              <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
                {section.label}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {section.items.map((item) => (
                  <ElementTile
                    key={item.id}
                    item={item}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
