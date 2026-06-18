"use client"

import { useEffect, useState } from "react"
import { Check, Ruler, X } from "lucide-react"

import { Button } from "@/components/highrise/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getBuilderMediumPresets,
  getDefaultBuilderMediumId,
} from "@/lib/mediums-data"
import { cn } from "@/lib/utils"

const MEDIUM_PRESETS = getBuilderMediumPresets()

export type StartBlankMediumDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (mediumId: string) => void
}

/**
 * First step for "Start from blank" — pick the paper medium before opening the
 * builder empty state (Figma: compact medium picker ahead of 3268:37410).
 */
export function StartBlankMediumDialog({
  open,
  onOpenChange,
  onContinue,
}: StartBlankMediumDialogProps) {
  const [selectedMediumId, setSelectedMediumId] = useState(
    getDefaultBuilderMediumId()
  )

  useEffect(() => {
    if (open) {
      setSelectedMediumId(getDefaultBuilderMediumId())
    }
  }, [open])

  const handleContinue = () => {
    onContinue(selectedMediumId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="max-w-[400px] overflow-hidden p-0"
      >
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Ruler
                className="size-5 shrink-0 text-[#101828]"
                aria-hidden
              />
              <DialogTitle className="truncate text-base font-semibold leading-6 text-[#101828]">
                Select paper type
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              >
                <X className="size-5" aria-hidden />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="flex flex-col gap-1 p-4 pt-2">
          <div
            className="flex flex-col gap-1"
            role="radiogroup"
            aria-label="Paper type"
          >
            {MEDIUM_PRESETS.map((medium) => {
              const isActive = medium.id === selectedMediumId
              return (
                <button
                  key={medium.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelectedMediumId(medium.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                    isActive
                      ? "border-[#155eef] bg-[#eff4ff]"
                      : "border-[#eaecf0] bg-white hover:border-[#d0d5dd] hover:bg-[#f9fafb]"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#101828]">
                      {medium.name}
                    </p>
                    <p className="font-[family-name:var(--font-inter)] text-[13px] leading-[18px] text-[#667085]">
                      {medium.dimensions}
                    </p>
                  </div>
                  {isActive ? (
                    <Check className="size-4 shrink-0 text-[#155eef]" aria-hidden />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pb-3">
          <div className="h-px w-full bg-[#eaecf0]" aria-hidden />
          <div className="flex items-center justify-end gap-3 px-4 pt-3">
            <Button
              type="button"
              variant="neutral"
              className="h-8 px-2.5 py-1.5 text-base font-semibold leading-6"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-8 px-2.5 py-1.5 text-base font-semibold leading-6"
              onClick={handleContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
