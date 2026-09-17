import assert from "node:assert/strict"
import test from "node:test"

import {
  PORTFOLIO_WALKTHROUGH_PROMPT,
  resolveInitialVisualStyle,
} from "./portfolio-walkthrough-prompt"

test("routes the portfolio walkthrough prompt to the branded style", () => {
  assert.equal(
    resolveInitialVisualStyle(PORTFOLIO_WALKTHROUGH_PROMPT, undefined),
    "branded"
  )
})

test("keeps generic and near-match prompts on the modern default", () => {
  assert.equal(
    resolveInitialVisualStyle("Create a clean invoice layout", undefined),
    "modern"
  )
  assert.equal(
    resolveInitialVisualStyle(
      `${PORTFOLIO_WALKTHROUGH_PROMPT} Make it compact.`,
      undefined
    ),
    "modern"
  )
})

test("preserves an explicit valid style answer", () => {
  assert.equal(
    resolveInitialVisualStyle(PORTFOLIO_WALKTHROUGH_PROMPT, "bold"),
    "bold"
  )
})
