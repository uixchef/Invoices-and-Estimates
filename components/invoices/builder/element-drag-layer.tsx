"use client"

import { useEffect } from "react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { blankCanvasDropCopy, leftPanelMode } from "@/lib/builder-left-panel"
import {
  destKey,
  pickDropSlot,
  canNestInside,
  type DropDest,
  type SlotBox,
} from "@/lib/placed-tree"
import { cn } from "@/lib/utils"

export function DropSlot({
  dest,
  variant = "seam",
  label,
}: {
  dest: DropDest
  variant?: "seam" | "fill" | "tail" | "region"
  label?: string
}) {
  const { elementDrag, addingElement, browsingSavedItems, browsingBrand, browsingVersionHistory, panelOpen } =
    useLayoutBuilder()
  const key = destKey(dest)
  const active = elementDrag?.hoverKey === key
  const dragging = Boolean(elementDrag)
  const dropCopy = blankCanvasDropCopy(
    leftPanelMode({
      panelOpen,
      addingElement,
      browsingSavedItems,
      browsingBrand,
      browsingVersionHistory,
    })
  )

  return (
    <div
      data-drop-slot
      data-slot-key={key}
      data-dest={JSON.stringify(dest)}
      data-drop-active={active ? "true" : undefined}
      aria-hidden
      className={cn(
        "relative flex w-full items-center justify-center",
        variant === "fill" &&
          "min-h-[320px] flex-1 flex-col gap-3 rounded-[8px] border border-dashed p-8 text-center",
        variant === "fill" &&
          (active ? "border-[#2970ff] bg-[#eff8ff]" : "border-[#d0d5dd]"),
        variant === "tail" && "min-h-[72px] flex-1 flex-col pt-1.5",
        variant === "region" && "min-h-[64px] flex-1 rounded-[6px] border border-dashed",
        variant === "region" &&
          (active ? "border-[#2970ff] bg-[#eff8ff]" : dragging ? "border-[#d0d5dd]" : "border-transparent"),
        variant === "seam" && (dragging || active ? "min-h-10 py-1.5" : "-my-1 h-5")
      )}
    >
      <div
        className={cn(
          "flex w-full items-center transition-opacity duration-150 motion-reduce:transition-none",
          active
            ? "opacity-100"
            : dragging && variant === "seam"
              ? "opacity-40"
              : "h-0 opacity-0"
        )}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            active ? "bg-[#2970ff]" : "bg-[#98a2b3]"
          )}
        />
        <span
          className={cn(
            "flex-1 rounded-full",
            active ? "h-[3px] bg-[#2970ff]" : "h-px bg-[#d0d5dd]"
          )}
        />
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            active ? "bg-[#2970ff]" : "bg-[#98a2b3]"
          )}
        />
      </div>
      {variant === "fill" ? (
        <>
          <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
            {dropCopy.title}
          </p>
          <p className="font-[family-name:var(--font-inter)] text-xs leading-[18px] text-[#98a2b3]">
            {dropCopy.body}
          </p>
        </>
      ) : null}
      {variant === "region" && !active && dragging ? (
        <p className="font-[family-name:var(--font-inter)] text-xs text-[#98a2b3]">
          {label ?? "Drop here"}
        </p>
      ) : null}
    </div>
  )
}

export function ElementDragLayer() {
  const {
    elementDrag,
    updateElementDragPointer,
    commitElementDrag,
    cancelElementDrag,
  } = useLayoutBuilder()

  useEffect(() => {
    if (!elementDrag) {
      return
    }
    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"

    const onMove = (event: PointerEvent) => {
      const drag = elementDrag
      const slots: SlotBox[] = [...document.querySelectorAll("[data-drop-slot]")].flatMap(
        (node) => {
          if (!(node instanceof HTMLElement)) {
            return []
          }
          const key = node.dataset.slotKey
          const raw = node.dataset.dest
          if (!key || !raw) {
            return []
          }
          try {
            const dest = JSON.parse(raw) as DropDest
            if (dest.kind === "child") {
              if (drag?.elementId && dest.parentId === drag.elementId) {
                return []
              }
              if (!canNestInside(drag?.kind ?? "", dest.parentKind)) {
                return []
              }
            }
            const rect = node.getBoundingClientRect()
            return [{ key, dest, rect }]
          } catch {
            return []
          }
        }
      )
      const paperNode = document.querySelector("[data-document-paper]")
      const paper = paperNode?.getBoundingClientRect() ?? null
      const picked = pickDropSlot(event.clientX, event.clientY, slots, paper)
      updateElementDragPointer({
        x: event.clientX,
        y: event.clientY,
        hoverKey: picked?.key ?? null,
        dest: picked?.dest ?? null,
        overPaper: Boolean(paper && picked),
      })

      const scroller = paperNode?.closest("[data-canvas-scroll], .overflow-auto")
      if (scroller instanceof HTMLElement) {
        const box = scroller.getBoundingClientRect()
        if (event.clientY < box.top + 56) {
          scroller.scrollTop -= 18
        } else if (event.clientY > box.bottom - 56) {
          scroller.scrollTop += 18
        }
      }
    }

    const onUp = () => {
      commitElementDrag()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        cancelElementDrag()
      }
    }

    window.addEventListener("pointermove", onMove, { capture: true })
    window.addEventListener("pointerup", onUp, { capture: true })
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = ""
      window.removeEventListener("pointermove", onMove, { capture: true })
      window.removeEventListener("pointerup", onUp, { capture: true })
      window.removeEventListener("keydown", onKey)
    }
  }, [elementDrag ? "dragging" : "idle", updateElementDragPointer, commitElementDrag, cancelElementDrag])

  if (!elementDrag) {
    return null
  }

  return (
    <div
      aria-hidden
      data-drag-ghost
      className={cn(
        "pointer-events-none fixed z-[90] min-w-[148px] rounded-[8px] border bg-white px-3 py-2 font-[family-name:var(--font-inter)] text-sm font-medium text-[#101828] shadow-[0_12px_24px_-4px_rgba(16,24,40,0.18)]",
        elementDrag.dest
          ? "border-[#2970ff] bg-[#eff8ff]"
          : "border-[#d0d5dd] opacity-90"
      )}
      style={{
        left: elementDrag.x + 16,
        top: elementDrag.y + 16,
      }}
    >
      {elementDrag.label}
      <span className="mt-0.5 block text-[11px] font-normal text-[#667085]">
        {elementDrag.dest
          ? "Release to insert"
          : elementDrag.overPaper
            ? "Release to insert"
            : "Drop on the invoice"}
      </span>
    </div>
  )
}
