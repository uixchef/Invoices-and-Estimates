import type { PromptAttachment } from "@/lib/create-with-ai-types"
import { AI_MODELS } from "@/lib/ai-models"
import {
  appendAttachments,
  imagePreviewForAttachment,
  removeAttachmentById,
  revokeAttachmentUrls,
  revokePreviewUrl,
} from "@/lib/prompt-attachments"
import {
  primaryAfterAppend,
  primaryAfterRemove,
  resolvePrimaryReferenceId,
} from "@/lib/reference-roles"

export const DEFAULT_COMPOSER_MODEL_ID = AI_MODELS[0]!.id

/**
 * Unsent Invoice AI composer draft. Lives at builder-session scope so panel
 * switching does not unmount it. Never part of document versions, undo, or
 * sessionStorage.
 */
export type ComposerDraft = {
  text: string
  attachments: PromptAttachment[]
  modelId: string
  /** Creation-request primary visual reference. Not document state. */
  primaryReferenceId: string | null
}

export function emptyComposerDraft(): ComposerDraft {
  return {
    text: "",
    attachments: [],
    modelId: DEFAULT_COMPOSER_MODEL_ID,
    primaryReferenceId: null,
  }
}

export function composerDraftIsEmpty(draft: ComposerDraft): boolean {
  return draft.text.trim().length === 0 && draft.attachments.length === 0
}

export function setComposerDraftText(
  draft: ComposerDraft,
  text: string
): ComposerDraft {
  return { ...draft, text }
}

export function setComposerDraftModelId(
  draft: ComposerDraft,
  modelId: string
): ComposerDraft {
  return { ...draft, modelId }
}

export function addComposerDraftFiles(
  draft: ComposerDraft,
  files: File[]
): {
  next: ComposerDraft
  added: PromptAttachment[]
  rejected: File[]
  truncated: File[]
} {
  const result = appendAttachments(
    draft.attachments,
    files,
    imagePreviewForAttachment
  )
  return {
    next: {
      ...draft,
      attachments: result.next,
      primaryReferenceId: primaryAfterAppend(
        draft.primaryReferenceId,
        result.next
      ),
    },
    added: result.added,
    rejected: result.rejected,
    truncated: result.truncated,
  }
}

export function removeComposerDraftAttachment(
  draft: ComposerDraft,
  id: string
): ComposerDraft {
  const { next, removed } = removeAttachmentById(draft.attachments, id)
  revokePreviewUrl(removed?.previewUrl)
  return {
    ...draft,
    attachments: next,
    primaryReferenceId: primaryAfterRemove(draft.primaryReferenceId, next),
  }
}

export function setComposerDraftPrimary(
  draft: ComposerDraft,
  id: string
): ComposerDraft {
  return {
    ...draft,
    primaryReferenceId: resolvePrimaryReferenceId(draft.attachments, id),
  }
}

/** Revokes remaining blob URLs, then returns an empty text/attachment draft.
 *  Model selection is a composer preference and survives send. */
export function discardComposerDraft(draft: ComposerDraft): ComposerDraft {
  revokeAttachmentUrls(draft.attachments)
  return { ...emptyComposerDraft(), modelId: draft.modelId }
}

export function composerDraftAttachmentIds(draft: ComposerDraft): string[] {
  return draft.attachments.map((attachment) => attachment.id)
}
