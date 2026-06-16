"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { Copy, Pencil, Trash2, X } from "lucide-react"

import type { LayoutRow } from "@/lib/layouts-data"
import { useLayoutClone } from "@/lib/layout-clone-context"
import { useLayoutDelete } from "@/lib/layout-delete-context"
import { useLayoutPreview } from "@/lib/layout-preview-context"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import { layoutEditSeedFromRow } from "@/lib/layout-edit-seed"
import { getLayoutThumbnail } from "@/lib/layout-thumbnails"
import { useMediumsStore } from "@/lib/mediums-store"
import { Button } from "@/components/highrise/button"
import { cn } from "@/lib/utils"

function PreviewStatusTag({ status }: { status: LayoutRow["status"] }) {
  if (status === "Published") {
    return (
      <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[#ecfdf3] px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#027a48]">
        Published
      </span>
    )
  }

  return (
    <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[#f2f4f7] px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]">
      Draft
    </span>
  )
}

const TYPE_TAG_STYLES: Record<LayoutRow["type"], string> = {
  Invoice: "bg-[#eff4ff] text-[#004eeb]",
  Estimate: "bg-[#fffaeb] text-[#b54708]",
  Receipt: "bg-[#fef3f2] text-[#b42318]",
}

function PreviewTypeTag({ label }: { label: LayoutRow["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
        TYPE_TAG_STYLES[label]
      )}
    >
      {label}
    </span>
  )
}

/**
 * Figma: Preview · Side Panel (3175:35035).
 */
export function LayoutPreviewPanel() {
  const { layout, isOpen, close } = useLayoutPreview()
  const { cloneLayout } = useLayoutClone()
  const { requestDelete } = useLayoutDelete()
  const { requestLayoutEdit } = useCreateWithAi()
  const { getMediumName } = useMediumsStore()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, close])

  if (typeof document === "undefined") {
    return null
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex justify-end",
        "transition-[visibility] duration-300 motion-reduce:transition-none",
        isOpen ? "visible" : "invisible pointer-events-none"
      )}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close layout preview"
        onClick={close}
        className={cn(
          "absolute inset-0 bg-[#101828]/40 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={layout ? `Preview ${layout.name}` : "Layout preview"}
        className={cn(
          "relative flex h-full w-full max-w-[627px] flex-col bg-white shadow-[-8px_0_24px_rgba(16,24,40,0.08)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {layout ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <header className="mb-4 flex shrink-0 items-center gap-6">
              <div className="flex min-w-0 flex-1 items-center whitespace-nowrap">
                <h2 className="truncate font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#101828]">
                  {layout.name}
                </h2>
                <span
                  className="mx-1.5 shrink-0 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#475467]"
                  aria-hidden
                >
                  •
                </span>
                <p className="truncate font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
                  {getMediumName(layout.mediumId)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <p className="hidden font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467] whitespace-nowrap sm:block">
                  {layout.updatedOn}, {layout.updatedAgo}
                </p>
                <div className="flex items-center gap-1.5">
                  <PreviewStatusTag status={layout.status} />
                  <PreviewTypeTag label={layout.type} />
                </div>
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={close}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded text-[#475467] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </header>

            <div className="mb-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#eaecf0] bg-white">
              <div className="h-full overflow-y-auto overflow-x-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLayoutThumbnail(layout.id, layout.clonedFromId)}
                  alt={`Preview of ${layout.name}`}
                  className="block h-auto w-full"
                />
              </div>
            </div>

            <footer className="flex shrink-0 flex-col gap-3">
              <Button
                type="button"
                variant="primary"
                className="w-full px-2.5"
                onClick={() => {
                  if (!layout) {
                    return
                  }
                  close()
                  requestLayoutEdit(layoutEditSeedFromRow(layout))
                }}
              >
                <Pencil className="size-4 shrink-0" aria-hidden />
                Edit layout
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="neutral"
                  className="w-full flex-1 px-2.5"
                  onClick={() => layout && cloneLayout(layout)}
                >
                  <Copy className="size-4 shrink-0" aria-hidden />
                  Clone
                </Button>
                <Button
                  type="button"
                  variant="destructive-tertiary"
                  className="w-full flex-1 px-2.5"
                  onClick={() => layout && requestDelete(layout)}
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden />
                  Delete
                </Button>
              </div>
            </footer>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body
  )
}
