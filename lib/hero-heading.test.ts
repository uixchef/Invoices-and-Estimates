import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const css = readFileSync(join(root, "app/globals.css"), "utf8")
const accent = readFileSync(
  join(root, "components/invoices/hero-accent.tsx"),
  "utf8"
)
const panel = readFileSync(
  join(root, "components/invoices/create-with-ai-panel.tsx"),
  "utf8"
)

test("heading does not artificially break before the dynamic word", () => {
  const titleBlock = css.slice(css.indexOf(".hero-title {"), css.indexOf(".hero-title-lead {"))
  assert.doesNotMatch(titleBlock, /display:\s*flex/)
  assert.doesNotMatch(titleBlock, /flex-wrap:\s*wrap/)
  assert.match(titleBlock, /display:\s*block/)
  assert.match(panel, /hero-title-phrase/)
  assert.match(panel, /feels <HeroAccent/)
})

test("feels and the dynamic phrase share one nowrap wrap unit", () => {
  const phraseBlock = css.slice(
    css.indexOf(".hero-title-phrase {"),
    css.indexOf(".hero-accent {")
  )
  assert.match(phraseBlock, /display:\s*inline/)
  assert.match(phraseBlock, /white-space:\s*nowrap/)
  assert.doesNotMatch(phraseBlock, /display:\s*(block|flex|grid|inline-block|inline-flex)/)
})

test("long dynamic word can wrap naturally with the sentence", () => {
  const accentBlock = css.slice(css.indexOf(".hero-accent {"), css.indexOf(".hero-accent__live {"))
  assert.match(accentBlock, /display:\s*inline/)
  assert.doesNotMatch(accentBlock, /white-space:\s*nowrap/)
  assert.doesNotMatch(accent, /WIDTH_RESERVE_PHRASE/)
  assert.doesNotMatch(accent, /className="sr-only"/)
  assert.match(accent, /hero-accent__status/)
  assert.doesNotMatch(css, /hero-accent__slot/)
})

test("ambient hero field uses approved purple tokens and no hue rotation", () => {
  const field = css.slice(css.indexOf(".vibe-hero-ambient {"), css.indexOf("@keyframes composer-chip-in"))
  assert.match(field, /#c4b5fd/)
  assert.match(field, /#7c3aed/)
  assert.match(field, /#5b21b6/)
  assert.match(field, /#2e1065/)
  assert.doesNotMatch(field, /hue-rotate/)
  assert.doesNotMatch(field, /rainbow/)
  assert.match(field, /vibe-hero-drift-a/)
  assert.match(
    field,
    /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/
  )
})

test("hero hard-edge feathering is preserved", () => {
  const field = css.slice(css.indexOf(".vibe-hero-field {"), css.indexOf(".vibe-hero-ambient {"))
  assert.match(field, /mask-image:/)
  assert.match(field, /90deg/)
  assert.match(field, /180deg/)
  assert.match(field, /#000 32%/)
  assert.match(field, /#000 70%/)
  assert.match(field, /mask-composite:\s*intersect/)
  assert.match(field, /transparent 0%/)
  assert.match(field, /transparent 100%/)
})

test("idle ambient masses are not clip-boxed before the field mask", () => {
  const ambient = css.slice(
    css.indexOf(".vibe-hero-ambient {"),
    css.indexOf(".vibe-hero-ambient__mist,")
  )
  assert.doesNotMatch(ambient, /overflow:\s*hidden/)
})

test("idle ambient field has no React RAF or interval loop", () => {
  const canvas = readFileSync(
    join(root, "components/invoices/vibe-hero-canvas.tsx"),
    "utf8"
  )
  assert.doesNotMatch(canvas, /requestAnimationFrame/)
  assert.doesNotMatch(canvas, /setInterval/)
  assert.doesNotMatch(canvas, /getContext\("webgl"/)
  assert.match(canvas, /vibe-hero-ambient/)
  assert.doesNotMatch(canvas, /useLayoutBuilder/)
  assert.doesNotMatch(canvas, /layout-builder-context/)
})

test("reduced-motion keeps the static purple composition", () => {
  const field = css.slice(
    css.indexOf(".vibe-hero-ambient {"),
    css.indexOf("@keyframes composer-chip-in")
  )
  assert.match(field, /vibe-hero-ambient__mist/)
  assert.match(field, /vibe-hero-ambient__bloom/)
  assert.match(field, /vibe-hero-ambient__ink/)
  assert.match(field, /#c4b5fd/)
  assert.match(field, /#7c3aed/)
  assert.doesNotMatch(field, /display:\s*none/)
})
