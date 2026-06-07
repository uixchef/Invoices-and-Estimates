"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { InvoiceAiPanel } from "@/components/invoices/builder/invoice-ai-panel"
import { LayoutBuilderCanvas } from "@/components/invoices/builder/layout-builder-canvas"

/**
 * Figma: Layout Builder body (3181:33796 / 3137:145817)
 * Invoice AI sidebar + generation canvas.
 */
export function LayoutBuilderBody() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <div className="flex min-h-0 flex-1 items-stretch bg-[#eceef2]">
      {isPanelOpen ? (
        <div className="flex shrink-0 py-4 pl-4">
          <InvoiceAiPanel onClose={() => setIsPanelOpen(false)} />
        </div>
      ) : (
        <div className="flex shrink-0 items-start py-4 pl-4">
          <button
            type="button"
            aria-label="Open Invoice AI"
            onClick={() => setIsPanelOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-[8px] border border-[#d0d5dd] bg-white text-[#6938ef] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <Sparkles className="size-5" aria-hidden />
          </button>
        </div>
      )}

      <LayoutBuilderCanvas />
    </div>
  )
}
