"use client"

import { Check, ChevronDown, Ruler } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getBuilderMediumPresets } from "@/lib/mediums-data"
import { cn } from "@/lib/utils"

const MEDIUM_PRESETS = getBuilderMediumPresets()

export function PaperTypePicker({
  mediumId,
  onChange,
  compact = false,
}: {
  mediumId: string
  onChange: (mediumId: string) => void
  compact?: boolean
}) {
  const selected = MEDIUM_PRESETS.find((medium) => medium.id === mediumId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select paper type"
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#d0d5dd] bg-white",
            "font-[family-name:var(--font-inter)] font-semibold text-[#344054]",
            "outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
            compact
              ? "h-9 max-w-[200px] px-3 text-sm leading-5"
              : "h-9 max-w-[220px] px-3.5 py-2 text-sm leading-5"
          )}
        >
          <Ruler className="size-5 shrink-0 text-[#667085]" aria-hidden />
          <span className="truncate">{selected?.name ?? "Paper type"}</span>
          <ChevronDown className="size-5 shrink-0 text-[#667085]" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {MEDIUM_PRESETS.map((medium) => {
          const isActive = medium.id === mediumId
          return (
            <DropdownMenuItem
              key={medium.id}
              onSelect={() => onChange(medium.id)}
              className={cn(
                "items-center gap-2 rounded-md px-3 py-2",
                isActive && "bg-[#f4f3ff] focus:bg-[#f4f3ff]"
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-[family-name:var(--font-inter)] text-sm font-semibold text-[#101828]">
                  {medium.name}
                </span>
                <span className="truncate font-[family-name:var(--font-inter)] text-[13px] leading-[18px] text-[#667085]">
                  {medium.dimensions}
                </span>
              </div>
              {isActive ? (
                <Check className="size-4 shrink-0 text-[#6938ef]" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
