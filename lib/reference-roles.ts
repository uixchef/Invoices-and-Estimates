import type { PromptAttachment } from "@/lib/create-with-ai-types"
import type {
  BuilderReferenceImage,
  BuilderSubmittedAttachment,
  BuilderUserMessage,
} from "@/lib/layout-builder-types"
import {
  attachmentStrip,
  type AttachmentStrip,
} from "@/lib/prompt-attachments"

/** Raster images that can drive visual reconstruction. PDFs are never this. */
export function isVisualReferenceAttachment(
  attachment: Pick<PromptAttachment, "usedForGeneration">
): boolean {
  return attachment.usedForGeneration
}

export function isVisualSubmittedAttachment(
  attachment: Pick<BuilderSubmittedAttachment, "kind">
): boolean {
  return attachment.kind === "image"
}

export function visualReferenceAttachments(
  attachments: PromptAttachment[]
): PromptAttachment[] {
  return attachments.filter(isVisualReferenceAttachment)
}

/**
 * One primary visual reference per creation request. Independent of array
 * order. Falls back to the earliest remaining eligible image.
 */
export function resolvePrimaryReferenceId(
  attachments: PromptAttachment[],
  primaryId?: string | null
): string | null {
  const visuals = visualReferenceAttachments(attachments)
  if (visuals.length === 0) {
    return null
  }
  if (primaryId && visuals.some((attachment) => attachment.id === primaryId)) {
    return primaryId
  }
  return visuals[0]?.id ?? null
}

export function primaryAfterAppend(
  previousPrimaryId: string | null | undefined,
  nextAttachments: PromptAttachment[]
): string | null {
  return resolvePrimaryReferenceId(nextAttachments, previousPrimaryId)
}

export function primaryAfterRemove(
  previousPrimaryId: string | null | undefined,
  nextAttachments: PromptAttachment[]
): string | null {
  return resolvePrimaryReferenceId(nextAttachments, previousPrimaryId)
}

export function setPrimaryReferenceId(
  attachments: PromptAttachment[],
  id: string
): string | null {
  return resolvePrimaryReferenceId(attachments, id)
}

export function fileForPrimaryAnalysis(
  attachments: PromptAttachment[],
  primaryId?: string | null
): File | undefined {
  const id = resolvePrimaryReferenceId(attachments, primaryId)
  if (!id) {
    return undefined
  }
  return attachments.find((attachment) => attachment.id === id)?.file
}

/**
 * Keep the primary thumbnail in the visible strip when overflow would hide it.
 * Does not reorder the underlying attachment collection.
 */
export function attachmentStripPreferPrimary(
  attachments: PromptAttachment[],
  visibleLimit: number,
  primaryId?: string | null
): AttachmentStrip {
  const base = attachmentStrip(attachments, visibleLimit)
  const resolved = resolvePrimaryReferenceId(attachments, primaryId)
  if (!resolved || base.overflowCount === 0) {
    return base
  }
  if (base.visible.some((attachment) => attachment.id === resolved)) {
    return base
  }
  const primary = attachments.find((attachment) => attachment.id === resolved)
  if (!primary || base.visible.length === 0) {
    return base
  }
  const displaced = base.visible[base.visible.length - 1]
  const visible = [...base.visible.slice(0, -1), primary]
  const overflow = [
    displaced,
    ...base.overflow.filter((attachment) => attachment.id !== resolved),
  ].filter((attachment): attachment is PromptAttachment => Boolean(attachment))
  return {
    visible,
    overflow,
    overflowPreview: overflow[0] ?? null,
    overflowCount: overflow.length,
  }
}

export function primaryReferenceFromSubmitted(
  attachments: BuilderSubmittedAttachment[],
  primaryId?: string | null
): BuilderSubmittedAttachment | undefined {
  const images = attachments.filter(isVisualSubmittedAttachment)
  if (images.length === 0) {
    return undefined
  }
  return images.find((attachment) => attachment.id === primaryId) ?? images[0]
}

export function primaryReferenceImage(
  references: BuilderReferenceImage[],
  primaryId?: string | null
): BuilderReferenceImage | undefined {
  if (primaryId) {
    return references.find((reference) => reference.id === primaryId)
  }
  return references[0]
}

export function primaryReferencePreviewUrl(
  message: Pick<BuilderUserMessage, "references" | "primaryReferenceId">
): string | null {
  const match = primaryReferenceImage(
    message.references,
    message.primaryReferenceId
  )
  const url = match?.previewUrl?.trim() ?? ""
  return url || null
}

export function submittedTurnPreservesPrimary(
  message: Pick<BuilderUserMessage, "primaryReferenceId" | "attachments" | "references">,
  expectedId: string
): boolean {
  if (message.primaryReferenceId !== expectedId) {
    return false
  }
  const attachments = message.attachments ?? []
  if (attachments.length > 0) {
    return attachments.some((attachment) => attachment.id === expectedId)
  }
  return message.references.some((reference) => reference.id === expectedId)
}
