import type { DocumentActionId } from "@/lib/document-actions"
import type {
  BuilderLayerStyle,
  GeneratedLayout,
  PlacedElement,
} from "@/lib/layout-builder-types"

/** Bounded document-version timeline. Independent of the 50-step undo stack. */
export const MAX_DOCUMENT_VERSIONS = 40

export type DocumentVersionOrigin =
  | "generated"
  | "ai-edit"
  | "document-action"
  | "manual-text"
  | "manual-style"
  | "duplicate"
  | "delete"
  | "insert"
  | "saved-item"
  | "brand"
  | "code"
  | "restore"
  | "manual"

export type DocumentVersionMeta = {
  origin: DocumentVersionOrigin
  target?: string
  actionId?: DocumentActionId
  restoredId?: string
}

/**
 * Document-only snapshot. Intentionally excludes conversation, composer drafts,
 * attachments, selection, inspector, and other ephemeral UI.
 */
export type DocumentVersionSnapshot = {
  layoutEdits: Partial<GeneratedLayout>
  layerText: Record<string, string>
  layerStyles: Record<string, BuilderLayerStyle>
  hiddenLayers: string[]
  layerDuplicates: Record<string, number>
  placedElements: PlacedElement[]
  codeOverride: string | null
  baseLayout: GeneratedLayout | null
  generatedLayout: GeneratedLayout
}

export type DocumentVersion = {
  id: string
  createdAt: number
  label: string
  origin: DocumentVersionOrigin
  target?: string
  restoredId?: string
  /** Present when origin is a discrete document action. Never used to coalesce. */
  actionId?: DocumentActionId
  snapshot: DocumentVersionSnapshot
}

const ACTION_LABELS: Record<DocumentActionId, string> = {
  "add-discount-row": "Added discount",
  "add-pay-online": "Added Pay online",
  "add-payment-details": "Added bank details",
  "switch-bold-brand": "Applied bold branded scheme",
}

let versionSeq = 0

export function resetDocumentVersionIdCounterForTests() {
  versionSeq = 0
}

export function syncDocumentVersionIdCounter(versions: DocumentVersion[]) {
  for (const version of versions) {
    const numeric = Number.parseInt(version.id.replace(/^dv-/, ""), 10)
    if (Number.isFinite(numeric) && numeric > versionSeq) {
      versionSeq = numeric
    }
  }
}

export function nextDocumentVersionId(): string {
  versionSeq += 1
  return `dv-${versionSeq}`
}

export function persistableDocumentVersions(
  versions: DocumentVersion[]
): DocumentVersion[] {
  return versions.map((version) => ({
    ...version,
    snapshot: cloneDocumentVersionSnapshot(version.snapshot),
  }))
}

export function documentVersionLabel(meta: DocumentVersionMeta): string {
  if (meta.origin === "generated") {
    return "Generated layout"
  }
  if (meta.origin === "ai-edit") {
    return "AI edit"
  }
  if (meta.origin === "document-action" && meta.actionId) {
    return ACTION_LABELS[meta.actionId]
  }
  if (meta.origin === "manual-text") {
    return meta.target ? `Updated ${meta.target}` : "Manual edit"
  }
  if (meta.origin === "manual-style") {
    return meta.target ? `Changed ${meta.target} styling` : "Manual edit"
  }
  if (meta.origin === "duplicate") {
    return meta.target ? `Duplicated ${meta.target}` : "Duplicated element"
  }
  if (meta.origin === "delete") {
    return meta.target ? `Removed ${meta.target}` : "Removed element"
  }
  if (meta.origin === "insert") {
    return meta.target ? `Added ${meta.target}` : "Added element"
  }
  if (meta.origin === "saved-item") {
    return "Inserted saved item"
  }
  if (meta.origin === "brand") {
    return "Changed brand treatment"
  }
  if (meta.origin === "code") {
    return meta.target === "Revert" ? "Reverted to layout" : "Edited code"
  }
  if (meta.origin === "restore") {
    return "Restored earlier version"
  }
  return "Manual edit"
}

/**
 * Only continuous in-place editing coalesces. Discrete completed operations
 * (document actions, restore, duplicate, insert, …) always keep their own row.
 */
const CONTINUOUS_VERSION_ORIGINS = new Set<DocumentVersionOrigin>([
  "manual-text",
  "manual-style",
  "manual",
])

export function shouldCoalesceDocumentVersions(
  previous: DocumentVersion | undefined,
  meta: DocumentVersionMeta
): boolean {
  if (!previous) {
    return false
  }
  if (previous.origin !== meta.origin) {
    return false
  }
  if (!CONTINUOUS_VERSION_ORIGINS.has(meta.origin)) {
    return false
  }
  if (previous.actionId || meta.actionId) {
    return previous.actionId === meta.actionId
  }
  return (previous.target ?? "") === (meta.target ?? "")
}

export type DocumentVersionAppendKind = "append" | "coalesce" | "skip"

/**
 * restore always appends. Identical document content is not a new event
 * (idempotent / no-op). Continuous same-target edits replace the last row.
 */
export function documentVersionAppendKind(
  previous: DocumentVersion | undefined,
  meta: DocumentVersionMeta,
  snapshot: DocumentVersionSnapshot
): DocumentVersionAppendKind {
  if (!previous) {
    return "append"
  }
  if (meta.origin === "restore") {
    return "append"
  }
  if (
    fingerprintDocumentSnapshot(previous.snapshot) ===
    fingerprintDocumentSnapshot(snapshot)
  ) {
    return "skip"
  }
  if (shouldCoalesceDocumentVersions(previous, meta)) {
    return "coalesce"
  }
  return "append"
}

export function cloneDocumentVersionSnapshot(
  snapshot: DocumentVersionSnapshot
): DocumentVersionSnapshot {
  return structuredClone(snapshot)
}

export function appendDocumentVersion(
  versions: DocumentVersion[],
  meta: DocumentVersionMeta,
  snapshot: DocumentVersionSnapshot,
  options: { id: string; createdAt: number; max?: number }
): DocumentVersion[] {
  const last = versions[versions.length - 1]
  const kind = documentVersionAppendKind(last, meta, snapshot)
  if (kind === "skip") {
    return versions
  }
  if (kind === "coalesce") {
    return [
      ...versions.slice(0, -1),
      {
        ...last!,
        createdAt: options.createdAt,
        snapshot: cloneDocumentVersionSnapshot(snapshot),
      },
    ]
  }

  const next: DocumentVersion[] = [
    ...versions,
    {
      id: options.id,
      createdAt: options.createdAt,
      label: documentVersionLabel(meta),
      origin: meta.origin,
      target: meta.target,
      restoredId: meta.restoredId,
      actionId: meta.actionId,
      snapshot: cloneDocumentVersionSnapshot(snapshot),
    },
  ]
  const max = options.max ?? MAX_DOCUMENT_VERSIONS
  if (next.length <= max) {
    return next
  }
  return next.slice(next.length - max)
}

export function currentDocumentVersionId(
  versions: DocumentVersion[]
): string | null {
  return versions[versions.length - 1]?.id ?? null
}

/**
 * Canonical JSON with sorted keys so two snapshots with the same content but
 * different key insertion order produce the same fingerprint. Avoids crypto.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]"
  }
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const entries = keys.map(
    (key) =>
      JSON.stringify(key) +
      ":" +
      stableStringify((value as Record<string, unknown>)[key])
  )
  return "{" + entries.join(",") + "}"
}

/**
 * Deterministic content fingerprint of a document snapshot. Compares exactly
 * the versioned fields — never chat, selection, composer, or attachments.
 */
export function fingerprintDocumentSnapshot(
  snapshot: DocumentVersionSnapshot
): string {
  return stableStringify({
    layoutEdits: snapshot.layoutEdits,
    layerText: snapshot.layerText,
    layerStyles: snapshot.layerStyles,
    hiddenLayers: snapshot.hiddenLayers,
    layerDuplicates: snapshot.layerDuplicates,
    placedElements: snapshot.placedElements,
    codeOverride: snapshot.codeOverride,
    baseLayout: snapshot.baseLayout,
    generatedLayout: snapshot.generatedLayout,
  })
}

/**
 * Returns the id of the latest version whose snapshot matches the live
 * fingerprint, or null when the live document matches no committed version.
 * This is the truthful "Current" — distinct from the latest timeline entry.
 */
export function matchingDocumentVersionId(
  versions: DocumentVersion[],
  liveFingerprint: string
): string | null {
  let match: string | null = null
  for (const version of versions) {
    if (fingerprintDocumentSnapshot(version.snapshot) === liveFingerprint) {
      match = version.id
    }
  }
  return match
}

export function canRestoreDocumentVersion(
  versions: DocumentVersion[],
  id: string,
  currentId?: string | null
): boolean {
  if (!versions.some((version) => version.id === id)) {
    return false
  }
  const current =
    currentId !== undefined ? currentId : currentDocumentVersionId(versions)
  return current !== id
}

export function findDocumentVersion(
  versions: DocumentVersion[],
  id: string
): DocumentVersion | undefined {
  return versions.find((version) => version.id === id)
}

/** Clock-independent display. Same calendar day → 24h time; otherwise a date. */
export function formatVersionTimestamp(
  createdAt: number,
  now: number
): string {
  const created = new Date(createdAt)
  const current = new Date(now)
  const sameDay = created.toDateString() === current.toDateString()
  if (sameDay) {
    return created.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }
  return created.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

const EPHEMERAL_KEYS = [
  "messages",
  "attachments",
  "selections",
  "inspectingLayer",
  "composerDraft",
  "composerModelId",
  "modelId",
  "prompt",
  "status",
  "questions",
  "feedbackToast",
  "scrollTop",
  "compareWithReference",
  "referencePreviewUrl",
] as const

export function documentVersionSnapshotOmitsEphemeral(
  snapshot: DocumentVersionSnapshot
): boolean {
  const record = snapshot as unknown as Record<string, unknown>
  return EPHEMERAL_KEYS.every((key) => !(key in record))
}

export function documentVersionContainsBinaries(
  snapshot: DocumentVersionSnapshot
): boolean {
  const raw = JSON.stringify(snapshot)
  return raw.includes("blob:") || raw.includes("data:image") || raw.includes("data:application/pdf")
}

export function estimateDocumentVersionBytes(
  version: DocumentVersion
): number {
  return new TextEncoder().encode(JSON.stringify(version)).length
}

export function historyToUndoSnapshot(snapshot: DocumentVersionSnapshot): {
  layoutEdits: Partial<GeneratedLayout>
  layerText: Record<string, string>
  layerStyles: Record<string, BuilderLayerStyle>
  hiddenLayers: string[]
  layerDuplicates: Record<string, number>
  placedElements: PlacedElement[]
  codeOverride: string | null
  baseLayout: GeneratedLayout | null
} {
  return {
    layoutEdits: snapshot.layoutEdits,
    layerText: snapshot.layerText,
    layerStyles: snapshot.layerStyles,
    hiddenLayers: snapshot.hiddenLayers,
    layerDuplicates: snapshot.layerDuplicates,
    placedElements: snapshot.placedElements,
    codeOverride: snapshot.codeOverride,
    baseLayout: snapshot.generatedLayout,
  }
}
