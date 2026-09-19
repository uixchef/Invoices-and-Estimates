"use client"

import { savedItemGlyphKind, type SavedItemNode } from "@/lib/saved-items"
import { cn } from "@/lib/utils"

function Bars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn("flex h-4 w-5 items-stretch gap-px", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className="flex-1 rounded-[1px] bg-[#98a2b3]" />
      ))}
    </span>
  )
}

export function SavedItemGlyph({ root }: { root: SavedItemNode }) {
  const kind = savedItemGlyphKind(root)
  return (
    <span
      aria-hidden
      data-saved-glyph={kind}
      className="flex size-7 shrink-0 items-center justify-center rounded-[4px] bg-[#f2f4f7] text-[#667085]"
    >
      {kind.startsWith("columns-") ? (
        <Bars count={Number(kind.slice("columns-".length))} />
      ) : kind === "text" ? (
        <span className="flex w-4 flex-col gap-0.5">
          <span className="h-0.5 w-full rounded-full bg-[#98a2b3]" />
          <span className="h-0.5 w-3 rounded-full bg-[#d0d5dd]" />
          <span className="h-0.5 w-3.5 rounded-full bg-[#d0d5dd]" />
        </span>
      ) : kind === "button" ? (
        <span className="h-2.5 w-4 rounded-[3px] border border-[#98a2b3] bg-white" />
      ) : kind === "image" ? (
        <span className="relative h-3.5 w-4 overflow-hidden rounded-[2px] border border-[#98a2b3]">
          <span className="absolute bottom-0.5 left-0.5 size-1 rounded-full bg-[#d0d5dd]" />
          <span className="absolute bottom-0.5 right-0 h-1.5 w-2.5 bg-[#d0d5dd] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
        </span>
      ) : kind === "table" ? (
        <span className="grid h-3.5 w-4 grid-cols-2 grid-rows-2 gap-px rounded-[1px] bg-[#d0d5dd]">
          <span className="bg-[#98a2b3]" />
          <span className="bg-[#f2f4f7]" />
          <span className="bg-[#f2f4f7]" />
          <span className="bg-[#98a2b3]" />
        </span>
      ) : (
        <span className="flex h-3.5 w-4 flex-col gap-px rounded-[2px] border border-[#98a2b3] p-px">
          <span className="h-1 rounded-[1px] bg-[#d0d5dd]" />
          <span className="flex flex-1 gap-px">
            <span className="flex-1 rounded-[1px] bg-[#eaecf0]" />
            <span className="flex-1 rounded-[1px] bg-[#eaecf0]" />
          </span>
        </span>
      )}
    </span>
  )
}
