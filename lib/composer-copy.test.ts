import assert from "node:assert/strict"
import test from "node:test"

import {
  REFERENCE_COMPOSER_PLACEHOLDER,
  REFERENCE_RECREATE_PROMPT,
  resolveComposerPlaceholder,
  resolveGenerationPrompt,
} from "./composer-copy"

test("placeholder stays generic until a reference is attached", () => {
  assert.equal(resolveComposerPlaceholder(false), null)
  assert.equal(
    resolveComposerPlaceholder(true),
    REFERENCE_COMPOSER_PLACEHOLDER
  )
  assert.match(REFERENCE_COMPOSER_PLACEHOLDER, /^Describe what/)
})

test("empty submit with a reference resolves to Recreate this.", () => {
  assert.equal(resolveGenerationPrompt("", true), REFERENCE_RECREATE_PROMPT)
  assert.equal(resolveGenerationPrompt("   ", true), REFERENCE_RECREATE_PROMPT)
  assert.equal(
    resolveGenerationPrompt("Use this structure but make it blue", true),
    "Use this structure but make it blue"
  )
  assert.equal(resolveGenerationPrompt("", false), "")
  assert.doesNotMatch(REFERENCE_RECREATE_PROMPT, /these|all references/i)
})
