import type { PromptAttachment } from "@/lib/create-with-ai-types"
import { composerLeftControlsOrder } from "@/lib/composer-action-order"
import { resolveComposerPlaceholder, resolveGenerationPrompt } from "@/lib/composer-copy"

export const MAX_ATTACHMENTS = 20
export const ATTACHMENT_CAP_MESSAGE = "Up to 20 attachments can be added."
export const ATTACHMENT_UNSUPPORTED_MESSAGE =
  "Some files couldn’t be attached. Use JPG, PNG, WebP, GIF, or PDF."
export const MEDIA_LIBRARY_UNAVAILABLE_MESSAGE =
  "Media library isn't available yet"
/** Matches `size-9` composer thumbnails. */
export const ATTACHMENT_TILE_PX = 36
/** Matches `gap-1.5` in the attachment strip. */
export const ATTACHMENT_GAP_PX = 6

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const ATTACHABLE_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  "application/pdf",
])

let attachmentSeq = 0

export function resetAttachmentIdCounterForTests() {
  attachmentSeq = 0
}

export function nextAttachmentId(): string {
  attachmentSeq += 1
  return `att-${attachmentSeq}`
}

export function isImageAttachmentFile(file: File): boolean {
  return IMAGE_MIME_TYPES.has(file.type)
}

export function isAttachableFile(file: File): boolean {
  if (ATTACHABLE_MIME_TYPES.has(file.type)) {
    return true
  }
  const name = file.name.toLowerCase()
  return /\.(jpe?g|png|webp|gif|pdf)$/.test(name)
}

export function createAttachment(
  file: File,
  previewUrl = ""
): PromptAttachment {
  const usedForGeneration = isImageAttachmentFile(file)
  return {
    id: nextAttachmentId(),
    file,
    previewUrl,
    name: file.name,
    mimeType: file.type,
    usedForGeneration,
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function revokePreviewUrl(url: string | undefined | null) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

export function revokeAttachmentUrls(attachments: PromptAttachment[]) {
  for (const attachment of attachments) {
    revokePreviewUrl(attachment.previewUrl)
  }
}

export function imagePreviewForAttachment(
  file: File,
  attachment: PromptAttachment
): string {
  if (
    attachment.usedForGeneration &&
    typeof URL.createObjectURL === "function"
  ) {
    return URL.createObjectURL(file)
  }
  return attachment.previewUrl
}

export function attachmentFeedbackMessages(
  result: AppendAttachmentsResult
): string[] {
  const messages: string[] = []
  if (result.rejected.length > 0) {
    messages.push(ATTACHMENT_UNSUPPORTED_MESSAGE)
  }
  if (result.truncated.length > 0) {
    messages.push(ATTACHMENT_CAP_MESSAGE)
  }
  return messages
}

export type AppendAttachmentsResult = {
  next: PromptAttachment[]
  added: PromptAttachment[]
  rejected: File[]
  truncated: File[]
}

export function appendAttachments(
  current: PromptAttachment[],
  files: File[],
  previewFor?: (file: File, attachment: PromptAttachment) => string
): AppendAttachmentsResult {
  const rejected: File[] = []
  const accepted: File[] = []
  for (const file of files) {
    if (isAttachableFile(file)) {
      accepted.push(file)
    } else {
      rejected.push(file)
    }
  }

  const remaining = Math.max(0, MAX_ATTACHMENTS - current.length)
  const toAdd = accepted.slice(0, remaining)
  const truncated = accepted.slice(remaining)
  const added = toAdd.map((file) => {
    const attachment = createAttachment(file)
    const previewUrl = previewFor?.(file, attachment) ?? attachment.previewUrl
    return previewUrl ? { ...attachment, previewUrl } : attachment
  })

  return {
    next: [...current, ...added],
    added,
    rejected,
    truncated,
  }
}

export function removeAttachmentById(
  current: PromptAttachment[],
  id: string
): { next: PromptAttachment[]; removed: PromptAttachment | undefined } {
  const removed = current.find((attachment) => attachment.id === id)
  return {
    next: current.filter((attachment) => attachment.id !== id),
    removed,
  }
}

export type AttachmentStrip = {
  visible: PromptAttachment[]
  overflow: PromptAttachment[]
  overflowPreview: PromptAttachment | null
  overflowCount: number
}

export function tilesThatFit(
  availableWidth: number,
  tile = ATTACHMENT_TILE_PX,
  gap = ATTACHMENT_GAP_PX
): number {
  if (!Number.isFinite(availableWidth) || availableWidth < tile) {
    return 0
  }
  return Math.floor((availableWidth + gap) / (tile + gap))
}

/**
 * How many normal thumbnails to show given the measured attachment slot.
 * If any items would be hidden, one tile is reserved for the overflow control.
 */
export function attachmentVisibleCapacity(
  availableWidth: number,
  count: number,
  tile = ATTACHMENT_TILE_PX,
  gap = ATTACHMENT_GAP_PX
): number {
  const total = Math.max(0, count)
  const fit = tilesThatFit(availableWidth, tile, gap)
  if (total === 0 || fit === 0) {
    return 0
  }
  if (total <= fit) {
    return total
  }
  return Math.max(0, fit - 1)
}

export function attachmentStrip(
  attachments: PromptAttachment[],
  visibleLimit = attachments.length
): AttachmentStrip {
  const limit = Math.max(0, visibleLimit)
  if (attachments.length <= limit) {
    return {
      visible: attachments,
      overflow: [],
      overflowPreview: null,
      overflowCount: 0,
    }
  }
  return {
    visible: attachments.slice(0, limit),
    overflow: attachments.slice(limit),
    overflowPreview: attachments[limit] ?? attachments[0] ?? null,
    overflowCount: attachments.length - limit,
  }
}

export function imageAttachmentsForSubmission(
  attachments: PromptAttachment[]
): PromptAttachment[] {
  return attachments.filter((attachment) => attachment.usedForGeneration)
}

export function hasReferenceAttachment(
  attachments: PromptAttachment[]
): boolean {
  return imageAttachmentsForSubmission(attachments).length > 0
}

export function composerPlaceholderForAttachments(
  attachments: PromptAttachment[]
): string | null {
  return resolveComposerPlaceholder(hasReferenceAttachment(attachments))
}

export function generationPromptForAttachments(
  prompt: string,
  attachments: PromptAttachment[]
): string {
  return resolveGenerationPrompt(prompt, hasReferenceAttachment(attachments))
}

/** File-input value reset is independent of the attachment collection. */
export function resetFileInputValue(input: { value: string } | null) {
  if (input) {
    input.value = ""
  }
}

export function composerActionOrderIntact(): boolean {
  return (
    composerLeftControlsOrder().join(",") === "attach,measurement,assets"
  )
}
