"use client"

import { useCallback, useRef, useState } from "react"
import { GripVertical } from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { InvoiceAiPanel } from "@/components/invoices/builder/invoice-ai-panel"
import { LayoutBuilderCanvas } from "@/components/invoices/builder/layout-builder-canvas"

const MIN_PANEL_WIDTH = 320
const MAX_PANEL_WIDTH = 640
const DEFAULT_PANEL_WIDTH = 360
const KEYBOARD_STEP = 16

/**
 * Figma: Layout Builder body (3181:33796 / 3137:145817)
 * Invoice AI sidebar + generation canvas, with a draggable grip handle
 * (drag_indicator, 3187:44827) for resizing the panel width.
 */
export function LayoutBuilderBody() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const clampWidth = (value: number) =>
    Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value))

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
        <>
          <div className="flex shrink-0 py-4 pl-4">
            <InvoiceAiPanel
              width={panelWidth}
              onClose={() => setIsPanelOpen(false)}
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Invoice AI panel"
            aria-valuenow={panelWidth}
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuemax={MAX_PANEL_WIDTH}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={handleKeyDown}
            className="group relative flex w-4 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none"
          >
            <span className="pointer-events-none flex h-8 w-4 items-center justify-center rounded text-[#98a2b3] transition-colors group-hover:text-[#475467] group-focus-visible:text-[#6938ef]">
              <GripVertical className="size-5" aria-hidden />
            </span>
          </div>
        </>
      ) : (
        <div className="flex shrink-0 items-start py-4 pl-4">
          <button
            type="button"
            aria-label="Open Invoice AI"
            onClick={() => setIsPanelOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-[8px] border border-[#d0d5dd] bg-white text-[#6938ef] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <AutoAwesomeIcon className="size-5" />
          </button>
        </div>
      )}

      <LayoutBuilderCanvas />
    </div>
  )
}
