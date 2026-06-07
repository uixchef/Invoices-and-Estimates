"use client"

import { useRef, type ReactNode } from "react"
import { AlertTriangle, X } from "lucide-react"

import { Button } from "@/components/highrise/button"
import { HLIcon } from "@/components/highrise/icon"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  UNSAVED_CHANGES_DISCARD_LABEL,
  UNSAVED_CHANGES_SAVE_LABEL,
  UNSAVED_CHANGES_TITLE,
} from "@/lib/unsaved-changes-copy"

export type UnsavedChangesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description: ReactNode
  discardLabel?: string
  saveLabel?: string
  saveDisabled?: boolean
  onDiscard: () => void
  onSave: () => void
  onCancel?: () => void
}

const FOOTER_BUTTON_CLASS =
  "h-8 px-2.5 py-1.5 text-base font-semibold leading-6"

/**
 * Figma: Unsaved changes modal (Integrations HighRise 3603:98126)
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  title = UNSAVED_CHANGES_TITLE,
  description,
  discardLabel = UNSAVED_CHANGES_DISCARD_LABEL,
  saveLabel = UNSAVED_CHANGES_SAVE_LABEL,
  saveDisabled = false,
  onDiscard,
  onSave,
  onCancel,
}: UnsavedChangesDialogProps) {
  const isActionRef = useRef(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isActionRef.current) {
      onCancel?.()
    }

    if (!nextOpen) {
      isActionRef.current = false
    }

    onOpenChange(nextOpen)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleDiscard = () => {
    isActionRef.current = true
    onDiscard()
    onOpenChange(false)
  }

  const handleSave = () => {
    if (saveDisabled) {
      return
    }

    isActionRef.current = true
    onSave()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby="unsaved-changes-dialog-description"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="overflow-hidden rounded-[8px] border-[#f2f4f7] p-0 shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08),0_8px_8px_-4px_rgba(16,24,40,0.03)]"
      >
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <HLIcon className="size-6 shrink-0 text-[#dc6803]" decorative>
                <AlertTriangle />
              </HLIcon>
              <DialogTitle className="truncate text-base font-semibold leading-6 text-[#101828]">
                {title}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={handleCancel}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              >
                <X className="size-5" aria-hidden />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="p-4">
          <DialogDescription
            id="unsaved-changes-dialog-description"
            className="text-base font-normal leading-6 text-[#475467]"
            asChild
          >
            <div>{description}</div>
          </DialogDescription>
        </div>

        <div className="pb-3">
          <div className="h-px w-full bg-[#eaecf0]" aria-hidden />
          <div className="flex items-center gap-4 px-4 pt-3">
            <Button
              type="button"
              variant="warning-outline"
              className={FOOTER_BUTTON_CLASS}
              onClick={handleDiscard}
            >
              {discardLabel}
            </Button>
            <div className="flex min-w-0 flex-1 justify-end">
              <Button
                type="button"
                variant="warning"
                className={FOOTER_BUTTON_CLASS}
                disabled={saveDisabled}
                onClick={handleSave}
              >
                {saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
