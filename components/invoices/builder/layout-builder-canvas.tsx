"use client"

import { GeneratingCarousel } from "@/components/invoices/builder/generating-carousel"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { useMediumsStore } from "@/lib/mediums-store"
import { cn } from "@/lib/utils"

/** Placeholder document surface shown once generation completes. */
function DocumentSurface() {
  const { documentType } = useLayoutBuilder()

  return (
    <div className="mx-auto flex aspect-[1/1.414] w-full max-w-[640px] flex-col gap-6 rounded-[4px] bg-white p-10 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-32 rounded bg-[#101828]/90" />
          <div className="h-3 w-40 rounded bg-[#eaecf0]" />
          <div className="h-3 w-28 rounded bg-[#eaecf0]" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-7 w-28 rounded bg-[#155eef]/15" />
          <div className="h-3 w-24 rounded bg-[#eaecf0]" />
        </div>
      </div>

      <div className="h-px w-full bg-[#eaecf0]" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 rounded bg-[#f2f4f7]" />
          <div className="h-3 w-16 rounded bg-[#f2f4f7]" />
          <div className="h-3 w-16 rounded bg-[#f2f4f7]" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-3 flex-1 rounded bg-[#eaecf0]" />
            <div className="h-3 w-16 rounded bg-[#eaecf0]" />
            <div className="h-3 w-16 rounded bg-[#eaecf0]" />
          </div>
        ))}
      </div>

      <div className="mt-auto flex justify-end">
        <div className="flex w-44 flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-[#eaecf0]" />
            <div className="h-3 w-12 rounded bg-[#eaecf0]" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-[#101828]/80" />
            <div className="h-4 w-14 rounded bg-[#101828]/80" />
          </div>
        </div>
      </div>

      <p className="sr-only">{documentType} layout preview placeholder</p>
    </div>
  )
}

export function LayoutBuilderCanvas() {
  const { status } = useLayoutBuilder()
  // Resolves medium context for future preview sizing; kept for parity with prompt selection.
  useMediumsStore()

  const isReady = status === "ready"

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center rounded-[12px] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]",
          isReady ? "overflow-auto bg-[#f9fafb] p-6" : "overflow-hidden bg-white"
        )}
      >
        {isReady ? <DocumentSurface /> : <GeneratingCarousel />}
      </div>
    </div>
  )
}
