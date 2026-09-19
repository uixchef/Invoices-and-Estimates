import assert from "node:assert/strict"
import test from "node:test"

import { PORTFOLIO_WALKTHROUGH_PROMPT } from "../portfolio-walkthrough-prompt"
import {
  CAPTURE_CLOCK_MS,
  CAPTURE_DETAILED_PROMPT,
  CAPTURE_INVOICE_SOURCE_ID,
  CAPTURE_LIVE_REASONING_MS,
  CAPTURE_LIVE_THINKING_MS,
  CAPTURE_SAMPLE_SOURCE_ID,
  CAPTURE_SPARSE_PROMPT,
  CAPTURE_STATE_IDS,
  CAPTURE_SETTLED_LAYOUT,
  PRODUCT_BUILDER_SESSION_KEY,
  activatePortfolioCapture,
  deactivatePortfolioCapture,
  getBuilderNow,
  getCaptureBlueprint,
  getReasoningDelayMs,
  getThinkingDelayMs,
  isIntendedCaptureMounted,
  isPortfolioCaptureEnvEnabled,
  parsePortfolioCaptureSearch,
  shouldPersistBuilderSession,
  shouldSkipSimulatedTimers,
} from "./index"

const ENABLED = { NEXT_PUBLIC_PORTFOLIO_CAPTURE: "true" }
const DISABLED = {}

test.afterEach(() => {
  deactivatePortfolioCapture()
})

test("env gate is off unless NEXT_PUBLIC_PORTFOLIO_CAPTURE=true", () => {
  assert.equal(isPortfolioCaptureEnvEnabled(DISABLED), false)
  assert.equal(isPortfolioCaptureEnvEnabled(ENABLED), true)
})

test("query param alone does not activate capture", () => {
  assert.equal(
    parsePortfolioCaptureSearch("?portfolioCapture=blank", DISABLED),
    null
  )
})

test("enabled env plus known state parses still and live requests", () => {
  assert.deepEqual(
    parsePortfolioCaptureSearch("?portfolioCapture=blank", ENABLED),
    { state: "blank", live: false }
  )
  assert.deepEqual(
    parsePortfolioCaptureSearch(
      "?portfolioCapture=gen-ready&portfolioCaptureLive=1",
      ENABLED
    ),
    { state: "gen-ready", live: true }
  )
})

test("unknown capture states are ignored", () => {
  assert.equal(
    parsePortfolioCaptureSearch("?portfolioCapture=multi-page", ENABLED),
    null
  )
})

test("registry covers the approved first- and second-slice states", () => {
  assert.deepEqual([...CAPTURE_STATE_IDS], [
    "blank",
    "clarify-required",
    "clarify-skipped",
    "gen-ready",
    "scoped-edit",
    "visual-edit",
    "preview-sample",
    "preview-invoice",
    "code-ejected",
  ])
  for (const state of CAPTURE_STATE_IDS) {
    assert.equal(getCaptureBlueprint(state).state, state)
  }
})

test("detailed capture prompt resolves to the studio family via shared scoring", () => {
  assert.notEqual(CAPTURE_DETAILED_PROMPT, PORTFOLIO_WALKTHROUGH_PROMPT)
  assert.match(CAPTURE_DETAILED_PROMPT, /\bpremium\b/i)
  assert.match(CAPTURE_DETAILED_PROMPT, /\bbranded\b/i)
  assert.ok(CAPTURE_DETAILED_PROMPT.trim().split(/\s+/).length >= 12)
  assert.equal(CAPTURE_SETTLED_LAYOUT.style, "studio")
  assert.equal(CAPTURE_SETTLED_LAYOUT.accent, "#1a4cff")
  assert.equal(CAPTURE_SETTLED_LAYOUT.businessName, "Northwind Studio")
})

test("sparse and detailed prompts stay distinct for clarification stills", () => {
  const sparse = getCaptureBlueprint("clarify-required")
  const skipped = getCaptureBlueprint("clarify-skipped")
  const ready = getCaptureBlueprint("gen-ready")
  assert.equal(sparse.seedPrompt, CAPTURE_SPARSE_PROMPT)
  assert.equal(skipped.seedPrompt, CAPTURE_DETAILED_PROMPT)
  assert.equal(ready.seedPrompt, CAPTURE_DETAILED_PROMPT)
  assert.equal(sparse.stillStatus, "asking")
  assert.equal(skipped.stillStatus, "thinking")
  assert.equal(skipped.hasGeneratedOnce, false)
  assert.equal(ready.stillStatus, "ready")
  assert.equal(ready.liveKickoff, "initial-generation")
})

test("scoped-edit stays an in-flight contextual edit, not a completed typography result", () => {
  const scoped = getCaptureBlueprint("scoped-edit")
  assert.equal(scoped.editMode, true)
  assert.equal(scoped.inspectingLayer, "Business name")
  assert.equal(scoped.aiEditingLayer, "Business name")
  assert.equal(scoped.stillStatus, "thinking")
  assert.equal(scoped.liveKickoff, "scoped-follow-up")
})

test("visual-edit seeds a generated layout in real inspect mode", () => {
  const visual = getCaptureBlueprint("visual-edit")
  assert.equal(visual.stillStatus, "ready")
  assert.equal(visual.editMode, true)
  assert.equal(visual.inspectingLayer, "Business name")
  assert.equal(visual.aiEditingLayer, null)
  assert.equal(visual.editsTab, "style")
})

test("preview pair shares one layout and differs only by document source", () => {
  const sample = getCaptureBlueprint("preview-sample")
  const invoice = getCaptureBlueprint("preview-invoice")
  assert.equal(sample.seedPrompt, invoice.seedPrompt)
  assert.equal(sample.stillStatus, invoice.stillStatus)
  assert.equal(sample.previewSourceId, CAPTURE_SAMPLE_SOURCE_ID)
  assert.equal(invoice.previewSourceId, CAPTURE_INVOICE_SOURCE_ID)
  assert.notEqual(sample.previewSourceId, invoice.previewSourceId)
})

test("code-ejected seeds detached source and split chrome", () => {
  const ejected = getCaptureBlueprint("code-ejected")
  assert.ok(ejected.codeOverride && ejected.codeOverride.includes("<!doctype html>"))
  assert.equal(ejected.codeOpen, true)
  assert.equal(ejected.previewOpen, true)
  assert.equal(ejected.editMode, false)
})

test("live capture-ready ignores the pre-apply idle canvas", () => {
  assert.equal(
    isIntendedCaptureMounted({
      applied: false,
      live: true,
      status: "idle",
      stillStatus: "ready",
      liveKickoff: "initial-generation",
    }),
    false
  )
  assert.equal(
    isIntendedCaptureMounted({
      applied: true,
      live: true,
      status: "idle",
      stillStatus: "ready",
      liveKickoff: "initial-generation",
    }),
    false
  )
  assert.equal(
    isIntendedCaptureMounted({
      applied: true,
      live: true,
      status: "reasoning",
      stillStatus: "ready",
      liveKickoff: "initial-generation",
    }),
    true
  )
})

test("capture clock and shortened live timers are isolated to an active session", () => {
  assert.notEqual(getBuilderNow().getTime(), CAPTURE_CLOCK_MS)
  assert.equal(getReasoningDelayMs(2600), 2600)
  assert.equal(shouldPersistBuilderSession(), true)

  activatePortfolioCapture({ state: "blank", live: false })
  assert.equal(getBuilderNow().getTime(), CAPTURE_CLOCK_MS)
  assert.equal(shouldSkipSimulatedTimers(), true)
  assert.equal(shouldPersistBuilderSession(), false)
  assert.equal(PRODUCT_BUILDER_SESSION_KEY, "invoice-builder-session-v1")

  deactivatePortfolioCapture()
  activatePortfolioCapture({ state: "gen-ready", live: true })
  assert.equal(shouldSkipSimulatedTimers(), false)
  assert.equal(getReasoningDelayMs(2600), CAPTURE_LIVE_REASONING_MS)
  assert.equal(getThinkingDelayMs(7000), CAPTURE_LIVE_THINKING_MS)
  assert.equal(shouldPersistBuilderSession(), false)
})
