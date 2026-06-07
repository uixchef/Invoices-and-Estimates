"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  ImageIcon,
  Paperclip,
  Ruler,
  Search,
  Upload,
  X,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import type { PromptAttachment } from "@/lib/create-with-ai-types"
import { useMediumsStore } from "@/lib/mediums-store"
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

type AiModel = {
  id: string
  name: string
  description: string
}

const AI_MODELS: AiModel[] = [
  {
    id: "sonnet-4-6",
    name: "Sonnet 4.6",
    description: "Most efficient for everyday tasks",
  },
  {
    id: "opus-4-6",
    name: "Opus 4.6",
    description: "Most capable for ambitious work",
  },
  {
    id: "gpt-5-4",
    name: "GPT 5.4",
    description: "Alternative AI model",
  },
]

const MEDIUM_PLACEHOLDER = "Medium"

function PromptAttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: PromptAttachment
  onRemove: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-2 rounded-md bg-[#f2f4f7] py-1 pl-1 pr-2",
        "font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]"
      )}
    >
      {attachment.usedForGeneration && attachment.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.previewUrl}
          alt=""
          className="size-6 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-white text-[#667085]">
          <FileText className="size-3.5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 truncate">{attachment.name}</span>
      <button
        type="button"
        aria-label={`Remove ${attachment.name}`}
        onClick={() => onRemove(attachment.id)}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#eaecf0] hover:text-[#344054] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

function PillButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 max-w-[220px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#d0d5dd] bg-white px-3.5 py-2",
        "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#344054]",
        "outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

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
 * Figma Prompt Input (3150:142530) — Default / Click × empty / filled,
 * with attachment, AI model, and medium dropdowns.
 */
export function CreateWithAiPromptInput({
  promptRef,
  value,
  onChange,
}: CreateWithAiPromptInputProps) {
  const { mediums } = useMediumsStore()
  const {
    attachments,
    addAttachments,
    removeAttachment,
    generateLayout,
  } = useCreateWithAi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
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
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [modelId, setModelId] = useState(AI_MODELS[0].id)
  const [selectedMediumId, setSelectedMediumId] = useState<string | null>(null)
  const [mediumQuery, setMediumQuery] = useState("")

  const normalizedQuery = mediumQuery.trim().toLowerCase()
  const filteredMediums = normalizedQuery
    ? mediums.filter(
        (medium) =>
          medium.name.toLowerCase().includes(normalizedQuery) ||
          medium.paper.toLowerCase().includes(normalizedQuery)
      )
    : mediums

  const hasReferenceImages = attachments.some(
    (attachment) => attachment.usedForGeneration
  )
  const isFilled = value.length > 0
  const canSubmit = value.trim().length > 0 || hasReferenceImages
  const showPlaceholder = !isFilled && attachments.length === 0

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    addAttachments(files)
    event.target.value = ""
  }

  const handleGenerate = () => {
    if (!canSubmit) {
      return
    }

    generateLayout({
      mediumId: selectedMediumId,
      modelId,
    })
  }

  const activeModel =
    AI_MODELS.find((model) => model.id === modelId) ?? AI_MODELS[0]
  const selectedMedium = selectedMediumId
    ? mediums.find((medium) => medium.id === selectedMediumId)
    : undefined

  useEffect(() => {
    if (!showPlaceholder) {
      return
    }

    const interval = window.setInterval(() => {
      setPlaceholderIndex(
        (index) => (index + 1) % PROMPT_PLACEHOLDER_SUGGESTIONS.length
      )
    }, PLACEHOLDER_ROTATE_MS)

    return () => window.clearInterval(interval)
  }, [showPlaceholder])

  useLayoutEffect(() => {
    syncTextareaHeight()
  }, [attachments.length, syncTextareaHeight, value])

  return (
    <div className="hero-prompt-slot w-full rounded-2xl shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]">
      <div
        className={cn(
          "prompt-bar flex flex-col gap-6 rounded-2xl border bg-white p-4 transition-[border-color,box-shadow] duration-150",
          isFocused
            ? "border-[#9b8afb] shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#d9d6fe]"
            : "border-[#bdb4fe] shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#ebe9fe]"
        )}
      >
        <label className="sr-only" htmlFor="create-with-ai-prompt">
          Describe your invoice layout
        </label>

        <div className="flex w-full flex-col gap-2">
          {attachments.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              role="list"
              aria-label="Attached files"
            >
              {attachments.map((attachment) => (
                <PromptAttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={removeAttachment}
                />
              ))}
            </div>
          ) : null}

          <div className="relative w-full">
            {showPlaceholder ? (
              <span
                key={placeholderIndex}
                aria-hidden
                className={cn(
                  "prompt-placeholder pointer-events-none absolute inset-0",
                  "font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#667085]"
                )}
              >
                {PROMPT_PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
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
            rows={1}
            className={cn(
              "relative min-h-[48px] w-full resize-none overflow-hidden border-0 bg-transparent p-0",
              "font-[family-name:var(--font-inter)] text-base font-normal leading-6 text-[#101828] outline-none",
              "caret-[#6938ef]"
            )}
          />
          </div>
        </div>

        <div className="prompt-bar__row flex items-center gap-2">
          <div className="prompt-bar__left flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={handleFilesSelected}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconCircleButton aria-label="Attach file">
                  <Paperclip className="size-5" aria-hidden />
                </IconCircleButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[220px] rounded-lg">
                <DropdownMenuItem
                  className="gap-2.5 px-3 py-2"
                  onSelect={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 text-[#667085]" aria-hidden />
                  <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
                    Upload file
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 px-3 py-2">
                  <ImageIcon className="size-4 text-[#667085]" aria-hidden />
                  <span className="font-[family-name:var(--font-inter)] text-sm font-semibold text-[#344054]">
                    Add from media library
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <PillButton aria-label="Select AI model">
                  <span className="truncate">{activeModel.name}</span>
                  <ChevronDown className="size-5 shrink-0 text-[#667085]" aria-hidden />
                </PillButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[300px] rounded-lg p-1.5">
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

            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) {
                  setMediumQuery("")
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <PillButton aria-label="Select medium">
                  <Ruler className="size-5 shrink-0 text-[#667085]" aria-hidden />
                  <span className="truncate">
                    {selectedMedium?.name ?? MEDIUM_PLACEHOLDER}
                  </span>
                  <ChevronDown className="size-5 shrink-0 text-[#667085]" aria-hidden />
                </PillButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-[360px] w-[280px] overflow-y-auto rounded-lg p-0"
              >
                <div className="sticky top-0 z-10 border-b border-[#eaecf0] bg-white p-2">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      value={mediumQuery}
                      onChange={(event) => setMediumQuery(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                      placeholder="Search mediums"
                      aria-label="Search mediums"
                      className="h-9 pl-8 font-[family-name:var(--font-inter)] text-sm leading-5"
                    />
                  </div>
                </div>

                <div className="p-1.5">
                  {filteredMediums.length > 0 ? (
                    filteredMediums.map((medium) => {
                      const isActive = medium.id === selectedMediumId
                      return (
                        <DropdownMenuItem
                          key={medium.id}
                          onSelect={() => setSelectedMediumId(medium.id)}
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
                              {medium.paper} · {medium.orientation} · {medium.resolution}
                            </span>
                          </div>
                          {isActive ? (
                            <Check className="size-4 shrink-0 text-[#6938ef]" aria-hidden />
                          ) : null}
                        </DropdownMenuItem>
                      )
                    })
                  ) : (
                    <p className="px-3 py-6 text-center font-[family-name:var(--font-inter)] text-sm text-[#667085]">
                      No mediums found
                    </p>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <span
            className="hero-prompt-counter flex shrink-0 items-center gap-0.5 p-0.5 font-[family-name:var(--font-inter)] text-[13px] leading-[18px] text-[#475467]"
            aria-live="polite"
          >
            <span>{value.length}</span>
            <span>/</span>
            <span>{PROMPT_MAX_LENGTH}</span>
          </span>

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
  )
}
