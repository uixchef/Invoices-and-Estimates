export function getLayoutCloneSuccessMessage(name: string) {
  const displayName = name.trim()

  return displayName
    ? `${displayName} has been cloned successfully.`
    : "Layout has been cloned successfully."
}

export function getClonedLayoutName(sourceName: string) {
  return `${sourceName.trim()} copy`
}
