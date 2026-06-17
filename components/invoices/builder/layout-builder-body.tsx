"use client"

import { useCallback, useRef } from "react"
import { GripVertical } from "lucide-react"

import { EditsOverlay } from "@/components/invoices/builder/edits-overlay"
import { InvoiceAiPanel } from "@/components/invoices/builder/invoice-ai-panel"
import { LayoutBuilderCanvas } from "@/components/invoices/builder/layout-builder-canvas"
import { useLayoutBuilder } from "@/lib/layout-builder-context"

const KEYBOARD_STEP = 16

/**
 * Figma: Layout Builder body (3181:33796 / 3137:145817)
 * Invoice AI sidebar + generation canvas, with a draggable grip handle
 * (drag_indicator, 3187:44827) for resizing the panel width. Panel width and
 * open state live in the builder context so the toolbar can stay aligned.
 */
export function LayoutBuilderBody() {
  const {
    panelOpen: isPanelOpen,
    setPanelOpen: setIsPanelOpen,
    panelWidth,
    setPanelWidth,
    panelMinWidth,
    panelMaxWidth,
  } = useLayoutBuilder()
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const clampWidth = (value: number) =>
    Math.min(panelMaxWidth, Math.max(panelMinWidth, value))

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragRef.current = { startX: event.clientX, startWidth: panelWidth }
      event.currentTarget.setPointerCapture(event.pointerId)
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
    },
    [panelWidth]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag) {
        return
      }
      setPanelWidth(clampWidth(drag.startWidth + (event.clientX - drag.startX)))
    },
    []
  )

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) {
        return
      }
      dragRef.current = null
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
        setPanelWidth((width) => clampWidth(width - KEYBOARD_STEP))
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        setPanelWidth((width) => clampWidth(width + KEYBOARD_STEP))
      }
    },
    []
  )

  return (
    <div className="flex min-h-0 flex-1 items-stretch bg-[#eceef2]">
      {isPanelOpen ? (
        <div className="relative flex shrink-0 py-4 pl-4">
          <InvoiceAiPanel
            width={panelWidth}
            onClose={() => setIsPanelOpen(false)}
          />

          {/* Figma: drag_indicator grip (3187:44827) sits on the panel/canvas
              seam, vertically centred, without consuming layout width. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Invoice AI panel"
            aria-valuenow={panelWidth}
            aria-valuemin={panelMinWidth}
            aria-valuemax={panelMaxWidth}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={handleKeyDown}
            className="group absolute top-1/2 right-0 z-20 flex h-12 w-4 -translate-y-1/2 translate-x-full cursor-col-resize touch-none items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <GripVertical
              className="size-6 text-[#98a2b3] transition-colors group-hover:text-[#475467] group-focus-visible:text-[#6938ef]"
              aria-hidden
            />
          </div>
        </div>
      ) : null}

      <LayoutBuilderCanvas />

      {/* Edits panel — floating overlay by default (portals out, leaving this
          slot empty so the canvas stays full width); docked it becomes a
          full-height right column and the canvas reflows (Figma 3181:33796). */}
      <EditsOverlay />
    </div>
  )
}
