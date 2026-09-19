"use client"

import { useEffect, useRef, useState } from "react"
import { GripVertical, MoreHorizontal } from "lucide-react"

import { SavedItemGlyph } from "@/components/invoices/builder/saved-item-glyph"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { structureHint, type SavedItemDefinition } from "@/lib/saved-items"
import { cn } from "@/lib/utils"

export function SavedItemRow({
  item,
  siblings,
  onInsert,
}: {
  item: SavedItemDefinition
  siblings: SavedItemDefinition[]
  onInsert: (id: string) => void
}) {
  const {
    beginElementDrag,
    elementDrag,
    renameSavedItem,
    duplicateSavedItem,
    deleteSavedItem,
    replaceSelectedWithSavedItem,
    replaceAvailability,
  } = useLayoutBuilder()
  const origin = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(item.name)
  const lifted =
    elementDrag?.mode === "insert" && elementDrag.savedItemId === item.id
  const replace = replaceAvailability(item.id)
  const hint = structureHint(item.root, { name: item.name, siblings })
  const showHint = hint.toLowerCase() !== item.name.trim().toLowerCase()

  useEffect(() => {
    setName(item.name)
  }, [item.name])

  return (
    <div
      data-saved-item={item.id}
      className={cn(
        "group flex min-h-10 items-center gap-1.5 rounded-[6px] border border-transparent px-1 py-1",
        "hover:border-[#eaecf0] hover:bg-[#f9fafb]",
        "focus-within:border-[#d0d5dd]",
        lifted && "border-[#004eeb] bg-[#eff8ff]"
      )}
    >
      <button
        type="button"
        aria-label={`Add ${item.name} — drag onto the layout, or press to insert`}
        aria-grabbed={lifted}
        draggable={false}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40 focus-visible:ring-offset-1 active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0 || renaming) {
            return
          }
          origin.current = { x: event.clientX, y: event.clientY }
          dragging.current = false
          event.currentTarget.setPointerCapture(event.pointerId)
          event.preventDefault()
        }}
        onPointerMove={(event) => {
          if (!origin.current || renaming) {
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
              kind: item.root.kind,
              label: item.name,
              savedItemId: item.id,
              x: event.clientX,
              y: event.clientY,
            })
          }
        }}
        onPointerUp={(event) => {
          origin.current = null
          if (!dragging.current && !renaming) {
            onInsert(item.id)
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
      >
        <GripVertical
          className="size-4 shrink-0 text-[#98a2b3] group-hover:text-[#667085]"
          aria-hidden
        />
        <SavedItemGlyph root={item.root} />
        <span className="min-w-0 flex-1">
          {renaming ? (
            <input
              value={name}
              aria-label={`Rename ${item.name}`}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                renameSavedItem(item.id, name)
                setRenaming(false)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  renameSavedItem(item.id, name)
                  setRenaming(false)
                }
                if (event.key === "Escape") {
                  setName(item.name)
                  setRenaming(false)
                }
              }}
              className="w-full rounded-[4px] border border-[#84adff] px-1 py-0.5 font-[family-name:var(--font-inter)] text-sm text-[#101828] outline-none"
            />
          ) : (
            <>
              <span className="block truncate font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828]">
                {item.name}
              </span>
              {showHint ? (
                <span className="block truncate font-[family-name:var(--font-inter)] text-[11px] leading-4 text-[#98a2b3]">
                  {hint}
                </span>
              ) : null}
            </>
          )}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${item.name} options`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-[4px] text-[#98a2b3] outline-none hover:bg-white hover:text-[#344054] focus-visible:text-[#344054] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={12} className="min-w-44">
          <span
            className="block"
            title={
              replace.ok
                ? "Replace the selected block with this saved item"
                : replace.reason
            }
          >
            <DropdownMenuItem
              disabled={!replace.ok}
              aria-label={
                replace.ok
                  ? `Replace selected with ${item.name}`
                  : `Replace selected unavailable. ${replace.reason}`
              }
              className="flex-col items-start"
              onSelect={() => {
                if (replace.ok) {
                  replaceSelectedWithSavedItem(item.id)
                }
              }}
            >
              Replace selected
              {!replace.ok ? (
                <span className="text-[11px] font-normal text-[#98a2b3] whitespace-normal">
                  {replace.reason}
                </span>
              ) : null}
            </DropdownMenuItem>
          </span>
          <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateSavedItem(item.id)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => deleteSavedItem(item.id)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
