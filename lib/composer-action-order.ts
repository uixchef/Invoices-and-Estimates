/**
 * Shared composer action-bar order when attachment and paper-type controls
 * coexist. Attachments are contextual and follow the persistent measurement.
 */
export const COMPOSER_LEFT_CONTROL_ORDER = [
  "attach",
  "measurement",
  "assets",
] as const

export type ComposerLeftControl = (typeof COMPOSER_LEFT_CONTROL_ORDER)[number]

export function composerLeftControlsOrder(): ComposerLeftControl[] {
  return [...COMPOSER_LEFT_CONTROL_ORDER]
}
