/**
 * Remove Playwright intermediate video recordings left in a capture artifact
 * directory after the curated walkthrough has been secured.
 *
 * Only deletes files matching the known intermediate naming patterns:
 *   - page@*.webm   (raw per-context Playwright recordings)
 *   - *.raw.webm    (pre-trim copies produced by capture-first-slice)
 *
 * Never touches:
 *   - walkthrough.webm, gen-ready-live.webm, layouts-ai-walkthrough.webm, etc.
 *   - PNG stills, JSON, fixtures, or any other curated/unknown file
 *
 * Safe to call when no intermediates exist. Per-file deletion errors are
 * swallowed so a missing or locked file never fails the capture run or
 * destroys a successful curated result.
 */
import { readdir, unlink } from "node:fs/promises"
import { join } from "node:path"

export async function cleanupIntermediateVideos(artifactsDir: string): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(artifactsDir)
  } catch {
    return // directory absent or unreadable — nothing to clean
  }

  const intermediates = entries.filter(
    (name) =>
      (name.startsWith("page@") && name.endsWith(".webm")) ||
      name.endsWith(".raw.webm")
  )

  await Promise.all(
    intermediates.map((name) =>
      unlink(join(artifactsDir, name)).catch(() => {
        /* file already absent or locked — tolerate */
      })
    )
  )
}
