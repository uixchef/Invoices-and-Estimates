"use client"

import { useEffect, useState } from "react"
import { FileText, X } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { PromptAttachment } from "@/lib/create-with-ai-types"
import type { BuilderSubmittedAttachment } from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

function removeLabelFor(attachment: PromptAttachment, index: number) {
  if (attachment.usedForGeneration) {
    return `Remove reference image ${index + 1}`
  }
  return `Remove ${attachment.name}`
}

export function PromptAttachmentChip({
  attachment,
  index,
  onRemove,
  compact = false,
  isPrimary = false,
  showReferenceRoles = false,
  onSetPrimary,
}: {
  attachment: PromptAttachment
  index: number
  onRemove: (id: string) => void
  compact?: boolean
  isPrimary?: boolean
  showReferenceRoles?: boolean
  onSetPrimary?: (id: string) => void
}) {
  const removeLabel = removeLabelFor(attachment, index)
  const sizeClass = compact ? "size-8" : "size-9"
  const canBecomePrimary =
    showReferenceRoles &&
    attachment.usedForGeneration &&
    Boolean(onSetPrimary) &&
    !isPrimary

  if (attachment.usedForGeneration && attachment.previewUrl) {
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.previewUrl}
        alt=""
        className="size-full object-cover"
      />
    )
    return (
      <div
        role="listitem"
        data-attachment-id={attachment.id}
        data-primary-reference={
          isPrimary && showReferenceRoles ? "true" : undefined
        }
        title={
          isPrimary && showReferenceRoles
            ? `Primary reference: ${attachment.name}`
            : attachment.name
        }
        className={cn(
          "group relative shrink-0 overflow-hidden rounded-md bg-[#f2f4f7]",
          sizeClass,
          isPrimary && showReferenceRoles && "ring-2 ring-[#155eef] ring-offset-1",
          "motion-safe:animate-[composer-chip-in_160ms_ease-out]"
        )}
      >
        {canBecomePrimary ? (
          <button
            type="button"
            aria-label={`Use ${attachment.name} as primary reference`}
            onClick={() => onSetPrimary?.(attachment.id)}
            className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/80"
          >
            {image}
          </button>
        ) : (
          image
        )}
        {isPrimary && showReferenceRoles ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-0.5 py-px text-center font-[family-name:var(--font-inter)] text-[8px] font-semibold leading-3 text-white">
            Primary
          </span>
        ) : null}
        {isPrimary ? (
          <span className="sr-only">{`Primary reference: ${attachment.name}`}</span>
        ) : null}
        <button
          type="button"
          aria-label={removeLabel}
          onClick={() => onRemove(attachment.id)}
          className={cn(
            "absolute right-0 top-0 z-[1] inline-flex items-center justify-center rounded-full bg-black/55 text-white outline-none",
            compact ? "size-3.5" : "size-4",
            "pointer-events-none opacity-0 transition-opacity duration-150 hover:bg-black/75",
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
            "focus-visible:pointer-events-auto focus-visible:opacity-100",
            "focus-visible:ring-2 focus-visible:ring-white",
            "motion-reduce:transition-none",
            "[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
          )}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div
      role="listitem"
      data-attachment-id={attachment.id}
      className={cn(
        "inline-flex h-9 max-w-[9.5rem] items-center gap-1.5 rounded-md bg-[#f2f4f7] py-1 pl-1 pr-1.5",
        compact && "h-8 max-w-[7.5rem] text-xs",
        "font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]",
        "motion-safe:animate-[composer-chip-in_160ms_ease-out]"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-white text-[#667085]">
        <FileText className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 truncate">{attachment.name}</span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={() => onRemove(attachment.id)}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#eaecf0] hover:text-[#344054] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function OverflowAttachmentTile({
  count,
  preview,
  attachments,
  onRemove,
  compact = false,
  primaryReferenceId = null,
  showReferenceRoles = false,
  onSetPrimary,
}: {
  count: number
  preview: PromptAttachment | null
  attachments: PromptAttachment[]
  onRemove: (id: string) => void
  compact?: boolean
  primaryReferenceId?: string | null
  showReferenceRoles?: boolean
  onSetPrimary?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (count <= 0) {
      setOpen(false)
    }
  }, [count])

  if (count <= 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-attachment-overflow
          aria-label={
            showReferenceRoles &&
            primaryReferenceId &&
            attachments.some((attachment) => attachment.id === primaryReferenceId)
              ? `${count} more attachments. Primary reference is marked.`
              : `${count} more attachments`
          }
          aria-expanded={open}
          className={cn(
            compact ? "size-8" : "size-9",
            "relative shrink-0 overflow-hidden rounded-md bg-[#101828] outline-none",
            "motion-safe:animate-[composer-chip-in_160ms_ease-out]",
            "focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          )}
        >
          {preview?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.previewUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : null}
          <span className="absolute inset-0 bg-black/55" aria-hidden />
          <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-inter)] text-xs font-semibold leading-4 text-white">
            +{count}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[220px] p-2 motion-safe:duration-150"
        onEscapeKeyDown={() => setOpen(false)}
      >
        <p className="px-1 pb-2 font-[family-name:var(--font-inter)] text-xs font-medium text-[#667085]">
          {attachments.length} attachments
        </p>
        <div
          role="list"
          aria-label="All attached files"
          className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto"
        >
          {attachments.map((attachment, index) => (
            <PromptAttachmentChip
              key={attachment.id}
              attachment={attachment}
              index={index}
              onRemove={onRemove}
              compact
              isPrimary={attachment.id === primaryReferenceId}
              showReferenceRoles={showReferenceRoles}
              onSetPrimary={onSetPrimary}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SubmittedAttachmentChip({
  attachment,
  isPrimary = false,
}: {
  attachment: BuilderSubmittedAttachment
  isPrimary?: boolean
}) {
  if (attachment.kind === "image" && attachment.previewUrl) {
    return (
      <span
        className="relative inline-flex"
        title={
          isPrimary
            ? `Primary reference: ${attachment.name}`
            : attachment.name
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={attachment.id}
          src={attachment.previewUrl}
          alt={
            isPrimary
              ? `Primary reference: ${attachment.name}`
              : attachment.name
          }
          className={cn(
            "size-12 rounded-md border object-cover",
            isPrimary ? "border-[#155eef]" : "border-[#eaecf0]"
          )}
        />
        {isPrimary ? (
          <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 px-0.5 py-px text-center font-[family-name:var(--font-inter)] text-[8px] font-semibold text-white">
            Primary
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span
      title={attachment.name}
      className="inline-flex h-8 max-w-[9rem] items-center gap-1 rounded-md border border-[#eaecf0] bg-[#fcfcfd] px-1.5 font-[family-name:var(--font-inter)] text-xs font-medium text-[#344054]"
    >
      <FileText className="size-3.5 shrink-0 text-[#667085]" aria-hidden />
      <span className="min-w-0 truncate">{attachment.name}</span>
    </span>
  )
}
