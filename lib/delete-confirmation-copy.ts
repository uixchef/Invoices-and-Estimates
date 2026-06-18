export type DeleteEntityKind = "layout" | "medium"

const DELETE_ENTITY_LABEL: Record<DeleteEntityKind, string> = {
  layout: "layout",
  medium: "paper type",
}

export function getDeleteConfirmationTitle(kind: DeleteEntityKind) {
  return `Delete ${DELETE_ENTITY_LABEL[kind]}`
}

export function getDeleteConfirmationDescription(name: string) {
  return `Are you sure you want to delete '${name}'? This action cannot be undone.`
}

export const DELETE_CONFIRMATION_LABEL = "Yes, delete"
export const DELETE_CANCEL_LABEL = "Cancel"

export function getDeleteSuccessMessage(kind: DeleteEntityKind, name: string) {
  const displayName = name.trim()
  const entityLabel = DELETE_ENTITY_LABEL[kind]

  return displayName
    ? `${displayName} has been deleted successfully.`
    : `${entityLabel.charAt(0).toUpperCase()}${entityLabel.slice(1)} has been deleted successfully.`
}
