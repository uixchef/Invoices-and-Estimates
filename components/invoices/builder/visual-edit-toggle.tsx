"use client"

import { MousePointerClick } from "lucide-react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

/**
 * Visual-edit entry used by the composer and the builder toolbar.
 * Same toggle: enter/exit edit mode, or close a blank-flow inspector that
 * opened without edit mode. Toolbar size matches Code / Preview (h-7, 16px icon).
 */
export function VisualEditToggle({
  size = "composer",
}: {
  size?: "composer" | "toolbar"
}) {
  const {
    status,
    messages,
    editMode,
    toggleEditMode,
    isCodeDetached,
    inspectingLayer,
    inspectLayer,
    placedElements,
  } = useLayoutBuilder()

  const hasGenerated =
    status === "ready" || messages.some((message) => message.role === "assistant")
  const showEditAction = hasGenerated || placedElements.length > 0
  const editActive = editMode || inspectingLayer !== null

  if (!showEditAction) {
    return null
  }

  const isToolbar = size === "toolbar"

  return (
    <button
      type="button"
      data-visual-edit-toggle=""
      aria-label="Edit"
      aria-pressed={editActive}
      onClick={() => {
        if (inspectingLayer !== null && !editMode) {
          inspectLayer(null)
        } else {
          toggleEditMode()
        }
      }}
      disabled={isCodeDetached}
      title={
        isCodeDetached
          ? "Revert to layout to use visual edits"
          : isToolbar && !editActive
            ? "Edit"
            : undefined
      }
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        isToolbar
          ? "h-7 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 [&_svg]:size-4 disabled:pointer-events-none disabled:text-[#d0d5dd]"
          : "h-6 gap-1 border px-1.5 text-xs font-semibold leading-[17px] [&_svg]:size-3.5 disabled:cursor-not-allowed disabled:border-[#f9fafb] disabled:bg-[#f2f4f7] disabled:text-[#d0d5dd]",
        isToolbar &&
          (editActive
            ? "gap-2 bg-[#ebe9fe] px-2.5 py-1.5 text-[#5925dc]"
            : "size-7 text-[#475467] hover:bg-[#f2f4f7] hover:text-[#101828]"),
        !isToolbar &&
          (editActive
            ? "border-[#f4f3ff] bg-[#ebe9fe] text-[#5925dc]"
            : "border-[#f9fafb] bg-[#f2f4f7] text-[#475467] hover:bg-[#eaecf0]")
      )}
    >
      <MousePointerClick aria-hidden />
      {isToolbar && !editActive ? null : "Edit"}
    </button>
  )
}
