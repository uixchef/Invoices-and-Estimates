export const REFERENCE_RECREATE_PROMPT = "Recreate this."

export const REFERENCE_COMPOSER_PLACEHOLDER =
  "Describe what to preserve or change…"

export function resolveComposerPlaceholder(hasReference: boolean): string | null {
  if (hasReference) {
    return REFERENCE_COMPOSER_PLACEHOLDER
  }
  return null
}

export function resolveGenerationPrompt(
  prompt: string,
  hasReference: boolean
): string {
  const trimmed = prompt.trim()
  if (trimmed) {
    return trimmed
  }
  return hasReference ? REFERENCE_RECREATE_PROMPT : ""
}
