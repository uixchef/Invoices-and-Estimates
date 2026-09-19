import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

import { shouldRunRepeatingMotion } from "./reduced-motion"
import {
  catalogRowFromDocument,
  mergeCatalogRows,
  parseSavedLayoutRecords,
  stripEphemeralDocument,
  upsertSavedLayoutRecord,
  type SavedLayoutRecord,
} from "./layout-document-store"
import type { GeneratedLayout } from "./layout-builder-types"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

function sampleLayout(name: string): GeneratedLayout {
  return {
    documentType: "Standard invoice",
    businessName: name,
    clientName: "Acme",
    emphasis: null,
    style: "studio",
    accent: "#004eeb",
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: false,
      terms: false,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Design", qty: 1, rate: 100 }],
    taxRate: 0.1,
    discountRate: 0,
    payment: {
      payLabel: "Pay",
      payUrl: "https://example.com",
      bankName: "Bank",
      accountName: name,
      accountNumber: "000",
      routingNumber: "111",
    },
    documentNumber: "INV-1",
    issueDate: "1/1/2026",
    dueDate: "1/15/2026",
  }
}

function sampleRecord(id: string, status: "Draft" | "Published"): SavedLayoutRecord {
  return {
    row: catalogRowFromDocument({
      id,
      name: "Studio invoice",
      mediumId: "a4",
      documentType: "Standard invoice",
      status,
      now: new Date(2026, 8, 19),
    }),
    document: stripEphemeralDocument({
      generatedLayout: sampleLayout("Studio invoice"),
      layoutEdits: { businessName: "Studio invoice" },
      layerText: {},
      layerStyles: {},
      hiddenLayers: [],
      layerDuplicates: {},
      placedElements: [],
      codeOverride: null,
    }),
  }
}

test("visual edit empty state does not promise multi-select", () => {
  const empty = read("components/invoices/builder/edits-empty-state.tsx")
  assert.match(empty, /Select an element to edit its content and style/)
  assert.doesNotMatch(empty, /Hold cmd/)
  assert.doesNotMatch(empty, /select multiple/i)
})

test("reachable product copy has no unsupported multi-select instruction", () => {
  const files = [
    "components/invoices/builder/edits-empty-state.tsx",
    "components/invoices/builder/edits-overlay.tsx",
    "components/invoices/builder/visual-edits-panel.tsx",
    "components/invoices/builder/layout-builder-toolbar.tsx",
    "components/invoices/builder/layout-builder-canvas.tsx",
  ]
  for (const file of files) {
    const source = read(file)
    assert.doesNotMatch(source, /Hold cmd to select multiple/)
    assert.doesNotMatch(source, /select multiple elements/i)
  }
})

test("selection remains intentionally single-selection", () => {
  const context = read("lib/layout-builder-context.tsx")
  assert.match(context, /Single-selection: picking a layer replaces/)
  assert.match(
    context,
    /return \[\{ id: nextMessageId\(\), label, layer: inspectKey \}\]/
  )
  assert.doesNotMatch(context, /current\.concat/)
})

test("Save and Publish commit the structured document, not toast-only success", () => {
  const header = read("components/invoices/builder/layout-builder-header.tsx")
  assert.match(header, /saveLayout\("Draft"\)/)
  assert.match(header, /saveLayout\("Published"\)/)
  assert.doesNotMatch(header, /Persistence is stubbed/)
  const context = read("lib/layout-builder-context.tsx")
  assert.match(context, /catalog\?\.upsertRecord\(record\)/)
  assert.match(context, /setHasUnsavedChanges\(false\)/)
})

test("saved layout records round-trip through the local catalog", () => {
  const first = sampleRecord("layout-saved-1", "Draft")
  const updated: SavedLayoutRecord = {
    ...first,
    row: { ...first.row, status: "Published", name: "Studio invoice published" },
    document: {
      ...first.document,
      generatedLayout: sampleLayout("Studio invoice published"),
    },
  }
  const next = upsertSavedLayoutRecord(
    upsertSavedLayoutRecord([], first),
    updated
  )
  assert.equal(next.length, 1)
  assert.equal(next[0].row.status, "Published")
  assert.equal(next[0].document.generatedLayout.businessName, "Studio invoice published")

  const merged = mergeCatalogRows(
    [{ ...first.row, name: "Catalog original", status: "Draft" }],
    next.map((record) => record.row)
  )
  assert.equal(merged[0].status, "Published")
  assert.equal(merged[0].name, "Studio invoice published")
})

test("document store ignores blob URLs and ephemeral UI fields", () => {
  const stripped = stripEphemeralDocument({
    generatedLayout: sampleLayout("Kept"),
    layoutEdits: { businessName: "Kept" },
    layerText: { "Business name": "Kept" },
    layerStyles: {},
    hiddenLayers: [],
    layerDuplicates: {},
    placedElements: [],
    codeOverride: "<html></html>",
  })
  assert.equal(stripped.generatedLayout.businessName, "Kept")
  assert.equal(stripped.codeOverride, "<html></html>")
  assert.equal("selections" in stripped, false)
  assert.equal("messages" in stripped, false)
  assert.equal("attachments" in stripped, false)
})

test("malformed catalog localStorage is ignored", () => {
  assert.deepEqual(parseSavedLayoutRecords("not-json"), [])
  assert.deepEqual(parseSavedLayoutRecords(JSON.stringify({ v: 99, records: [] })), [])
})

test("unsaved flag clears only after a real catalog commit", () => {
  const context = read("lib/layout-builder-context.tsx")
  const saveFn = context.slice(context.indexOf("const saveLayout = useCallback"))
  assert.match(saveFn, /catalog\?\.upsertRecord/)
  assert.match(saveFn, /setHasUnsavedChanges\(false\)/)
})

function focusableShellButtons(source: string): string[] {
  const buttons = source.match(/<button[\s\S]*?<\/button>/g) ?? []
  return buttons.filter((button) => {
    const hasAction =
      /onClick=/.test(button) ||
      /disabled/.test(button) ||
      /href=/.test(button)
    return !hasAction
  })
}

test("payment shell has no focusable no-op buttons", () => {
  const topbar = read("components/payment-hub/Topbar.tsx")
  const sidebar = read("components/payment-hub/Sidebar.tsx")
  assert.deepEqual(focusableShellButtons(topbar), [])
  assert.deepEqual(focusableShellButtons(sidebar), [])
  assert.match(topbar, /SHELL_UNAVAILABLE_LABEL/)
  assert.match(sidebar, /SHELL_UNAVAILABLE_LABEL/)
})

test("working shell links remain", () => {
  const topbar = read("components/payment-hub/Topbar.tsx")
  const sidebar = read("components/payment-hub/Sidebar.tsx")
  assert.match(topbar, /internalHref: "\/invoices"/)
  assert.match(topbar, /target: "overview"/)
  assert.match(sidebar, /getSidebarNavHref/)
  assert.match(sidebar, /onClick=\{toggleCollapsed\}/)
})

test("reduced-motion stops repeating hero and placeholder timers", () => {
  assert.equal(shouldRunRepeatingMotion(true), false)
  assert.equal(shouldRunRepeatingMotion(false), true)
  const accent = read("components/invoices/hero-accent.tsx")
  const prompt = read("components/invoices/create-with-ai-prompt-input.tsx")
  assert.match(accent, /shouldRunRepeatingMotion\(reduceMotion\)/)
  assert.match(accent, /setPhase\("holding"\)/)
  assert.match(prompt, /shouldRunRepeatingMotion\(prefersReducedMotion\(\)\)/)
  assert.match(prompt, /setInterval/)
})

test("normal-motion typewriter and placeholder rotation remain", () => {
  const accent = read("components/invoices/hero-accent.tsx")
  const prompt = read("components/invoices/create-with-ai-prompt-input.tsx")
  assert.match(accent, /TYPE_MS/)
  assert.match(accent, /DELETE_MS/)
  assert.match(prompt, /PLACEHOLDER_ROTATE_MS/)
  assert.match(prompt, /PROMPT_PLACEHOLDER_SUGGESTIONS/)
})

test("layouts header uses merchant-facing copy", () => {
  const header = read("components/invoices/invoice-layout-header.tsx")
  assert.match(header, />\s*Layouts\s*</)
  assert.match(
    header,
    /Design reusable layouts for invoices, estimates, and receipts\./
  )
  assert.doesNotMatch(header, /handlebars/)
  assert.doesNotMatch(header, /platform document types/)
})
