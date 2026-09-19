/** One line of the dashboard Layouts AI textarea (text-base / leading-6). */
export const COMPOSER_LINE_HEIGHT_PX = 24

/** Compact empty / single-line height. */
export const COMPOSER_MIN_HEIGHT_PX = COMPOSER_LINE_HEIGHT_PX

/** After this, the textarea scrolls instead of growing the hero. */
export const COMPOSER_MAX_HEIGHT_PX = COMPOSER_LINE_HEIGHT_PX * 8

/** Utility motion for height / attachment / control shifts. */
export const COMPOSER_MOTION_MS = 160

export function clampComposerHeight(contentHeight: number): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) {
    return COMPOSER_MIN_HEIGHT_PX
  }
  return Math.min(
    COMPOSER_MAX_HEIGHT_PX,
    Math.max(COMPOSER_MIN_HEIGHT_PX, Math.ceil(contentHeight))
  )
}
