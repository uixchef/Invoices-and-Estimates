import assert from "node:assert/strict"
import test from "node:test"

import {
  familyFromDominantColor,
  reconstructLayoutFromReference,
  resolveReferenceFamily,
} from "./reference-layout"

test("reference reconstruction defaults to the Saffron statement mapping", () => {
  const layout = reconstructLayoutFromReference("", "Standard invoice")
  assert.equal(layout.businessName, "Saffron")
  assert.equal(layout.clientName, "Holt Atelier")
  assert.equal(layout.style, "statement")
  assert.equal(layout.accent, "#c2410c")
  assert.ok(layout.lineItems.length >= 3)
})

test("prompt modifiers can shift family without pasting a screenshot", () => {
  assert.equal(
    resolveReferenceFamily("Use this structure but make it blue and more minimal."),
    "swiss"
  )
  const layout = reconstructLayoutFromReference(
    "Use this structure but make it blue and more minimal.",
    "Standard invoice"
  )
  assert.equal(layout.style, "swiss")
  assert.equal(layout.accent, "#1a4cff")
  assert.equal(layout.businessName, "Saffron")
})

test("warm terracotta samples map to statement", () => {
  assert.equal(familyFromDominantColor("#c2410c"), "statement")
})

test("neutral greys map to swiss rather than a saturated family", () => {
  assert.equal(familyFromDominantColor("#e5e7eb"), "swiss")
})
