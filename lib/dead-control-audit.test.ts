import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

test("LayoutPreviewPanel hydrates deterministically (no document guard)", () => {
  const src = read("components/invoices/layout-preview-panel.tsx")
  // The portal must mount after hydration via a mounted flag, not a
  // typeof-document guard that renders different trees on server vs client.
  assert.doesNotMatch(src, /typeof document === "undefined"/)
  assert.match(src, /useState\(false\)/)
  assert.match(src, /setMounted\(true\)/)
  assert.match(src, /if \(!mounted\)/)
})

test("toolbar has no dead coming-soon plumbing", () => {
  const toolbar = read("components/invoices/builder/layout-builder-toolbar.tsx")
  assert.doesNotMatch(toolbar, /comingSoon/)
  assert.doesNotMatch(toolbar, /Coming soon/)
})

test("media library is consistently unavailable across surfaces", () => {
  const dashboard = read("components/invoices/create-with-ai-prompt-input.tsx")
  const builder = read("components/invoices/builder/builder-composer-attachments.tsx")
  const welcome = read("components/invoices/builder/ai-welcome-state.tsx")
  const visualEdits = read("components/invoices/builder/visual-edits-panel.tsx")
  // Every reachable "media library" action must toast the unavailable
  // message — none may be a silent no-op.
  assert.match(dashboard, /MEDIA_LIBRARY_UNAVAILABLE_MESSAGE/)
  assert.match(builder, /MEDIA_LIBRARY_UNAVAILABLE_MESSAGE/)
  assert.match(welcome, /MEDIA_LIBRARY_UNAVAILABLE_MESSAGE/)
  assert.match(visualEdits, /Media library isn't available yet/)
})

test("reachable generation carousel uses US color spelling", () => {
  const carousel = read("components/invoices/builder/generating-carousel.tsx")
  assert.match(carousel, /closing color field/)
  assert.match(carousel, /large color field/)
  assert.doesNotMatch(carousel, /colour field/)
})

test("sidebar icons use plain img to avoid Next/Image aspect warnings", () => {
  const sidebar = read("components/payment-hub/Sidebar.tsx")
  // Sidebar icons/logos are unoptimized assets; plain <img> avoids the
  // Next/Image one-dimension-modified warning without losing optimization
  // (there was none — every instance was unoptimized).
  assert.doesNotMatch(sidebar, /from "next\/image"/)
  assert.doesNotMatch(sidebar, /<Image\b/)
})
