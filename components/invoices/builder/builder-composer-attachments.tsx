"use client"

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ImageIcon, Paperclip, Upload } from "lucide-react"

import {
  OverflowAttachmentTile,
  PromptAttachmentChip,
} from "@/components/invoices/prompt-attachment-chips"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BUILDER_ATTACHMENT_ACCEPT,
  BUILDER_ATTACHMENT_GAP_PX,
  BUILDER_ATTACHMENT_TILE_PX,
} from "@/lib/builder-attachments"
import type { PromptAttachment } from "@/lib/create-with-ai-types"
import {
  MEDIA_LIBRARY_UNAVAILABLE_MESSAGE,
  attachmentVisibleCapacity,
  resetFileInputValue,
} from "@/lib/prompt-attachments"
import { attachmentStripPreferPrimary } from "@/lib/reference-roles"
import { cn } from "@/lib/utils"

export function BuilderAttachMenu({
  disabled,
  onPickFiles,
  onMediaLibrary,
}: {
  disabled?: boolean
  onPickFiles: (files: File[]) => void
  onMediaLibrary: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={BUILDER_ATTACHMENT_ACCEPT}
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        data-builder-file-input
        onChange={(event) => {
          onPickFiles(Array.from(event.target.files ?? []))
          resetFileInputValue(event.target)
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Attach file"
            disabled={disabled}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-[4px] text-[#667085] outline-none transition-colors",
              "hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
              "disabled:cursor-not-allowed disabled:text-[#d0d5dd] disabled:hover:bg-transparent"
            )}
          >
            <Paperclip className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          <DropdownMenuItem
            className="gap-2.5 px-3 py-2"
            onSelect={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4 text-[#667085]" aria-hidden />
            <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
              Upload file
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2.5 px-3 py-2"
            onSelect={onMediaLibrary}
          >
            <ImageIcon className="size-4 text-[#667085]" aria-hidden />
            <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
              Add from media library
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export function BuilderAttachmentStrip({
  attachments,
  onRemove,
  primaryReferenceId = null,
  showReferenceRoles = false,
  onSetPrimary,
}: {
  attachments: PromptAttachment[]
  onRemove: (id: string) => void
  primaryReferenceId?: string | null
  showReferenceRoles?: boolean
  onSetPrimary?: (id: string) => void
}) {
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [visibleLimit, setVisibleLimit] = useState(0)

  useLayoutEffect(() => {
    const node = slotRef.current
    if (!node || typeof ResizeObserver === "undefined") {
      return
    }
    const update = () => {
      const next = attachmentVisibleCapacity(
        node.clientWidth,
        attachments.length,
        BUILDER_ATTACHMENT_TILE_PX,
        BUILDER_ATTACHMENT_GAP_PX
      )
      setVisibleLimit((current) => (current === next ? current : next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [attachments.length])

  if (attachments.length === 0) {
    return null
  }

  const strip = attachmentStripPreferPrimary(
    attachments,
    visibleLimit,
    showReferenceRoles ? primaryReferenceId : null
  )

  return (
    <div
      ref={slotRef}
      data-attachment-slot
      className="flex min-w-0 w-full flex-nowrap items-center overflow-hidden"
    >
      <div
        className="flex min-w-0 flex-nowrap items-center gap-1.5"
        role="list"
        aria-label="Attached files"
        data-attachment-count={attachments.length}
        data-overflow-count={strip.overflowCount}
        data-attachment-capacity={visibleLimit}
        data-primary-reference-id={primaryReferenceId ?? ""}
      >
        {strip.visible.map((attachment, index) => (
          <PromptAttachmentChip
            key={attachment.id}
            attachment={attachment}
            index={index}
            onRemove={onRemove}
            compact
            isPrimary={
              Boolean(showReferenceRoles) &&
              attachment.id === primaryReferenceId
            }
            showReferenceRoles={showReferenceRoles}
            onSetPrimary={showReferenceRoles ? onSetPrimary : undefined}
          />
        ))}
        <OverflowAttachmentTile
          count={strip.overflowCount}
          preview={strip.overflowPreview}
          attachments={attachments}
          onRemove={onRemove}
          compact
          primaryReferenceId={
            showReferenceRoles ? primaryReferenceId : null
          }
          showReferenceRoles={showReferenceRoles}
          onSetPrimary={showReferenceRoles ? onSetPrimary : undefined}
        />
      </div>
    </div>
  )
}

export function BuilderComposerDropTarget({
  children,
  className,
  disabled,
  onFiles,
  style,
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
  onFiles: (files: File[]) => void
  style?: CSSProperties
}) {
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const ingest = useCallback(
    (files: File[]) => {
      if (disabled || files.length === 0) {
        return
      }
      onFiles(files)
    },
    [disabled, onFiles]
  )

  return (
    <div
      className={cn(
        className,
        isDragging &&
          "border-[#9b8afb] shadow-[0_0_0_3px_rgba(155,138,251,0.28)]"
      )}
      style={style}
      onDragEnter={(event) => {
        if (disabled) {
          return
        }
        event.preventDefault()
        dragDepth.current += 1
        setIsDragging(true)
      }}
      onDragOver={(event) => {
        if (disabled) {
          return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) {
          setIsDragging(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth.current = 0
        setIsDragging(false)
        ingest(Array.from(event.dataTransfer.files ?? []))
      }}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData?.items ?? [])
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file))
        if (files.length > 0) {
          event.preventDefault()
          ingest(files)
        }
      }}
    >
      {children}
    </div>
  )
}

export { MEDIA_LIBRARY_UNAVAILABLE_MESSAGE }
