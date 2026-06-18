import { MousePointerClick } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Edits empty state (Figma 3249:58583). Shown when visual-edit mode is active
 * but no element is selected yet — in the left AI panel and the floating overlay.
 */
export function EditsEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-4 text-center",
        className
      )}
    >
      <MousePointerClick className="size-8 text-[#344054]" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#101828]">
          Select elements to edit and style visually
        </p>
        <p className="font-[family-name:var(--font-inter)] text-xs font-normal leading-[17px] text-[#475467]">
          Hold cmd to select multiple elements
        </p>
      </div>
    </div>
  )
}
