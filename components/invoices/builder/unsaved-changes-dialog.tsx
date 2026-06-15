"use client"

import { TriangleAlert, X } from "lucide-react"

import { Button } from "@/components/highrise/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

export type UnsavedChangesDialogProps = {
  open: boolean
  /** Fired when the dialog is dismissed without choosing Save/Discard (X, Esc,
   *  or overlay) — the user stays in the builder. */
  onOpenChange: (open: boolean) => void
  /** Save the layout, then leave. */
  onSave: () => void
  /** Leave without saving. */
  onDiscard: () => void
}

/**
 * Unsaved-changes guard shown when leaving the builder with pending edits
 * (Figma 3821:40716). Three outcomes: Save changes (save + leave), Discard
 * (leave without saving), or dismiss (X / Esc / overlay) to stay. Mirrors the
 * ConfirmationDialog chrome, but with a split footer and a stay-on-dismiss
 * model that the binary confirm/cancel dialog can't express.
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="unsaved-changes-description"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="overflow-hidden p-0"
      >
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TriangleAlert
                className="size-6 shrink-0 text-[#dc6803]"
                strokeWidth={2}
                aria-hidden
              />
              <DialogTitle className="truncate text-base font-semibold leading-6 text-[#101828]">
                Unsaved changes?
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

        <div className="p-4">
          <DialogDescription
            id="unsaved-changes-description"
            className="text-base font-normal leading-6 text-[#475467]"
          >
            You have unsaved changes. Save them before leaving builder, or
            discard them to continue without saving.
          </DialogDescription>
        </div>

        <div className="pb-3">
          <div className="h-px w-full bg-[#eaecf0]" aria-hidden />
          <div className="flex items-center justify-between gap-4 px-4 pt-3">
            <Button
              variant="warning-outline"
              className="h-8 px-2.5 py-1.5 text-base font-semibold leading-6"
              onClick={onDiscard}
            >
              Discard
            </Button>
            <Button
              variant="warning"
              className="h-8 px-2.5 py-1.5 text-base font-semibold leading-6"
              onClick={onSave}
            >
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
