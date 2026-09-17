import type { BuilderVisualStyle } from "@/lib/layout-builder-types"

export const PORTFOLIO_WALKTHROUGH_PROMPT =
  "Create a clean invoice layout with my logo, itemized services, taxes, discounts, and payment terms"

const BUILDER_VISUAL_STYLES: readonly BuilderVisualStyle[] = [
  "minimal",
  "modern",
  "classic",
  "bold",
  "branded",
]

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase()
}

function isBuilderVisualStyle(value: unknown): value is BuilderVisualStyle {
  return (
    typeof value === "string" &&
    BUILDER_VISUAL_STYLES.includes(value as BuilderVisualStyle)
  )
}

export function resolveInitialVisualStyle(
  prompt: string,
  explicitStyle: unknown
): BuilderVisualStyle {
  if (isBuilderVisualStyle(explicitStyle)) {
    return explicitStyle
  }

  return normalizePrompt(prompt) ===
    normalizePrompt(PORTFOLIO_WALKTHROUGH_PROMPT)
    ? "branded"
    : "modern"
}
