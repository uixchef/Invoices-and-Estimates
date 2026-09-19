export type PromptAttachment = {
  id: string
  file: File
  previewUrl: string
  name: string
  mimeType: string
  /** Raster image eligible as a visual reference. PDFs are never this. */
  usedForGeneration: boolean
}

export const CREATE_WITH_AI_MEDIUM_REQUIRED_MESSAGE =
  "Select a medium before generating a layout."

export type CreateWithAiGenerateRequest = {
  mediumId: string | null
  modelId: string
}

export type CreateWithAiGenerateInput = {
  prompt: string
  referenceImages: File[]
  /** The single image used for deterministic reconstruction, if any. */
  primaryReferenceId?: string | null
  mediumId: string
  modelId: string
}
