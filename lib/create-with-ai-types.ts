export type PromptAttachment = {
  id: string
  file: File
  previewUrl: string
  name: string
  mimeType: string
  /** Images are passed to the layout generation model as visual references. */
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
  mediumId: string
  modelId: string
}
