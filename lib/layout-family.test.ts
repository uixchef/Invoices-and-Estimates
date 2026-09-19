import assert from "node:assert/strict"
import test from "node:test"

import { PORTFOLIO_WALKTHROUGH_PROMPT } from "./portfolio-walkthrough-prompt"
import {
  PORTFOLIO_HERO_PROMPT,
  dashboardFamilyForLayoutId,
  normalizeLayoutStyle,
  resolveAccentColor,
  resolveInitialVisualStyle,
  resolveLayoutFamily,
} from "./layout-family"

test("maps natural-language intent onto flagship families", () => {
  assert.equal(resolveLayoutFamily("Create a clean invoice layout"), "swiss")
  assert.equal(
    resolveLayoutFamily("A premium elegant luxury invoice"),
    "atelier"
  )
  assert.equal(resolveLayoutFamily("Make it compact and dense"), "swiss")
  assert.equal(
    resolveLayoutFamily("A modern professional business invoice"),
    "studio"
  )
  assert.equal(
    resolveLayoutFamily("Bold expressive color block invoice"),
    "statement"
  )
  assert.equal(resolveLayoutFamily("Editorial typographic invoice"), "editorial")
  assert.equal(resolveLayoutFamily("Swiss grid invoice"), "swiss")
  assert.equal(resolveLayoutFamily("A financial ledger invoice"), "ledger")
})

test("typography bold does not flip the statement family", () => {
  assert.equal(resolveLayoutFamily("make the font bold"), "studio")
})

test("hero prompt resolves to studio with blue accent", () => {
  assert.equal(resolveLayoutFamily(PORTFOLIO_HERO_PROMPT), "studio")
  assert.equal(resolveAccentColor(PORTFOLIO_HERO_PROMPT, "studio"), "#1a4cff")
  assert.equal(
    resolveInitialVisualStyle(PORTFOLIO_HERO_PROMPT, undefined),
    "studio"
  )
})

test("walkthrough prompt maps clean to swiss", () => {
  assert.equal(resolveLayoutFamily(PORTFOLIO_WALKTHROUGH_PROMPT), "swiss")
})

test("explicit answers and legacy aliases normalize", () => {
  assert.equal(resolveInitialVisualStyle("anything", "bold"), "statement")
  assert.equal(resolveInitialVisualStyle("anything", "classic"), "atelier")
  assert.equal(resolveInitialVisualStyle("anything", "branded"), "studio")
  assert.equal(normalizeLayoutStyle("modern"), "studio")
  assert.equal(normalizeLayoutStyle("luxury"), "atelier")
})

test("dashboard drafts lead with high-contrast families", () => {
  assert.equal(dashboardFamilyForLayoutId("layout-draft-1"), "editorial")
  assert.equal(dashboardFamilyForLayoutId("layout-draft-2"), "studio")
  assert.equal(dashboardFamilyForLayoutId("layout-draft-3"), "statement")
  assert.equal(dashboardFamilyForLayoutId("layout-draft-4"), "swiss")
  assert.equal(dashboardFamilyForLayoutId("layout-draft-5"), "atelier")
  assert.equal(dashboardFamilyForLayoutId("layout-draft-6"), "ledger")
})
