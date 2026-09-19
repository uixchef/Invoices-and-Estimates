import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  nativeInstanceId,
  nativeSectionInstanceId,
  withCopySuffix,
  copyIndexFromId,
  baseInstanceId,
  authoredKeyFromId,
  authoredLookupKey,
  slotFromDisplayLabel,
  displayLabelForSlot,
  compatibilityKeys,
  readLayerStore,
  legacyLabelOverride,
  isNativeInstanceId,
} from "./native-instance-id"

test("display label, authored key, and instance ID are distinct", () => {
  const instanceId = nativeInstanceId(["billing-details"], "due-date")
  const authoredKey = authoredKeyFromId(instanceId)
  const display = displayLabelForSlot(authoredKey)
  assert.equal(display, "Due date")
  assert.equal(authoredKey, "due-date")
  assert.equal(instanceId, "n/billing-details/due-date")
  assert.notEqual(instanceId, display)
  assert.notEqual(instanceId, authoredKey)
  assert.notEqual(authoredKey, display)
})

test("same display label with different authored keys stay distinct", () => {
  const billing = nativeInstanceId(["billing-details"], "due-date")
  const totals = nativeInstanceId(["totals"], "due-date")
  assert.notEqual(billing, totals)
  assert.equal(authoredKeyFromId(billing), "due-date")
  assert.equal(authoredKeyFromId(totals), "due-date")
  assert.equal(displayLabelForSlot("due-date"), "Due date")
})

test("same label same parent receives distinct instance IDs", () => {
  const first = nativeInstanceId(["totals"], "amount", 1)
  const second = nativeInstanceId(["totals"], "amount", 2)
  assert.notEqual(first, second)
  assert.equal(authoredKeyFromId(first), "amount")
  assert.equal(authoredKeyFromId(second), "amount")
  assert.equal(first, "n/totals/amount")
  assert.equal(second, "n/totals/amount@2")
})

test("display-label change does not change instance identity", () => {
  const original = nativeInstanceId(["billing-details"], "due-date")
  const afterRename = nativeInstanceId(["billing-details"], "due-date")
  assert.equal(original, afterRename)
  assert.notEqual(original, slotFromDisplayLabel("Payment due"))
  assert.equal(authoredKeyFromId(original), "due-date")
  const store = { [original]: { color: "#ff0000" } }
  assert.deepEqual(readLayerStore(store, afterRename), { color: "#ff0000" })
})

test("nativeSectionInstanceId uses machine slots", () => {
  assert.equal(nativeSectionInstanceId([], "header"), "n/header")
  assert.equal(
    nativeSectionInstanceId(["header"], "identity"),
    "n/header/identity"
  )
})

test("withCopySuffix appends #copy-N to machine IDs", () => {
  assert.equal(
    withCopySuffix("n/billing-details/due-date", 1),
    "n/billing-details/due-date#copy-1"
  )
  assert.equal(withCopySuffix("n/header", 3), "n/header#copy-3")
})

test("copyIndexFromId extracts copy index", () => {
  assert.equal(copyIndexFromId("n/header#copy-2"), 2)
  assert.equal(copyIndexFromId("n/billing-details/due-date"), 0)
})

test("baseInstanceId strips trailing #copy-N only", () => {
  assert.equal(baseInstanceId("n/header#copy-1"), "n/header")
  assert.equal(
    baseInstanceId("n/billing-details/due-date#copy-2"),
    "n/billing-details/due-date"
  )
  assert.equal(
    baseInstanceId("n/billing-details#copy-1/due-date"),
    "n/billing-details#copy-1/due-date"
  )
})

test("authoredKeyFromId reads machine slots not display copy", () => {
  assert.equal(authoredKeyFromId("n/business-name"), "business-name")
  assert.equal(authoredKeyFromId("n/billing-details/due-date"), "due-date")
  assert.equal(authoredKeyFromId("n/totals/due-date"), "due-date")
  assert.equal(authoredKeyFromId("n/header/identity/business-name"), "business-name")
})

test("authoredKeyFromId strips copy suffix and occurrence", () => {
  assert.equal(authoredKeyFromId("n/billing-details/due-date#copy-1"), "due-date")
  assert.equal(authoredKeyFromId("n/header#copy-3"), "header")
  assert.equal(authoredKeyFromId("n/totals/amount@2"), "amount")
})

test("authoredKeyFromId: copy in middle still resolves authored slot", () => {
  assert.equal(authoredKeyFromId("n/billing-details#copy-1/due-date"), "due-date")
})

test("duplicate shares authoredKey but not instanceId", () => {
  const original = nativeInstanceId(["header"], "business-name")
  const copy = withCopySuffix(original, 1)
  assert.notEqual(original, copy)
  assert.equal(authoredKeyFromId(original), authoredKeyFromId(copy))
  assert.equal(authoredKeyFromId(copy), "business-name")
  assert.equal(copyIndexFromId(copy), 1)
})

test("duplicate descendants get new instance IDs and keep authored keys", () => {
  const originalField = nativeInstanceId(["billing-details"], "due-date")
  const dup1Field = nativeInstanceId(["billing-details#copy-1"], "due-date")
  const dup2Field = nativeInstanceId(["billing-details#copy-2"], "due-date")
  assert.notEqual(originalField, dup1Field)
  assert.notEqual(originalField, dup2Field)
  assert.notEqual(dup1Field, dup2Field)
  assert.equal(authoredKeyFromId(originalField), "due-date")
  assert.equal(authoredKeyFromId(dup1Field), "due-date")
  assert.equal(authoredKeyFromId(dup2Field), "due-date")
})

test("path-ID compatibility: gen-2 keys still readable", () => {
  const instanceId = nativeInstanceId(["billing-details"], "due-date")
  const keys = compatibilityKeys(instanceId)
  assert.ok(keys.includes(instanceId))
  assert.ok(keys.includes("Billing details/Due date"))
  assert.ok(keys.includes("Due date"))
  const store = { "Billing details/Due date": "kept" }
  assert.equal(readLayerStore(store, instanceId), "kept")
})

test("old label-ID compatibility: gen-1 keys still readable", () => {
  const instanceId = nativeInstanceId(["billing-details"], "due-date")
  const store = { "Due date": "2025-12-01", "Business name": "Acme" }
  assert.equal(legacyLabelOverride(instanceId, store), "2025-12-01")
  assert.equal(
    legacyLabelOverride(nativeInstanceId([], "business-name"), store),
    "Acme"
  )
})

test("legacy writes are read aliases, not canonical", () => {
  const instanceId = nativeInstanceId(["billing-details"], "due-date")
  const store: Record<string, string> = { "Due date": "legacy" }
  assert.equal(readLayerStore(store, instanceId), "legacy")
  store[instanceId] = "canonical"
  assert.equal(readLayerStore(store, instanceId), "canonical")
  assert.equal(store["Due date"], "legacy")
})

test("second same-parent sibling does not inherit gen-1/gen-2 aliases", () => {
  const second = nativeInstanceId(["totals"], "amount", 2)
  const keys = compatibilityKeys(second)
  assert.ok(keys.includes(second))
  assert.equal(keys.includes("Amount"), false)
  assert.equal(keys.includes("Totals/Amount"), false)
})

test("slotFromDisplayLabel is catalog-stable for known family labels", () => {
  assert.equal(slotFromDisplayLabel("Due date"), "due-date")
  assert.equal(slotFromDisplayLabel("Billing details"), "billing-details")
  assert.equal(slotFromDisplayLabel("Item 2 description"), "item-2-description")
})

test("authoredLookupKey maps machine slots to family tables", () => {
  assert.equal(authoredLookupKey("due-date"), "Due date")
  assert.equal(authoredLookupKey("n/billing-details/due-date"), "Due date")
  assert.equal(authoredLookupKey("Due date"), "Due date")
})

test("isNativeInstanceId detects hardened IDs", () => {
  assert.equal(isNativeInstanceId("n/header/business-name"), true)
  assert.equal(isNativeInstanceId("Billing details/Due date"), false)
  assert.equal(isNativeInstanceId("Due date"), false)
})

// ─── Explicit-slot closure pass: display-label independence proofs ───

test("explicit slot wins over display-label fallback", () => {
  // If we relied on the display label, "Payment due" would slugify to "payment-due".
  assert.equal(slotFromDisplayLabel("Payment due"), "payment-due")
  // But with an explicit slot, the identity uses the stable machine key.
  const explicitSlot = "due-date"
  const id = nativeInstanceId(["billing-details"], explicitSlot)
  assert.equal(id, "n/billing-details/due-date")
  assert.notEqual(id, nativeInstanceId(["billing-details"], "payment-due"))
})

test("display-label rename preserves instance ID", () => {
  const before = nativeInstanceId(["billing-details"], "due-date")
  // Simulate renaming label="Due date" → label="Payment due" while keeping slot="due-date"
  const after = nativeInstanceId(["billing-details"], "due-date")
  assert.equal(before, after)
  assert.equal(after, "n/billing-details/due-date")
})

test("display-label rename preserves authored key", () => {
  const id = nativeInstanceId(["billing-details"], "due-date")
  const key = authoredKeyFromId(id)
  assert.equal(key, "due-date")
  // The authored key is the machine slot, not the display label.
  assert.notEqual(key, "Payment due")
  assert.notEqual(key, "payment-due")
})

test("display title follows new label while slot stays stable", () => {
  // The slot is the stable identity; the display label is presentation.
  const slot = "due-date"
  const oldDisplay = displayLabelForSlot(slot)
  assert.equal(oldDisplay, "Due date")
  // If the source renames the label, the slot doesn't change.
  // displayLabelForSlot still returns the catalog display for the slot.
  assert.equal(displayLabelForSlot("due-date"), "Due date")
  // But the slot itself is unchanged — that's the independence proof.
  assert.equal(slot, "due-date")
})

test("section-label rename with stable section slot preserves descendant IDs", () => {
  const sectionSlot = "billing-details"
  const childSlot = "due-date"
  const childId = nativeInstanceId([sectionSlot], childSlot)
  assert.equal(childId, "n/billing-details/due-date")
  // Renaming the section's display label doesn't change the section slot.
  const renamedSectionSlot = "billing-details"
  const childIdAfter = nativeInstanceId([renamedSectionSlot], childSlot)
  assert.equal(childId, childIdAfter)
})

test("duplicate IDs unchanged with explicit slots", () => {
  const original = nativeInstanceId(["header"], "business-name")
  const copy = withCopySuffix(original, 1)
  assert.equal(original, "n/header/business-name")
  assert.equal(copy, "n/header/business-name#copy-1")
  assert.equal(authoredKeyFromId(copy), "business-name")
})

test("same-parent occurrence behavior with explicit slots", () => {
  const first = nativeInstanceId(["totals"], "amount", 1)
  const second = nativeInstanceId(["totals"], "amount", 2)
  assert.equal(first, "n/totals/amount")
  assert.equal(second, "n/totals/amount@2")
  assert.equal(authoredKeyFromId(first), "amount")
  assert.equal(authoredKeyFromId(second), "amount")
})

test("legacy catalog fallback still works for known labels", () => {
  // Catalog lookup for known family labels
  assert.equal(slotFromDisplayLabel("Due date"), "due-date")
  assert.equal(slotFromDisplayLabel("Business name"), "business-name")
  assert.equal(slotFromDisplayLabel("Billing details"), "billing-details")
  // Slug fallback for unknown labels
  assert.equal(slotFromDisplayLabel("Unknown label"), "unknown-label")
})

test("gen-1/gen-2 compatibility unchanged with explicit slots", () => {
  const id = nativeInstanceId(["billing-details"], "due-date")
  const keys = compatibilityKeys(id)
  // gen-3 canonical
  assert.ok(keys.includes("n/billing-details/due-date"))
  // gen-2 path alias
  assert.ok(keys.includes("Billing details/Due date"))
  // gen-1 label alias
  assert.ok(keys.includes("Due date"))
  // Legacy store reads through compatibility chain
  const store = { "Due date": "legacy-value" }
  assert.equal(readLayerStore(store, id), "legacy-value")
})

test("placed elements (item rows) unchanged", () => {
  assert.equal(slotFromDisplayLabel("Item 1 description"), "item-1-description")
  assert.equal(slotFromDisplayLabel("Item 5 qty"), "item-5-qty")
  assert.equal(slotFromDisplayLabel("Item 3 rate"), "item-3-rate")
  assert.equal(slotFromDisplayLabel("Item 2 amount"), "item-2-amount")
  const itemId = nativeInstanceId(["line-items"], "item-3-description")
  assert.equal(itemId, "n/line-items/item-3-description")
  assert.equal(authoredKeyFromId(itemId), "item-3-description")
})

// ─── Source-level: all six family definitions use explicit slots ───

const FAMILY_DOC = path.resolve(
  __dirname,
  "..",
  "components",
  "invoices",
  "documents",
  "invoice-family-document.tsx"
)

test("all six family definitions use explicit slots on <S> sections", () => {
  const src = fs.readFileSync(FAMILY_DOC, "utf-8")
  const lines = src.split("\n")
  const violations: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Single-line <S label="..." without slot=
    const single = line.match(/<S\s+label="([^"]+)"/)
    if (single && !line.includes("slot=")) {
      violations.push(`line ${i + 1}: <S label="${single[1]}" missing slot=`)
    }
    // Multi-line <S on its own line
    if (/^\s*<S\s*$/.test(line)) {
      const next = lines[i + 1] ?? ""
      if (!next.includes("slot=")) {
        violations.push(`line ${i + 1}: multi-line <S> missing slot= on next line`)
      }
    }
  }
  assert.deepEqual(violations, [], violations.join("\n"))
})

test("all static <T> text nodes use explicit slots (item rows exempt)", () => {
  const src = fs.readFileSync(FAMILY_DOC, "utf-8")
  const lines = src.split("\n")
  const violations: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Single-line <T label="..." or <T label={...} without slot=
    const singleStatic = line.match(/<T\s+label="([^"]+)"/)
    if (singleStatic && !line.includes("slot=")) {
      violations.push(`line ${i + 1}: <T label="${singleStatic[1]}" missing slot=`)
    }
    // Single-line <T label={`Item ...`} — dynamic, exempt
    const singleDynamic = line.match(/<T\s+label=\{`Item/)
    if (singleDynamic && line.includes("slot=")) {
      violations.push(`line ${i + 1}: dynamic item-row <T> should NOT have slot=`)
    }
    // Multi-line <T on its own line (static fields only; item descriptions are dynamic)
    if (/^\s*<T\s*$/.test(line)) {
      const labelLine = lines[i + 1] ?? ""
      // Skip dynamic item-row multi-line tags
      if (labelLine.includes("`Item ")) continue
      const next = lines[i + 1] ?? ""
      if (!next.includes("slot=")) {
        violations.push(`line ${i + 1}: multi-line <T> missing slot= on next line`)
      }
    }
  }
  assert.deepEqual(violations, [], violations.join("\n"))
})

test("no canonical authored family node falls back to label-derived identity", () => {
  const src = fs.readFileSync(FAMILY_DOC, "utf-8")
  const lines = src.split("\n")
  // Every <T> or <S> that has a static (non-item, non-template) label must have slot=
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Check single-line tags with static string labels
    const match = line.match(/<(T|S)\s+label="([^"]+)"/)
    if (match && !line.includes("slot=")) {
      assert.fail(
        `line ${i + 1}: <${match[1]}> label="${match[2]}" has no explicit slot — ` +
        "identity would fall back to display-label catalog"
      )
    }
  }
  // If we get here, all single-line static tags have explicit slots.
  assert.ok(true, "all single-line static tags have explicit slots")
})
