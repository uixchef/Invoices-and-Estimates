/** Routes where the layout builder runs without hub sidebar or payments top nav. */
export const LAYOUT_BUILDER_ROUTE = "/invoices/layouts/builder"

export function isLayoutBuilderRoute(pathname: string): boolean {
  return pathname === LAYOUT_BUILDER_ROUTE
}

export type BuilderReferenceImage = {
  id: string
  name: string
  previewUrl: string
}

/**
 * Generation request handed off from the Create-with-AI prompt to the builder.
 * Carries the user's prompt, the chosen medium/model, and any reference images.
 */
export type LayoutBuilderSeed = {
  prompt: string
  mediumId: string
  modelId: string
  references: BuilderReferenceImage[]
}

export type BuilderMessage = {
  id: string
  role: "user"
  text: string
  references: BuilderReferenceImage[]
}

export type BuilderStatus =
  | "idle"
  | "reasoning"
  | "asking"
  | "thinking"
  | "ready"

export type BuilderViewMode = "preview" | "code"

export const BUILDER_DOCUMENT_TYPES = [
  "Standard invoice",
  "Estimate",
  "Receipt",
  "Credit note",
] as const

export type BuilderDocumentType = (typeof BUILDER_DOCUMENT_TYPES)[number]

export const DEFAULT_LAYOUT_NAME = "New layout"
