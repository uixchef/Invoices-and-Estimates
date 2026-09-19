import type {
  BuilderMessage,
  BuilderUserMessage,
} from "@/lib/layout-builder-types"
import {
  primaryReferenceImage,
  primaryReferencePreviewUrl,
} from "@/lib/reference-roles"

/** Shared-stage fade. Calm, not theatrical. */
export const REFERENCE_COMPARE_TRANSITION_MS = 150

export type CreationComparisonSource = {
  id: string
  name: string
  previewUrl: string
}

export function isUsableReferencePreviewUrl(
  url: string | null | undefined
): boolean {
  const value = url?.trim() ?? ""
  if (!value) {
    return false
  }
  return (
    value.startsWith("data:image") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  )
}

export function creationSourceMessage(
  messages: BuilderMessage[]
): BuilderUserMessage | null {
  for (const message of messages) {
    if (message.role !== "user") {
      continue
    }
    if (message.kind === "clarification-answer") {
      continue
    }
    return message
  }
  return null
}

/**
 * First-generation visual Primary with a usable preview. Follow-up images are
 * ignored. Missing/blank previews do not fall back to another attachment.
 */
export function creationComparisonSource(
  messages: BuilderMessage[]
): CreationComparisonSource | null {
  const creation = creationSourceMessage(messages)
  if (!creation) {
    return null
  }
  const image = primaryReferenceImage(
    creation.references,
    creation.primaryReferenceId
  )
  if (!image) {
    return null
  }
  if (
    creation.primaryReferenceId &&
    image.id !== creation.primaryReferenceId
  ) {
    return null
  }
  const previewUrl = primaryReferencePreviewUrl(creation)
  if (!isUsableReferencePreviewUrl(previewUrl)) {
    return null
  }
  return {
    id: image.id,
    name: image.name,
    previewUrl: previewUrl!,
  }
}

export function creationUsedVisualReference(
  messages: BuilderMessage[]
): boolean {
  const creation = creationSourceMessage(messages)
  if (!creation) {
    return false
  }
  if (creation.primaryReferenceId) {
    const inRefs = creation.references.some(
      (reference) => reference.id === creation.primaryReferenceId
    )
    const inAttachments = (creation.attachments ?? []).some(
      (attachment) =>
        attachment.id === creation.primaryReferenceId &&
        attachment.kind === "image"
    )
    return inRefs || inAttachments
  }
  return creation.references.length > 0
}

export function canCompareReferenceResult(
  messages: BuilderMessage[]
): boolean {
  return creationComparisonSource(messages) !== null
}

export function referenceCompareAltText(fileName: string): string {
  const name = fileName.trim() || "reference image"
  return `Primary reference: ${name}`
}

export function compareTransitionMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : REFERENCE_COMPARE_TRANSITION_MS
}

export const REFERENCE_COMPARE_VIEW_MODEL = {
  keepsResultMounted: true,
  isReadOnly: true,
  mutatesDocument: false,
  createsUndo: false,
  createsVersion: false,
  fit: "contain" as const,
} as const
