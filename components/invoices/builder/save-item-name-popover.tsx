"use client"

import { useEffect, useRef, useState } from "react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { placeSavePopover } from "@/lib/saved-items"

export function SaveItemNamePopover() {
  const { saveItemDraft, confirmSaveItem, cancelSaveItem } = useLayoutBuilder()
  const [name, setName] = useState("")
  const panelRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveItemDraft) {
      setName(saveItemDraft.defaultName)
    }
  }, [saveItemDraft])

  useEffect(() => {
    if (!saveItemDraft) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (panelRef.current?.contains(target)) {
        return
      }
      if (target instanceof Element && target.closest("[data-save-item-trigger]")) {
        return
      }
      cancelSaveItem()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        cancelSaveItem()
      }
    }
    window.addEventListener("pointerdown", onPointerDown, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [saveItemDraft, cancelSaveItem])

  if (!saveItemDraft) {
    return null
  }

  const position = saveItemDraft.anchor
    ? placeSavePopover(saveItemDraft.anchor, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
    : { top: 16, left: Math.max(16, window.innerWidth / 2 - 140), width: 280 }

  return (
    <form
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Name saved item"
      data-save-item-name
      className="fixed z-[100] flex items-center gap-1.5 rounded-[8px] border border-[#d0d5dd] bg-white p-1.5 shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]"
      style={{ top: position.top, left: position.left, width: position.width }}
      onSubmit={(event) => {
        event.preventDefault()
        confirmSaveItem(name)
      }}
    >
      <label className="sr-only" htmlFor="saved-item-name">
        Saved item name
      </label>
      <input
        ref={inputRef}
        id="saved-item-name"
        value={name}
        aria-label="Saved item name"
        onChange={(event) => setName(event.target.value)}
        className="min-w-0 flex-1 rounded-[6px] border border-[#d0d5dd] px-2 py-1 font-[family-name:var(--font-inter)] text-sm text-[#101828] outline-none focus:border-[#84adff] focus:ring-2 focus:ring-[#155eef]/30"
      />
      <button
        type="submit"
        className="rounded-[6px] bg-[#155eef] px-2.5 py-1 font-[family-name:var(--font-inter)] text-sm font-semibold text-white outline-none hover:bg-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
      >
        Save
      </button>
    </form>
  )
}
