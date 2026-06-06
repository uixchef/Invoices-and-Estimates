"use client"

import { MediumPreviewStage } from "@/components/invoices/mediums/medium-preview-stage"
import type { MediumFormState } from "@/lib/medium-form"
import { getMediumPreviewMetrics } from "@/lib/medium-form"

function PreviewStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-[#eaecf0] px-4 py-4">
      <span className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#101828]">
        {value}
      </span>
    </div>
  )
}

export function MediumLivePreview({ state }: { state: MediumFormState }) {
  const metrics = getMediumPreviewMetrics(state)

  return (
    <aside className="mx-auto grid w-full max-w-[624px] grid-rows-[auto_minmax(360px,1fr)_auto] overflow-hidden rounded border border-[#d0d5dd] bg-white min-[1360px]:mx-0 min-[1360px]:h-full min-[1360px]:w-[624px] min-[1360px]:shrink-0">
      <div className="border-b border-[#d0d5dd] px-4 py-3">
        <h3 className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
          Live preview
        </h3>
      </div>

      <MediumPreviewStage
        state={state}
        className="min-h-[360px] h-full"
        contentClassName="p-6"
      />

      <div className="min-h-0 overflow-y-auto">
        <div className="flex flex-col items-center gap-2.5 border-t border-[#eaecf0] px-4 py-4 text-center">
          <p className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            {metrics.title}
          </p>
          <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
            {metrics.dimensions}
          </p>
        </div>

        <PreviewStatRow label="Resolution" value={metrics.resolution} />
        <PreviewStatRow label="Safe area" value={metrics.safeArea} />
        <PreviewStatRow label="Aspect" value={metrics.aspect} />
        <PreviewStatRow label="Printable area" value={metrics.printableArea} />
      </div>
    </aside>
  )
}
