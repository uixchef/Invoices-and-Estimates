import assert from "node:assert/strict"
import test from "node:test"

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { clampComposerHeight, COMPOSER_MOTION_MS } from "./composer-height"

const prompt = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/invoices/create-with-ai-prompt-input.tsx"),
  "utf8"
)

test("composer height stays on one line until content exceeds it", () => {
  assert.equal(clampComposerHeight(0), 24)
  assert.equal(clampComposerHeight(24), 24)
  assert.equal(clampComposerHeight(25), 25)
})

test("composer height caps and would then scroll", () => {
  assert.equal(clampComposerHeight(192), 192)
  assert.equal(clampComposerHeight(400), 192)
})

test("composer height transition stays in the short UI range and honors reduced motion", () => {
  assert.equal(COMPOSER_MOTION_MS, 160)
  assert.match(prompt, /motion-reduce:transition-none/)
  assert.match(prompt, /transitionProperty:\s*"height"/)
  assert.match(prompt, /prefers-reduced-motion:\s*reduce/)
})
