export const VERSION_HISTORY_SURFACE = "builder-panel" as const

export const VERSION_HISTORY_PANEL_TITLE = "Version history"

export const VERSION_HISTORY_TOOLBAR_LABEL = "Version history"

export function versionHistorySelectedId(input: {
  currentVersionId: string | null
  previewVersionId: string | null
  previewingHistoricalVersion: boolean
}): string | null {
  return input.previewingHistoricalVersion
    ? input.previewVersionId
    : input.currentVersionId
}

export function versionHistoryPopoverRemoved(): boolean {
  return VERSION_HISTORY_SURFACE === "builder-panel"
}
