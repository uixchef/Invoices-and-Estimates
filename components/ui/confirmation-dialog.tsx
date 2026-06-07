"use client"

import { useRef, type ReactNode } from "react"
import { X } from "lucide-react"

import { HLIcon } from "@/components/highrise/icon"
import { Button } from "@/components/highrise/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash01Icon } from "@gohighlevel/ghl-icons/24/outline"
import { cn } from "@/lib/utils"

export type ConfirmationDialogVariant = "warning" | "destructive" | "primary"

export type ConfirmationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  variant?: ConfirmationDialogVariant
  footerLayout?: "end"
  cancelVariant?: "neutral"
  icon?: ReactNode
  onConfirm: () => void
  onCancel?: () => void
}

const VARIANT_HEADER_ICON: Record<ConfirmationDialogVariant, string> = {
  warning: "text-[#dc6803]",
  destructive: "text-[#d92d20]",
  primary: "text-[#155eef]",
}

const VARIANT_CONFIRM_BUTTON: Record<
  ConfirmationDialogVariant,
  "warning" | "destructive" | "primary"
> = {
  warning: "warning",
  destructive: "destructive",
  primary: "primary",
}

const FOOTER_BUTTON_CLASS =
  "h-8 px-2.5 py-1.5 text-base font-semibold leading-6"

/**
 * Figma: Bulk Delete modal (9246:159411) — Header Lite + body + section footer.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  footerLayout = "end",
  cancelVariant = "neutral",
  icon,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const isConfirmingRef = useRef(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isConfirmingRef.current) {
      onCancel?.()
    }

    if (!nextOpen) {
      isConfirmingRef.current = false
    }

    onOpenChange(nextOpen)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    isConfirmingRef.current = true
    onConfirm()
    onOpenChange(false)
  }

  const headerIcon = icon ?? (
    <HLIcon
      className={cn("size-5 shrink-0", VARIANT_HEADER_ICON[variant])}
      decorative
    >
      <Trash01Icon />
    </HLIcon>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby="confirmation-dialog-description"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="overflow-hidden rounded-[8px] border-[#f2f4f7] p-0 shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08),0_8px_8px_-4px_rgba(16,24,40,0.03)]"
      >
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {headerIcon}
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
            id="confirmation-dialog-description"
            className="text-base font-normal leading-6 text-[#475467]"
            asChild
          >
            <div>{description}</div>
          </DialogDescription>
        </div>

        <div className="pb-3">
          <div className="h-px w-full bg-[#eaecf0]" aria-hidden />
          <div
            className={cn(
              "flex gap-2 px-4 pt-3",
              footerLayout === "end" && "justify-end"
            )}
          >
            <Button
              variant={cancelVariant}
              className={FOOTER_BUTTON_CLASS}
              onClick={handleCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={VARIANT_CONFIRM_BUTTON[variant]}
              className={FOOTER_BUTTON_CLASS}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
