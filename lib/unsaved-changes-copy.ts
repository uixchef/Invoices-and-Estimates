export type UnsavedChangesEntityKind = "medium"

const LEAVE_ACTION: Record<UnsavedChangesEntityKind, string> = {
  medium: "leaving this page",
}

export const UNSAVED_CHANGES_TITLE = "Unsaved changes?"

export function getUnsavedChangesDescription(kind: UnsavedChangesEntityKind) {
  const action = LEAVE_ACTION[kind]

  return `You have unsaved changes. Save them before ${action}, or discard them to continue without saving.`
}

export const UNSAVED_CHANGES_DISCARD_LABEL = "Discard"
export const UNSAVED_CHANGES_SAVE_LABEL = "Save changes"
