import assert from "node:assert/strict"
import test from "node:test"

import {
  PORTFOLIO_WALKTHROUGH_PROMPT,
  resolveInitialVisualStyle,
} from "./portfolio-walkthrough-prompt"
import { PORTFOLIO_HERO_PROMPT } from "./layout-family"

test("routes the portfolio walkthrough prompt to the swiss family", () => {
  assert.equal(
    resolveInitialVisualStyle(PORTFOLIO_WALKTHROUGH_PROMPT, undefined),
    "swiss"
  )
})

test("keeps generic clean prompts on the swiss family", () => {
  assert.equal(
    resolveInitialVisualStyle("Create a clean invoice layout", undefined),
    "swiss"
  )
  assert.equal(
    resolveInitialVisualStyle(
      `${PORTFOLIO_WALKTHROUGH_PROMPT} Make it compact.`,
      undefined
    ),
    "swiss"
  )
})

test("preserves an explicit valid style answer via aliases", () => {
  assert.equal(
    resolveInitialVisualStyle(PORTFOLIO_WALKTHROUGH_PROMPT, "bold"),
    "statement"
  )
})

test("hero prompt resolves through the shared family scorer", () => {
  assert.equal(
    resolveInitialVisualStyle(PORTFOLIO_HERO_PROMPT, undefined),
    "studio"
  )
})
