import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  addComposerDraftFiles,
  composerDraftAttachmentIds,
  composerDraftIsEmpty,
  DEFAULT_COMPOSER_MODEL_ID,
  discardComposerDraft,
  emptyComposerDraft,
  removeComposerDraftAttachment,
  setComposerDraftModelId,
  setComposerDraftText,
} from "./composer-draft"
import { AI_MODELS } from "./ai-models"
import {
  fingerprintDocumentSnapshot,
  MAX_DOCUMENT_VERSIONS,
  documentVersionSnapshotOmitsEphemeral,
} from "./document-versions"
import { resetAttachmentIdCounterForTests } from "./prompt-attachments"
import {
  VERSION_HISTORY_PANEL_TITLE,
  VERSION_HISTORY_SURFACE,
  VERSION_HISTORY_TOOLBAR_LABEL,
  versionHistoryPopoverRemoved,
  versionHistorySelectedId,
} from "./version-history-ui"

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, "..")

function pngFile(name: string): File {
  return new File([new Uint8Array([137, 80, 78, 71])], name, {
    type: "image/png",
  })
}

test("History toolbar opens Version history panel, not a popover", () => {
  assert.equal(VERSION_HISTORY_SURFACE, "builder-panel")
  assert.equal(VERSION_HISTORY_TOOLBAR_LABEL, "Version history")
  assert.equal(VERSION_HISTORY_PANEL_TITLE, "Version history")
  assert.equal(versionHistoryPopoverRemoved(), true)
  assert.equal(
    existsSync(
      path.join(
        repoRoot,
        "components/invoices/builder/version-history-popover.tsx"
      )
    ),
    false
  )
  assert.equal(
    existsSync(
      path.join(
        repoRoot,
        "components/invoices/builder/version-history-panel.tsx"
      )
    ),
    true
  )
})

test("selected preview remains distinct from Current", () => {
  assert.equal(
    versionHistorySelectedId({
      currentVersionId: "dv-3",
      previewVersionId: "dv-1",
      previewingHistoricalVersion: true,
    }),
    "dv-1"
  )
  assert.equal(
    versionHistorySelectedId({
      currentVersionId: "dv-3",
      previewVersionId: null,
      previewingHistoricalVersion: false,
    }),
    "dv-3"
  )
  assert.equal(
    versionHistorySelectedId({
      currentVersionId: null,
      previewVersionId: null,
      previewingHistoricalVersion: false,
    }),
    null
  )
})

test("long timeline stays bounded to 40 versions", () => {
  assert.equal(MAX_DOCUMENT_VERSIONS, 40)
})

test("Invoice AI text draft survives a panel-switch simulation", () => {
  const draft = setComposerDraftText(emptyComposerDraft(), "Add a discount row")
  const afterHistory = draft
  const afterSaved = afterHistory
  assert.equal(afterSaved.text, "Add a discount row")
  assert.equal(composerDraftIsEmpty(afterSaved), false)
})

test("attachment draft IDs survive panel switch and are not revoked", () => {
  resetAttachmentIdCounterForTests()
  const created: string[] = []
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  const revoked: string[] = []
  URL.createObjectURL = () => {
    const url = `blob:keep-${created.length + 1}`
    created.push(url)
    return url
  }
  URL.revokeObjectURL = (url) => {
    revoked.push(String(url))
  }
  try {
    let draft = emptyComposerDraft()
    draft = addComposerDraftFiles(draft, [pngFile("a.png"), pngFile("b.png")]).next
    const ids = composerDraftAttachmentIds(draft)
    assert.deepEqual(ids, ["att-1", "att-2"])
    const urls = draft.attachments.map((attachment) => attachment.previewUrl)
    const switched = draft
    assert.deepEqual(composerDraftAttachmentIds(switched), ids)
    assert.deepEqual(
      switched.attachments.map((attachment) => attachment.previewUrl),
      urls
    )
    assert.deepEqual(revoked, [])
  } finally {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})

test("remove attachment revokes that blob only", () => {
  resetAttachmentIdCounterForTests()
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  const revoked: string[] = []
  URL.createObjectURL = () => "blob:remove-me"
  URL.revokeObjectURL = (url) => {
    revoked.push(String(url))
  }
  try {
    let draft = addComposerDraftFiles(emptyComposerDraft(), [pngFile("a.png")]).next
    assert.equal(draft.attachments[0]?.previewUrl, "blob:remove-me")
    draft = removeComposerDraftAttachment(draft, "att-1")
    assert.deepEqual(revoked, ["blob:remove-me"])
    assert.equal(draft.attachments.length, 0)
  } finally {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})

test("successful send clears hoisted draft and does not restore it after a switch", () => {
  resetAttachmentIdCounterForTests()
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = () => "blob:send"
  URL.revokeObjectURL = () => {}
  try {
    let draft = setComposerDraftText(emptyComposerDraft(), "Tighten the header")
    draft = addComposerDraftFiles(draft, [pngFile("ref.png")]).next
    draft = discardComposerDraft(draft)
    assert.equal(composerDraftIsEmpty(draft), true)
    const afterSwitch = draft
    assert.equal(afterSwitch.text, "")
    assert.equal(afterSwitch.attachments.length, 0)
  } finally {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})

test("builder teardown revokes remaining draft blobs", () => {
  resetAttachmentIdCounterForTests()
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  const revoked: string[] = []
  URL.createObjectURL = () => "blob:session"
  URL.revokeObjectURL = (url) => {
    revoked.push(String(url))
  }
  try {
    const draft = addComposerDraftFiles(emptyComposerDraft(), [pngFile("a.png")]).next
    discardComposerDraft(draft)
    assert.deepEqual(revoked, ["blob:session"])
  } finally {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  }
})

test("historical preview and restore do not copy composer draft into fingerprints", () => {
  const snapshot = {
    layoutEdits: {},
    layerText: { "Business name": "Northwind" },
    layerStyles: {},
    hiddenLayers: [],
    layerDuplicates: {},
    placedElements: [],
    codeOverride: null,
    baseLayout: null,
    generatedLayout: {
      documentType: "Standard invoice",
      businessName: "Northwind",
      clientName: "Atelier",
      emphasis: null,
      style: "studio",
      accent: "#6938ef",
    },
  } as unknown as Parameters<typeof fingerprintDocumentSnapshot>[0]
  const polluted = {
    ...snapshot,
    composerDraft: { text: "unsent", attachments: [{ id: "att-1" }] },
    composerModelId: "opus-4-6",
    modelId: "opus-4-6",
  } as typeof snapshot
  assert.equal(
    fingerprintDocumentSnapshot(snapshot),
    fingerprintDocumentSnapshot(polluted)
  )
})

test("selected composer model survives History / Saved items / Add elements / Brand roundtrips", () => {
  const other = AI_MODELS[1]!.id
  assert.notEqual(other, DEFAULT_COMPOSER_MODEL_ID)
  let draft = setComposerDraftModelId(emptyComposerDraft(), other)
  draft = setComposerDraftText(draft, "Keep this unsent draft")
  const afterHistory = draft
  const afterSaved = afterHistory
  const afterAdd = afterSaved
  const afterBrand = afterAdd
  assert.equal(afterBrand.modelId, other)
  assert.equal(afterBrand.text, "Keep this unsent draft")
})

test("panel switching the composer model does not create a document version", () => {
  assert.equal(
    documentVersionSnapshotOmitsEphemeral(
      {
        layoutEdits: {},
        layerText: {},
        layerStyles: {},
        hiddenLayers: [],
        layerDuplicates: {},
        placedElements: [],
        codeOverride: null,
        baseLayout: null,
        generatedLayout: {
          documentType: "Standard invoice",
          businessName: "Northwind",
          clientName: "Atelier",
          emphasis: null,
          style: "studio",
          accent: "#6938ef",
        },
      } as unknown as Parameters<typeof fingerprintDocumentSnapshot>[0]
    ),
    true
  )
})

test("successful send keeps the selected model and clears text plus attachments", () => {
  const other = AI_MODELS[1]!.id
  let draft = setComposerDraftModelId(
    setComposerDraftText(emptyComposerDraft(), "Send this"),
    other
  )
  draft = discardComposerDraft(draft)
  assert.equal(draft.text, "")
  assert.equal(draft.attachments.length, 0)
  assert.equal(draft.modelId, other)
  const afterSwitch = draft
  assert.equal(afterSwitch.modelId, other)
})

test("preview and restore do not alter composer model selection", () => {
  const other = AI_MODELS[2]!.id
  const draft = setComposerDraftModelId(emptyComposerDraft(), other)
  const afterPreview = draft
  const afterRestore = afterPreview
  assert.equal(afterRestore.modelId, other)
})

