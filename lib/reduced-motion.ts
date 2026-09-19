/** Repeating UI motion (typewriter, placeholder rotation) must not start. */
export function shouldRunRepeatingMotion(reduceMotion: boolean): boolean {
  return !reduceMotion
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
