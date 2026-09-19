"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ArrowUp,
  Check,
  ChevronDown,
  ImageIcon,
  Paperclip,
  Upload,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PaperTypePicker } from "@/components/invoices/paper-type-picker"
import {
  OverflowAttachmentTile,
  PromptAttachmentChip,
} from "@/components/invoices/prompt-attachment-chips"
import { AI_MODELS } from "@/lib/ai-models"
import {
  COMPOSER_MAX_HEIGHT_PX,
  COMPOSER_MOTION_MS,
  clampComposerHeight,
} from "@/lib/composer-height"
import {
  REFERENCE_COMPOSER_PLACEHOLDER,
  resolveComposerPlaceholder,
} from "@/lib/composer-copy"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import { useHubToast } from "@/components/payment-hub/hub-toast"
import { composerLeftControlsOrder } from "@/lib/composer-action-order"
import {
  attachmentVisibleCapacity,
  resetFileInputValue,
} from "@/lib/prompt-attachments"
import { MEDIA_LIBRARY_UNAVAILABLE_MESSAGE } from "@/lib/prompt-attachments"
import { attachmentStripPreferPrimary } from "@/lib/reference-roles"
import { prefersReducedMotion, shouldRunRepeatingMotion } from "@/lib/reduced-motion"
import { cn } from "@/lib/utils"

const PROMPT_MAX_LENGTH = 500

const PROMPT_PLACEHOLDER_SUGGESTIONS = [
  "Create a clean invoice layout with my logo, itemized services, taxes, discounts, and payment terms",
  "Design a modern invoice layout for a consulting business with service details, due date, and a thank-you note",
  "Generate a premium invoice layout with brand colors, payment summary, notes, and clear totals",
  "Create a simple invoice layout for a small business with itemized products, tax, discount, and balance due",
  "Build a professional invoice layout for monthly services with billing details, payment terms, and footer notes",
] as const

const PLACEHOLDER_ROTATE_MS = 3800

function IconCircleButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#d0d5dd] bg-white",
        "text-[#667085] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

type CreateWithAiPromptInputProps = {
  promptRef?: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
}

/**
 * Figma Prompt Input (3150:142530) — compact adaptive composer.
 */
export function CreateWithAiPromptInput({
  promptRef,
  value,
  onChange,
}: CreateWithAiPromptInputProps) {
  const {
    attachments,
    addAttachments,
    removeAttachment,
    primaryReferenceId,
    setPrimaryReferenceId,
    generateLayout,
    mediumId,
    setMediumId,
  } = useCreateWithAi()
  const { showError } = useHubToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [visibleLimit, setVisibleLimit] = useState(0)

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const current = textarea.offsetHeight
    textarea.style.height = "auto"
    const next = clampComposerHeight(textarea.scrollHeight)
    if (reduceMotion || current === next || current === 0) {
      textarea.style.height = `${next}px`
    } else {
      textarea.style.height = `${current}px`
      void textarea.offsetHeight
      textarea.style.height = `${next}px`
    }
    textarea.style.overflowY =
      textarea.scrollHeight > COMPOSER_MAX_HEIGHT_PX + 1 ? "auto" : "hidden"
  }, [])

  const assignTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node

      if (promptRef) {
        promptRef.current = node
      }

      if (node) {
        syncTextareaHeight()
      }
    },
    [promptRef, syncTextareaHeight]
  )

  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [modelId, setModelId] = useState(AI_MODELS[0].id)

  const hasReferenceImages = attachments.some(
    (attachment) => attachment.usedForGeneration
  )
  const isFilled = value.length > 0
  const canSubmit = value.trim().length > 0 || hasReferenceImages
  const referencePlaceholder = resolveComposerPlaceholder(hasReferenceImages)
  const showRotatingPlaceholder = !isFilled && !hasReferenceImages
  const showReferencePlaceholder = !isFilled && Boolean(referencePlaceholder)
  const dragDepth = useRef(0)

  const handleGenerate = useCallback(() => {
    if (!canSubmit) {
      return
    }

    generateLayout({
      mediumId,
      modelId,
    })
  }, [canSubmit, generateLayout, mediumId, modelId])

  const ingestFiles = useCallback(
    (files: File[]) => {
      addAttachments(files)
    },
    [addAttachments]
  )

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    ingestFiles(Array.from(event.target.files ?? []))
    resetFileInputValue(event.target)
  }

  useLayoutEffect(() => {
    const node = slotRef.current
    if (!node || typeof ResizeObserver === "undefined") {
      return
    }
    const update = () => {
      const next = attachmentVisibleCapacity(
        node.clientWidth,
        attachments.length
      )
      setVisibleLimit((current) => (current === next ? current : next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [attachments.length])

  const strip = attachmentStripPreferPrimary(
    attachments,
    visibleLimit,
    primaryReferenceId
  )
  const activeModel =
    AI_MODELS.find((model) => model.id === modelId) ?? AI_MODELS[0]

  useEffect(() => {
    if (!showRotatingPlaceholder) {
      return
    }
    if (!shouldRunRepeatingMotion(prefersReducedMotion())) {
      return
    }

    const interval = window.setInterval(() => {
      setPlaceholderIndex(
        (index) => (index + 1) % PROMPT_PLACEHOLDER_SUGGESTIONS.length
      )
    }, PLACEHOLDER_ROTATE_MS)

    return () => window.clearInterval(interval)
  }, [showRotatingPlaceholder])

  useLayoutEffect(() => {
    syncTextareaHeight()
  }, [attachments.length, syncTextareaHeight, value])

  return (
    <div className="hero-prompt-slot w-full rounded-2xl">
      <div
        className={cn(
          "prompt-bar flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-3 transition-[border-color,box-shadow] duration-150",
          isFocused
            ? "border-[rgba(124,58,237,0.7)] shadow-[0_0_0_4px_rgba(196,181,253,0.4),0_12px_32px_-12px_rgba(76,29,149,0.25),0_2px_6px_rgba(16,24,40,0.06)]"
            : "border-[#d0d5dd]/70 shadow-[0_12px_32px_-12px_rgba(76,29,149,0.18),0_2px_6px_rgba(16,24,40,0.04)]",
          isDragging &&
            "border-[rgba(124,58,237,0.85)] shadow-[0_0_0_4px_rgba(196,181,253,0.45)]"
        )}
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setIsDragging(true)
        }}
        onDragOver={(event) => {
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
          ingestFiles(Array.from(event.dataTransfer.files ?? []))
        }}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData?.items ?? [])
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file))
          if (files.length > 0) {
            event.preventDefault()
            ingestFiles(files)
          }
        }}
      >
        <label className="sr-only" htmlFor="create-with-ai-prompt">
          {hasReferenceImages
            ? "Describe what to preserve or change"
            : "Describe your invoice layout"}
        </label>

        <div className="relative w-full">
            {showRotatingPlaceholder ? (
              <span
                key={placeholderIndex}
                aria-hidden
                className={cn(
                  "prompt-placeholder pointer-events-none absolute inset-x-0 top-0 line-clamp-1",
                  "font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#667085]"
                )}
              >
                {PROMPT_PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
              </span>
            ) : null}
            {showReferencePlaceholder ? (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 line-clamp-1",
                  "font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#667085]"
                )}
              >
                {REFERENCE_COMPOSER_PLACEHOLDER}
              </span>
            ) : null}
            <textarea
              ref={assignTextareaRef}
              id="create-with-ai-prompt"
              value={value}
              onChange={(event) =>
                onChange(event.target.value.slice(0, PROMPT_MAX_LENGTH))
              }
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleGenerate()
                }
              }}
              rows={1}
              className={cn(
                "relative min-h-6 w-full resize-none border-0 bg-transparent p-0",
                "font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#101828] outline-none",
                "caret-[#6938ef] ease-out motion-reduce:transition-none"
              )}
              style={{
                transitionProperty: "height",
                transitionDuration: `${COMPOSER_MOTION_MS}ms`,
              }}
            />
        </div>

        <div className="prompt-bar__row flex flex-nowrap items-center gap-2 overflow-x-hidden">
          <div
            className="flex shrink-0 flex-nowrap items-center gap-2"
            data-composer-left-order={composerLeftControlsOrder().join(",")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="hidden"
              aria-hidden
              tabIndex={-1}
              data-composer-file-input
              onChange={handleFilesSelected}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconCircleButton aria-label="Attach file">
                  <Paperclip className="size-5" aria-hidden />
                </IconCircleButton>
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
                  onSelect={() => showError(MEDIA_LIBRARY_UNAVAILABLE_MESSAGE)}
                >
                  <ImageIcon className="size-4 text-[#667085]" aria-hidden />
                  <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
                    Add from media library
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <PaperTypePicker mediumId={mediumId} onChange={setMediumId} />
          </div>

          <div
            ref={slotRef}
            data-attachment-slot
            className="flex min-w-0 flex-1 flex-nowrap items-center overflow-hidden"
          >
            {attachments.length > 0 ? (
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
                    onRemove={removeAttachment}
                    isPrimary={attachment.id === primaryReferenceId}
                    showReferenceRoles
                    onSetPrimary={setPrimaryReferenceId}
                  />
                ))}
                <OverflowAttachmentTile
                  count={strip.overflowCount}
                  preview={strip.overflowPreview}
                  attachments={attachments}
                  onRemove={removeAttachment}
                  primaryReferenceId={primaryReferenceId}
                  showReferenceRoles
                  onSetPrimary={setPrimaryReferenceId}
                />
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Select AI model"
                  className={cn(
                    "inline-flex h-9 max-w-[9.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#d0d5dd] bg-white px-3",
                    "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#344054]",
                    "outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                  )}
                >
                  <span className="truncate">{activeModel.name}</span>
                  <ChevronDown className="size-4 shrink-0 text-[#667085]" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[300px]">
                {AI_MODELS.map((option) => {
                  const isActive = option.id === modelId
                  return (
                    <DropdownMenuItem
                      key={option.id}
                      onSelect={() => setModelId(option.id)}
                      className={cn(
                        "items-start gap-2 rounded-md px-3 py-2",
                        isActive && "bg-[#f4f3ff] focus:bg-[#f4f3ff]"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#101828]">
                          {option.name}
                        </span>
                        <span className="font-[family-name:var(--font-inter)] text-[13px] leading-[18px] text-[#667085]">
                          {option.description}
                        </span>
                      </div>
                      {isActive ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-[#6938ef]" aria-hidden />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              disabled={!canSubmit}
              aria-label="Generate layout"
              onClick={handleGenerate}
              className={cn(
                "prompt-send-button inline-flex size-9 shrink-0 items-center justify-center rounded-full border outline-none transition-colors",
                canSubmit
                  ? "border-[#6938ef] bg-[#6938ef] text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-[#5925dc] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                  : "cursor-not-allowed border-[#d9d6fe] bg-[#d9d6fe] text-white"
              )}
            >
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
