import { REFERENCE_RECREATE_PROMPT } from "@/lib/composer-copy"
import type { PromptAttachment } from "@/lib/create-with-ai-types"
import { matchDocumentAction } from "@/lib/document-actions"
import type {
  BuilderReferenceImage,
  BuilderStatus,
  BuilderSubmittedAttachment,
  BuilderUserMessage,
} from "@/lib/layout-builder-types"
import { fileToDataUrl } from "@/lib/prompt-attachments"

export const BUILDER_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"

/** Compact Invoice AI tiles — narrower than the dashboard hero strip. */
export const BUILDER_ATTACHMENT_TILE_PX = 32
export const BUILDER_ATTACHMENT_GAP_PX = 6

export function submittedKindForAttachment(
  attachment: PromptAttachment
): BuilderSubmittedAttachment["kind"] {
  return attachment.usedForGeneration ? "image" : "file"
}

export async function snapshotComposerAttachments(
  attachments: PromptAttachment[]
): Promise<BuilderSubmittedAttachment[]> {
  return Promise.all(
    attachments.map(async (attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      kind: submittedKindForAttachment(attachment),
      previewUrl:
        attachment.usedForGeneration && attachment.file
          ? await fileToDataUrl(attachment.file)
          : "",
    }))
  )
}

export function imageReferencesFromSubmitted(
  attachments: BuilderSubmittedAttachment[]
): BuilderReferenceImage[] {
  return attachments
    .filter((attachment) => attachment.kind === "image")
    .map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      previewUrl: attachment.previewUrl,
    }))
}

/**
 * Dashboard recreate-from-reference is only appropriate on a first generation.
 * Follow-up attachment-only edits keep an empty prompt so clarification can ask
 * rather than reconstructing the live document.
 */
export function resolveBuilderGenerationPrompt(
  prompt: string,
  options: { generatedOnce: boolean; hasImageReference: boolean }
): string {
  const trimmed = prompt.trim()
  if (trimmed) {
    return trimmed
  }
  if (!options.generatedOnce && options.hasImageReference) {
    return REFERENCE_RECREATE_PROMPT
  }
  return ""
}

export function builderComposerCanSend(input: {
  text: string
  attachmentCount: number
  status: BuilderStatus
  scopedQuestionLocksComposer: boolean
}): boolean {
  if (
    input.status === "thinking" ||
    input.status === "reasoning" ||
    input.scopedQuestionLocksComposer
  ) {
    return false
  }
  if (input.status === "asking") {
    return input.text.trim().length > 0
  }
  return input.text.trim().length > 0 || input.attachmentCount > 0
}

export type BuilderComposerSendPlan = "ignore" | "clarify" | "queue"

export function planBuilderComposerSend(input: {
  text: string
  attachmentCount: number
  status: BuilderStatus
}): BuilderComposerSendPlan {
  const trimmed = input.text.trim()
  if (input.status === "thinking" || input.status === "reasoning") {
    return "ignore"
  }
  if (
    input.status === "asking" &&
    trimmed &&
    !matchDocumentAction(trimmed) &&
    !matchDocumentAction(input.text)
  ) {
    return "clarify"
  }
  if (!trimmed && input.attachmentCount === 0) {
    return "ignore"
  }
  return "queue"
}

export function persistableSubmittedAttachment(
  attachment: BuilderSubmittedAttachment
): BuilderSubmittedAttachment {
  return {
    ...attachment,
    previewUrl: attachment.previewUrl.startsWith("data:")
      ? attachment.previewUrl
      : "",
  }
}

export function persistableUserMessage(
  message: BuilderUserMessage
): BuilderUserMessage {
  return {
    ...message,
    primaryReferenceId: message.primaryReferenceId ?? null,
    references: message.references.map((reference) => ({
      ...reference,
      previewUrl: reference.previewUrl.startsWith("data:")
        ? reference.previewUrl
        : "",
    })),
    attachments: message.attachments?.map(persistableSubmittedAttachment),
  }
}

export function submittedAttachmentsForTurn(
  message: Pick<BuilderUserMessage, "attachments" | "references">
): BuilderSubmittedAttachment[] {
  if (message.attachments && message.attachments.length > 0) {
    return message.attachments
  }
  return message.references.map((reference) => ({
    id: reference.id,
    name: reference.name,
    mimeType: "image/*",
    kind: "image" as const,
    previewUrl: reference.previewUrl,
  }))
}

export function clarificationAnswerMessage(
  id: string,
  text: string
): BuilderUserMessage {
  return {
    id,
    role: "user",
    text,
    references: [],
    attachments: [],
    kind: "clarification-answer",
  }
}

export function nextTurnDoesNotInheritAttachments(
  previous: BuilderSubmittedAttachment[],
  nextDraft: PromptAttachment[]
): boolean {
  if (nextDraft.length === 0) {
    return true
  }
  const previousIds = new Set(previous.map((attachment) => attachment.id))
  return nextDraft.every((attachment) => !previousIds.has(attachment.id))
}
