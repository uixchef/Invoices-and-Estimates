import assert from "node:assert/strict"
import test from "node:test"

import { FAMILY_ACCENT } from "./layout-family"
import { demoPaymentDetails } from "./demo-payment"
import type { GeneratedLayout, PlacedElement } from "./layout-builder-types"
import {
  MAX_DOCUMENT_VERSIONS,
  appendDocumentVersion,
  canRestoreDocumentVersion,
  cloneDocumentVersionSnapshot,
  currentDocumentVersionId,
  documentVersionContainsBinaries,
  documentVersionLabel,
  documentVersionSnapshotOmitsEphemeral,
  estimateDocumentVersionBytes,
  findDocumentVersion,
  fingerprintDocumentSnapshot,
  formatVersionTimestamp,
  historyToUndoSnapshot,
  matchingDocumentVersionId,
  nextDocumentVersionId,
  persistableDocumentVersions,
  resetDocumentVersionIdCounterForTests,
  shouldCoalesceDocumentVersions,
  documentVersionAppendKind,
  syncDocumentVersionIdCounter,
  type DocumentVersion,
  type DocumentVersionSnapshot,
} from "./document-versions"

function layout(overrides: Partial<GeneratedLayout> = {}): GeneratedLayout {
  const businessName = "Northwind Studio"
  const documentNumber = "INV-2026-0142"
  return {
    documentType: "Standard invoice",
    businessName,
    clientName: "Atelier Mär",
    emphasis: null,
    style: "studio",
    accent: FAMILY_ACCENT.studio,
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Brand identity", qty: 1, rate: 4800 }],
    taxRate: 0.1,
    discountRate: 0,
    documentNumber,
    issueDate: "Sep 17, 2026",
    dueDate: "Oct 1, 2026",
    payment: demoPaymentDetails({ businessName, documentNumber }),
    ...overrides,
  }
}

function snapshot(
  overrides: Partial<DocumentVersionSnapshot> = {}
): DocumentVersionSnapshot {
  const generatedLayout = overrides.generatedLayout ?? layout()
  return {
    layoutEdits: {},
    layerText: {},
    layerStyles: {},
    hiddenLayers: [],
    layerDuplicates: {},
    placedElements: [],
    codeOverride: null,
    baseLayout: null,
    generatedLayout,
    ...overrides,
  }
}

function add(
  versions: DocumentVersion[],
  meta: Parameters<typeof appendDocumentVersion>[1],
  snap: DocumentVersionSnapshot,
  createdAt = 1_000
) {
  return appendDocumentVersion(versions, meta, snap, {
    id: nextDocumentVersionId(),
    createdAt,
  })
}

test("initial generated document creates the first meaningful version", () => {
  resetDocumentVersionIdCounterForTests()
  const versions = add([], { origin: "generated" }, snapshot())
  assert.equal(versions.length, 1)
  assert.equal(versions[0]?.id, "dv-1")
  assert.equal(versions[0]?.label, "Generated layout")
  assert.equal(currentDocumentVersionId(versions), "dv-1")
})

test("version ids are stable and not index- or timestamp-derived", () => {
  resetDocumentVersionIdCounterForTests()
  const first = add([], { origin: "generated" }, snapshot(), 5_000)
  const second = add(
    first,
    { origin: "manual-text", target: "Business name" },
    snapshot({ layerText: { "Business name": "A" } }),
    9_000
  )
  assert.equal(second[0]?.id, "dv-1")
  assert.equal(second[1]?.id, "dv-2")
  assert.notEqual(second[1]?.id, "1")
  assert.notEqual(second[1]?.id, String(second[1]?.createdAt))
})

test("continuous text editing on the same target coalesces into one version", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "manual-text", target: "Business name" },
    snapshot({ layerText: { "Business name": "N" } }),
    2_000
  )
  versions = add(
    versions,
    { origin: "manual-text", target: "Business name" },
    snapshot({ layerText: { "Business name": "No" } }),
    2_100
  )
  versions = add(
    versions,
    { origin: "manual-text", target: "Business name" },
    snapshot({ layerText: { "Business name": "Northwind" } }),
    2_200
  )
  assert.equal(versions.length, 2)
  assert.equal(versions[1]?.id, "dv-2")
  assert.equal(versions[1]?.snapshot.layerText["Business name"], "Northwind")
  assert.equal(versions[1]?.createdAt, 2_200)
})

test("a different target or origin starts a new version", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "manual-text", target: "Business name" },
    snapshot({ layerText: { "Business name": "A" } })
  )
  versions = add(
    versions,
    { origin: "manual-style", target: "Business name" },
    snapshot({
      layerText: { "Business name": "A" },
      layerStyles: { "Business name": { color: "#111" } },
    })
  )
  assert.equal(versions.length, 3)
})

test("document action labels are deterministic and one version each", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "document-action", actionId: "add-discount-row" },
    snapshot({
      generatedLayout: layout({ sections: { ...layout().sections, discount: true } }),
    })
  )
  versions = add(
    versions,
    { origin: "document-action", actionId: "add-pay-online" },
    snapshot({
      generatedLayout: layout({
        sections: { ...layout().sections, discount: true, onlinePayment: true },
      }),
    })
  )
  assert.equal(versions[1]?.label, "Added discount")
  assert.equal(versions[2]?.label, "Added Pay online")
  assert.equal(versions[1]?.actionId, "add-discount-row")
  assert.equal(versions[2]?.actionId, "add-pay-online")
  assert.equal(versions.length, 3)
  assert.equal(
    shouldCoalesceDocumentVersions(versions[1], {
      origin: "document-action",
      actionId: "add-discount-row",
    }),
    false
  )
})

test("discount then Pay online do not coalesce", () => {
  resetDocumentVersionIdCounterForTests()
  const generated = snapshot()
  const discounted = snapshot({
    generatedLayout: layout({ sections: { ...layout().sections, discount: true } }),
  })
  const payOnline = snapshot({
    generatedLayout: layout({
      sections: { ...layout().sections, discount: true, onlinePayment: true },
    }),
  })
  let versions = add([], { origin: "generated" }, generated)
  versions = add(versions, { origin: "document-action", actionId: "add-discount-row" }, discounted)
  versions = add(versions, { origin: "document-action", actionId: "add-pay-online" }, payOnline)
  assert.equal(versions.length, 3)
  assert.equal(versions[1]?.label, "Added discount")
  assert.equal(versions[2]?.label, "Added Pay online")
  assert.equal(
    shouldCoalesceDocumentVersions(versions[1], {
      origin: "document-action",
      actionId: "add-pay-online",
    }),
    false
  )
})

test("Pay online then payment details do not coalesce", () => {
  resetDocumentVersionIdCounterForTests()
  const payOnline = snapshot({
    generatedLayout: layout({
      sections: { ...layout().sections, onlinePayment: true },
    }),
  })
  const details = snapshot({
    generatedLayout: layout({
      sections: { ...layout().sections, onlinePayment: true, paymentDetails: true },
    }),
  })
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(versions, { origin: "document-action", actionId: "add-pay-online" }, payOnline)
  versions = add(
    versions,
    { origin: "document-action", actionId: "add-payment-details" },
    details
  )
  assert.equal(versions.length, 3)
  assert.equal(versions[2]?.label, "Added bank details")
})

test("repeated idempotent document action with no mutation creates no extra version", () => {
  resetDocumentVersionIdCounterForTests()
  const discounted = snapshot({
    generatedLayout: layout({ sections: { ...layout().sections, discount: true } }),
  })
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(versions, { origin: "document-action", actionId: "add-discount-row" }, discounted)
  const afterFirst = versions.length
  versions = add(versions, { origin: "document-action", actionId: "add-discount-row" }, discounted)
  assert.equal(versions.length, afterFirst)
  assert.equal(documentVersionAppendKind(versions[1], {
    origin: "document-action",
    actionId: "add-discount-row",
  }, discounted), "skip")
})

test("continuous style editing on the same target coalesces into one version", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "manual-style", target: "Business name" },
    snapshot({ layerStyles: { "Business name": { color: "#111" } } })
  )
  versions = add(
    versions,
    { origin: "manual-style", target: "Business name" },
    snapshot({ layerStyles: { "Business name": { color: "#222" } } })
  )
  assert.equal(versions.length, 2)
  assert.equal(versions[1]?.snapshot.layerStyles["Business name"]?.color, "#222")
  assert.equal(
    shouldCoalesceDocumentVersions(versions[1], {
      origin: "manual-style",
      target: "Business name",
    }),
    true
  )
})

test("restore does not coalesce with the prior action", () => {
  resetDocumentVersionIdCounterForTests()
  const v1 = snapshot()
  let versions = add([], { origin: "generated" }, v1)
  versions = add(versions, { origin: "document-action", actionId: "add-discount-row" }, snapshot({
    generatedLayout: layout({ sections: { ...layout().sections, discount: true } }),
  }))
  versions = add(versions, { origin: "restore", restoredId: "dv-1" }, v1)
  assert.equal(versions.length, 3)
  assert.equal(versions[2]?.label, "Restored earlier version")
  assert.equal(
    shouldCoalesceDocumentVersions(versions[1], { origin: "restore", restoredId: "dv-1" }),
    false
  )
})

test("duplicate operations remain separate versions even on the same target", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "duplicate", target: "Header" },
    snapshot({ layerDuplicates: { Header: 1 } })
  )
  versions = add(
    versions,
    { origin: "duplicate", target: "Header" },
    snapshot({ layerDuplicates: { Header: 2 } })
  )
  assert.equal(versions.length, 3)
  assert.equal(versions[1]?.label, "Duplicated Header")
  assert.equal(versions[2]?.label, "Duplicated Header")
})

test("bold branded scheme is a distinct document-action version", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "document-action", actionId: "switch-bold-brand" },
    snapshot({ generatedLayout: layout({ accent: "#0418c7" }) })
  )
  assert.equal(versions[1]?.label, "Applied bold branded scheme")
  assert.equal(
    shouldCoalesceDocumentVersions(versions[1], {
      origin: "document-action",
      actionId: "add-discount-row",
    }),
    false
  )
})


test("duplicate and delete each create one version", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "duplicate", target: "Header" },
    snapshot({ layerDuplicates: { Header: 1 } })
  )
  versions = add(
    versions,
    { origin: "delete", target: "Notes" },
    snapshot({ hiddenLayers: ["Notes"] })
  )
  assert.equal(versions[1]?.label, "Duplicated Header")
  assert.equal(versions[2]?.label, "Removed Notes")
  assert.equal(versions.length, 3)
})

test("saved-item insertion is a distinct document version", () => {
  resetDocumentVersionIdCounterForTests()
  const placed: PlacedElement[] = [
    {
      id: "placed-1",
      kind: "heading",
      label: "Payment terms",
      zone: "end",
      content: "Net 14",
    },
  ]
  const versions = add(
    add([], { origin: "generated" }, snapshot()),
    { origin: "saved-item" },
    snapshot({ placedElements: placed })
  )
  assert.equal(versions[1]?.label, "Inserted saved item")
  assert.equal(versions[1]?.snapshot.placedElements[0]?.id, "placed-1")
})

test("snapshot excludes selection, chat, composer, and attachment binaries", () => {
  const snap = snapshot({
    layerText: { "Business name": "Northwind" },
    placedElements: [
      {
        id: "placed-1",
        kind: "paragraph",
        label: "Note",
        zone: "end",
        content: "Thanks",
      },
    ],
  })
  assert.equal(documentVersionSnapshotOmitsEphemeral(snap), true)
  assert.equal(documentVersionContainsBinaries(snap), false)
  const raw = JSON.stringify(snap)
  assert.equal(raw.includes("messages"), false)
  assert.equal(raw.includes("composerDraft"), false)
  assert.equal(raw.includes("blob:"), false)
  assert.equal(raw.includes("att-"), false)
  const polluted = { ...snap, composerDraft: { text: "unsent" } }
  assert.equal(
    fingerprintDocumentSnapshot(snap),
    fingerprintDocumentSnapshot(polluted as typeof snap)
  )
})

test("previewing an old version does not rewrite the live snapshot", () => {
  resetDocumentVersionIdCounterForTests()
  const live = snapshot({ layerText: { "Business name": "Current Co" } })
  const versions = add(
    add([], { origin: "generated" }, snapshot({ layerText: {} })),
    { origin: "manual-text", target: "Business name" },
    live
  )
  const preview = cloneDocumentVersionSnapshot(versions[0]!.snapshot)
  preview.layerText = { "Business name": "tampered" }
  assert.equal(versions[0]?.snapshot.layerText["Business name"], undefined)
  assert.equal(live.layerText["Business name"], "Current Co")
})

test("restore creates a NEW current version and does not truncate later ones", () => {
  resetDocumentVersionIdCounterForTests()
  let versions = add([], { origin: "generated" }, snapshot())
  versions = add(
    versions,
    { origin: "manual-text", target: "Business name" },
    snapshot({ layerText: { "Business name": "V2" } })
  )
  versions = add(
    versions,
    { origin: "manual-text", target: "Client name" },
    snapshot({
      layerText: { "Business name": "V2", "Client name": "V3" },
    })
  )
  const restored = versions[0]!
  assert.equal(canRestoreDocumentVersion(versions, restored.id), true)
  assert.equal(canRestoreDocumentVersion(versions, versions[2]!.id), false)
  versions = add(
    versions,
    { origin: "restore", restoredId: restored.id },
    restored.snapshot
  )
  assert.equal(versions.length, 4)
  assert.equal(versions[3]?.label, "Restored earlier version")
  assert.equal(versions[3]?.restoredId, "dv-1")
  assert.equal(findDocumentVersion(versions, "dv-2")?.label, "Updated Business name")
  assert.equal(currentDocumentVersionId(versions), "dv-4")
})

test("restore snapshot uses frozen generated layout as the undo base", () => {
  const generated = layout({ businessName: "Saffron" })
  const snap = snapshot({ generatedLayout: generated })
  const undo = historyToUndoSnapshot(snap)
  assert.equal(undo.baseLayout?.businessName, "Saffron")
  assert.equal(undo.placedElements, snap.placedElements)
})

test("native and placed identities in a snapshot survive clone/restore", () => {
  const snap = snapshot({
    placedElements: [
      {
        id: "placed-4",
        kind: "heading",
        label: "Header",
        zone: "end",
        content: "Hello",
      },
    ],
    layerDuplicates: { "n/header/business-name": 1 },
    layerStyles: {
      "n/header#copy-1/business-name": { color: "#111827" },
    },
  })
  const cloned = cloneDocumentVersionSnapshot(snap)
  assert.equal(cloned.placedElements[0]?.id, "placed-4")
  assert.equal(cloned.layerDuplicates["n/header/business-name"], 1)
  assert.equal(
    cloned.layerStyles["n/header#copy-1/business-name"]?.color,
    "#111827"
  )
})

test("brand document state is snapshotted without a board library", () => {
  const snap = snapshot({
    layoutEdits: {
      brand: { boardId: "folio", themeId: "ink", typeId: "pair-1" },
      accent: "#111827",
    },
  })
  assert.equal(snap.layoutEdits.brand?.boardId, "folio")
  assert.equal("customBoards" in snap, false)
  assert.equal("savedItems" in snap, false)
})

test("reference-generated documents snapshot the resulting layout, not attachments", () => {
  const snap = snapshot({
    generatedLayout: layout({ businessName: "Saffron", style: "statement" }),
  })
  assert.equal(snap.generatedLayout.businessName, "Saffron")
  assert.equal(documentVersionContainsBinaries(snap), false)
})

test("bounded retention drops the oldest versions, keeping the newest", () => {
  resetDocumentVersionIdCounterForTests()
  let versions: DocumentVersion[] = []
  for (let index = 0; index < MAX_DOCUMENT_VERSIONS + 5; index += 1) {
    versions = appendDocumentVersion(
      versions,
      { origin: "manual", target: `edit-${index}` },
      snapshot({ layerText: { note: String(index) } }),
      { id: nextDocumentVersionId(), createdAt: index, max: MAX_DOCUMENT_VERSIONS }
    )
  }
  assert.equal(versions.length, MAX_DOCUMENT_VERSIONS)
  assert.equal(versions[0]?.snapshot.layerText.note, "5")
  assert.equal(
    versions[versions.length - 1]?.snapshot.layerText.note,
    String(MAX_DOCUMENT_VERSIONS + 4)
  )
})

test("timestamp formatting is clock-injected and not fake relative copy", () => {
  const morning = Date.UTC(2026, 8, 19, 8, 5, 0)
  const laterSameDay = Date.UTC(2026, 8, 19, 14, 22, 0)
  const nextDay = Date.UTC(2026, 8, 20, 9, 0, 0)
  assert.match(formatVersionTimestamp(morning, laterSameDay), /^\d{2}:\d{2}$/)
  assert.equal(formatVersionTimestamp(morning, laterSameDay).includes("ago"), false)
  assert.match(formatVersionTimestamp(morning, nextDay), /Sep/)
})

test("snapshot size stays in the low kilobytes for a representative document", () => {
  resetDocumentVersionIdCounterForTests()
  const placed: PlacedElement[] = Array.from({ length: 8 }, (_, index) => ({
    id: `placed-${index + 1}`,
    kind: "paragraph",
    label: `Block ${index + 1}`,
    zone: "end" as const,
    content: "Payment terms and project notes for the current invoice cycle.",
  }))
  const version: DocumentVersion = {
    id: "dv-size",
    createdAt: 1,
    label: "Generated layout",
    origin: "generated",
    snapshot: snapshot({
      placedElements: placed,
      layerText: { "Business name": "Northwind Studio" },
      generatedLayout: layout({
        sections: {
          logo: true,
          items: true,
          taxes: true,
          notes: true,
          terms: true,
          discount: false,
          onlinePayment: false,
          paymentDetails: false,
        },
      }),
    }),
  }
  const one = estimateDocumentVersionBytes(version)
  assert.ok(one < 20_000, `expected <20KB, got ${one}`)
  const ten = one * 10
  const twentyFive = one * 25
  assert.ok(ten < 200_000)
  assert.ok(twentyFive < 500_000)
  assert.ok(one * MAX_DOCUMENT_VERSIONS < 800_000)
})

test("AI edit and generated labels stay truthful generics", () => {
  assert.equal(documentVersionLabel({ origin: "ai-edit" }), "AI edit")
  assert.equal(documentVersionLabel({ origin: "generated" }), "Generated layout")
  assert.equal(documentVersionLabel({ origin: "manual" }), "Manual edit")
  assert.equal(documentVersionLabel({ origin: "code" }), "Edited code")
  assert.equal(
    documentVersionLabel({ origin: "code", target: "Revert" }),
    "Reverted to layout"
  )
})

test("code edits do not coalesce into one version per keystroke origin", () => {
  resetDocumentVersionIdCounterForTests()
  const first = add([], { origin: "code" }, snapshot({ codeOverride: "<p>a</p>" }))
  assert.equal(shouldCoalesceDocumentVersions(first[0], { origin: "code" }), false)
  const restored = snapshot({ codeOverride: "<p>override</p>" })
  const withOverride = add(first, { origin: "code" }, restored)
  assert.equal(withOverride.at(-1)?.snapshot.codeOverride, "<p>override</p>")
  const synced = add(withOverride, { origin: "code", target: "Revert" }, snapshot())
  assert.equal(synced.at(-1)?.snapshot.codeOverride, null)
  assert.equal(synced.at(-1)?.label, "Reverted to layout")
})

test("persisted versions stay document-only and resume id allocation safely", () => {
  resetDocumentVersionIdCounterForTests()
  const versions = add([], { origin: "generated" }, snapshot())
  const persisted = persistableDocumentVersions(versions)
  assert.equal(JSON.stringify(persisted).includes("messages"), false)
  assert.equal(documentVersionContainsBinaries(persisted[0]!.snapshot), false)
  persisted[0]!.snapshot.layerText = { tamper: "x" }
  assert.equal(versions[0]?.snapshot.layerText.tamper, undefined)
  syncDocumentVersionIdCounter(persisted)
  assert.equal(nextDocumentVersionId(), "dv-2")
})

// ---------------------------------------------------------------------------
// Current-state matching / fingerprint tests
// ---------------------------------------------------------------------------

test("fingerprint is deterministic and ignores key insertion order", () => {
  const snap = snapshot({ layerText: { a: "1", b: "2" } })
  const reordered: DocumentVersionSnapshot = {
    ...snapshot(),
    layerText: { b: "2", a: "1" },
  }
  assert.equal(fingerprintDocumentSnapshot(snap), fingerprintDocumentSnapshot(reordered))
})

test("fingerprint differs when document content differs", () => {
  const a = snapshot({ layerText: { name: "A" } })
  const b = snapshot({ layerText: { name: "B" } })
  assert.notEqual(fingerprintDocumentSnapshot(a), fingerprintDocumentSnapshot(b))
})

test("matchingDocumentVersionId returns the latest matching version", () => {
  resetDocumentVersionIdCounterForTests()
  const base = snapshot()
  const changed = snapshot({ layerText: { name: "V2" } })
  let versions = add([], { origin: "generated" }, base)
  versions = add(versions, { origin: "manual-text", target: "name" }, changed)
  // Live matches the base (V1) — but V2 also matches if we restore V1 later
  const fpBase = fingerprintDocumentSnapshot(base)
  assert.equal(matchingDocumentVersionId(versions, fpBase), "dv-1")
  const fpChanged = fingerprintDocumentSnapshot(changed)
  assert.equal(matchingDocumentVersionId(versions, fpChanged), "dv-2")
})

test("matchingDocumentVersionId returns null when live matches no version", () => {
  resetDocumentVersionIdCounterForTests()
  const versions = add([], { origin: "generated" }, snapshot())
  const unknown = snapshot({ layerText: { name: "uncommitted" } })
  assert.equal(
    matchingDocumentVersionId(versions, fingerprintDocumentSnapshot(unknown)),
    null
  )
})

test("matchingDocumentVersionId returns empty string for empty fingerprint", () => {
  resetDocumentVersionIdCounterForTests()
  const versions = add([], { origin: "generated" }, snapshot())
  assert.equal(matchingDocumentVersionId(versions, ""), null)
})

test("canRestoreDocumentVersion uses explicit currentId when provided", () => {
  resetDocumentVersionIdCounterForTests()
  const versions = add([], { origin: "generated" }, snapshot())
  const v1 = versions[0]!
  // Latest is dv-1, but if currentId is null (live matches nothing), we can still restore
  assert.equal(canRestoreDocumentVersion(versions, v1.id, null), true)
  // If currentId IS dv-1, we cannot restore it
  assert.equal(canRestoreDocumentVersion(versions, v1.id, v1.id), false)
})

test("restore append keeps restore row and matching shifts to restored snapshot", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "V1" } })
  const v2Snap = snapshot({ layerText: { name: "V2", client: "C2" } })
  const v3Snap = snapshot({ layerText: { name: "V3", client: "C3" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  versions = add(versions, { origin: "manual-text", target: "name" }, v2Snap)
  versions = add(versions, { origin: "manual-text", target: "client" }, v3Snap)
  // Restore V1 → append V4 with V1's snapshot
  versions = add(versions, { origin: "restore", restoredId: "dv-1" }, v1Snap)
  assert.equal(versions.length, 4)
  assert.equal(versions[3]!.label, "Restored earlier version")
  assert.equal(versions[3]!.restoredId, "dv-1")
  // Live = V1 snapshot → matches both dv-1 and dv-4; latest matching = dv-4
  const fp = fingerprintDocumentSnapshot(v1Snap)
  assert.equal(matchingDocumentVersionId(versions, fp), "dv-4")
  // Later versions not truncated
  assert.equal(findDocumentVersion(versions, "dv-2")?.label, "Updated name")
  assert.equal(findDocumentVersion(versions, "dv-3")?.label, "Updated client")
})

test("undo restore: live matches pre-restore version, not the restore row", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "V1" } })
  const v3Snap = snapshot({ layerText: { name: "V3", client: "C3" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  versions = add(versions, { origin: "manual-text", target: "name" }, snapshot({ layerText: { name: "V2" } }))
  versions = add(versions, { origin: "manual-text", target: "client" }, v3Snap)
  // Restore V1 → V4
  versions = add(versions, { origin: "restore", restoredId: "dv-1" }, v1Snap)
  // Undo: live returns to V3 state
  const fpV3 = fingerprintDocumentSnapshot(v3Snap)
  assert.equal(matchingDocumentVersionId(versions, fpV3), "dv-3")
  assert.notEqual(matchingDocumentVersionId(versions, fpV3), "dv-4")
  // V4 remains in timeline
  assert.equal(findDocumentVersion(versions, "dv-4")?.label, "Restored earlier version")
})

test("redo restore: live matches restore row again", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "V1" } })
  const v3Snap = snapshot({ layerText: { name: "V3", client: "C3" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  versions = add(versions, { origin: "manual-text", target: "name" }, snapshot({ layerText: { name: "V2" } }))
  versions = add(versions, { origin: "manual-text", target: "client" }, v3Snap)
  versions = add(versions, { origin: "restore", restoredId: "dv-1" }, v1Snap)
  // Redo: live = V1 snapshot again → matches dv-1 and dv-4, latest = dv-4
  const fpV1 = fingerprintDocumentSnapshot(v1Snap)
  assert.equal(matchingDocumentVersionId(versions, fpV1), "dv-4")
})

test("normal edit undo: live matches older version, not latest timeline row", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "A" } })
  const v2Snap = snapshot({ layerText: { name: "B" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  versions = add(versions, { origin: "manual-text", target: "name" }, v2Snap)
  // Undo: live = V1 state → matches dv-1, not dv-2
  const fpV1 = fingerprintDocumentSnapshot(v1Snap)
  assert.equal(matchingDocumentVersionId(versions, fpV1), "dv-1")
  const fpV2 = fingerprintDocumentSnapshot(v2Snap)
  assert.equal(matchingDocumentVersionId(versions, fpV2), "dv-2")
})

test("coalesced edit: intermediate undo state matches no version", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "A" } })
  const v2Snap = snapshot({ layerText: { name: "BC" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  // Coalesced: three keystrokes → one version V2
  versions = add(versions, { origin: "manual-text", target: "name" }, snapshot({ layerText: { name: "B" } }), 2_000)
  versions = add(versions, { origin: "manual-text", target: "name" }, snapshot({ layerText: { name: "BC" } }), 2_100)
  assert.equal(versions.length, 2)
  // Undo one keystroke: live = "B" → matches neither V1 ("A") nor V2 ("BC")
  const intermediate = snapshot({ layerText: { name: "B" } })
  assert.equal(
    matchingDocumentVersionId(versions, fingerprintDocumentSnapshot(intermediate)),
    null
  )
})

test("new edit after undo restore appends and becomes current", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "V1" } })
  const v2Snap = snapshot({ layerText: { name: "V2", client: "C2" } })
  const v3Snap = snapshot({ layerText: { name: "V3", client: "C3" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  versions = add(versions, { origin: "manual-text", target: "name" }, v2Snap)
  versions = add(versions, { origin: "manual-text", target: "client" }, v3Snap)
  // Restore V1 → V4
  versions = add(versions, { origin: "restore", restoredId: "dv-1" }, v1Snap)
  assert.equal(versions.length, 4)
  // Undo restore → live = V3
  // New edit → V5 (different target so it doesn't coalesce with V3)
  const v5Snap = snapshot({ layerText: { name: "V3", client: "C3", note: "N5" } })
  versions = add(versions, { origin: "manual-text", target: "note" }, v5Snap)
  assert.equal(versions.length, 5)
  assert.equal(versions[4]!.id, "dv-5")
  assert.equal(matchingDocumentVersionId(versions, fingerprintDocumentSnapshot(v5Snap)), "dv-5")
  // V4 remains
  assert.equal(findDocumentVersion(versions, "dv-4")?.label, "Restored earlier version")
})

test("chat restore appends a restore version event", () => {
  resetDocumentVersionIdCounterForTests()
  const v1Snap = snapshot({ layerText: { name: "V1" } })
  let versions = add([], { origin: "generated" }, v1Snap)
  // Simulate chat-turn restore: same origin as toolbar restore
  versions = add(versions, { origin: "restore", restoredId: "chat-msg-1" }, v1Snap)
  assert.equal(versions.length, 2)
  assert.equal(versions[1]!.label, "Restored earlier version")
  assert.equal(versions[1]!.restoredId, "chat-msg-1")
  // Live matches both dv-1 and dv-2; latest = dv-2
  assert.equal(
    matchingDocumentVersionId(versions, fingerprintDocumentSnapshot(v1Snap)),
    "dv-2"
  )
})

test("no restore/version creation loop: coalesced same-origin same-target does not append", () => {
  resetDocumentVersionIdCounterForTests()
  const generated = snapshot({ layerText: { name: "Start" } })
  const edited = snapshot({ layerText: { name: "Same" } })
  let versions = add([], { origin: "generated" }, generated)
  versions = add(versions, { origin: "manual-text", target: "name" }, edited)
  assert.equal(versions.length, 2)
  const before2 = versions.length
  versions = add(versions, { origin: "manual-text", target: "name" }, edited)
  assert.equal(versions.length, before2)
})
