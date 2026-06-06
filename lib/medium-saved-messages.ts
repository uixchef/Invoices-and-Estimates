function resolveMediumDisplayName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed || trimmed.toLowerCase() === "new medium") {
    return null
  }

  return trimmed
}

export function mediumSavedSuccessMessage(name: string): string {
  const displayName = resolveMediumDisplayName(name)

  return displayName
    ? `${displayName} has been saved successfully.`
    : "Medium has been saved successfully."
}

export function mediumCreatedSuccessMessage(name: string): string {
  const displayName = resolveMediumDisplayName(name)

  return displayName
    ? `${displayName} has been created successfully.`
    : "Medium has been created successfully."
}
