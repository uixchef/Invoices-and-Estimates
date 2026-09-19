import { formatUpdatedOn } from "@/lib/format-updated-ago"
import type { LayoutRow } from "@/lib/layouts-data"
import type {
  BuilderDocumentType,
  BuilderLayerStyle,
  GeneratedLayout,
  PlacedElement,
} from "@/lib/layout-builder-types"

export const LAYOUT_DOCUMENT_STORE_KEY = "layouts-ai-saved-layouts-v1"
export const LAYOUT_DOCUMENT_STORE_VERSION = 1

export type SavedLayoutDocument = {
  generatedLayout: GeneratedLayout
  layoutEdits: Partial<GeneratedLayout>
  layerText: Record<string, string>
  layerStyles: Record<string, BuilderLayerStyle>
  hiddenLayers: string[]
  layerDuplicates: Record<string, number>
  placedElements: PlacedElement[]
  codeOverride: string | null
}

export type SavedLayoutRecord = {
  row: LayoutRow
  document: SavedLayoutDocument
}

type SavedLayoutEnvelope = {
  v: number
  records: SavedLayoutRecord[]
}

const previewById = new Map<string, GeneratedLayout>()

export function rememberSavedLayoutPreviews(records: SavedLayoutRecord[]): void {
  previewById.clear()
  for (const record of records) {
    previewById.set(record.row.id, record.document.generatedLayout)
  }
}

export function previewLayoutForRow(id: string): GeneratedLayout | null {
  return previewById.get(id) ?? null
}

export function layoutTypeFromDocumentType(
  documentType: BuilderDocumentType
): LayoutRow["type"] {
  if (documentType === "Estimate") {
    return "Estimate"
  }
  if (documentType === "Receipt") {
    return "Receipt"
  }
  return "Invoice"
}

export function newSavedLayoutId(): string {
  return `layout-saved-${Date.now()}`
}

export function catalogRowFromDocument(input: {
  id: string
  name: string
  mediumId: string
  documentType: BuilderDocumentType
  status: LayoutRow["status"]
  now?: Date
}): LayoutRow {
  const now = input.now ?? new Date()
  return {
    id: input.id,
    name: input.name,
    type: layoutTypeFromDocumentType(input.documentType),
    mediumId: input.mediumId,
    status: input.status,
    updatedOn: formatUpdatedOn(now),
    updatedAgo: "Just now",
  }
}

export function parseSavedLayoutRecords(raw: string | null): SavedLayoutRecord[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as SavedLayoutEnvelope | SavedLayoutRecord[]
    const records = Array.isArray(parsed)
      ? parsed
      : parsed &&
          parsed.v === LAYOUT_DOCUMENT_STORE_VERSION &&
          Array.isArray(parsed.records)
        ? parsed.records
        : null
    if (!records) {
      return []
    }
    return records.filter(isSavedLayoutRecord).map((record) => ({
      row: { ...record.row },
      document: {
        generatedLayout: structuredClone(record.document.generatedLayout),
        layoutEdits: structuredClone(record.document.layoutEdits ?? {}),
        layerText: { ...record.document.layerText },
        layerStyles: structuredClone(record.document.layerStyles ?? {}),
        hiddenLayers: [...(record.document.hiddenLayers ?? [])],
        layerDuplicates: { ...(record.document.layerDuplicates ?? {}) },
        placedElements: structuredClone(record.document.placedElements ?? []),
        codeOverride: record.document.codeOverride ?? null,
      },
    }))
  } catch {
    return []
  }
}

function isSavedLayoutRecord(value: unknown): value is SavedLayoutRecord {
  if (!value || typeof value !== "object") {
    return false
  }
  const record = value as SavedLayoutRecord
  return (
    Boolean(record.row?.id) &&
    Boolean(record.row?.name) &&
    Boolean(record.document?.generatedLayout)
  )
}

export function loadSavedLayoutRecords(): SavedLayoutRecord[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const records = parseSavedLayoutRecords(
      window.localStorage.getItem(LAYOUT_DOCUMENT_STORE_KEY)
    )
    rememberSavedLayoutPreviews(records)
    return records
  } catch {
    return []
  }
}

export function persistSavedLayoutRecords(records: SavedLayoutRecord[]): void {
  if (typeof window === "undefined") {
    return
  }
  const envelope: SavedLayoutEnvelope = {
    v: LAYOUT_DOCUMENT_STORE_VERSION,
    records,
  }
  window.localStorage.setItem(LAYOUT_DOCUMENT_STORE_KEY, JSON.stringify(envelope))
  rememberSavedLayoutPreviews(records)
}

export function upsertSavedLayoutRecord(
  current: SavedLayoutRecord[],
  next: SavedLayoutRecord
): SavedLayoutRecord[] {
  const index = current.findIndex((record) => record.row.id === next.row.id)
  if (index === -1) {
    return [next, ...current]
  }
  const copy = [...current]
  copy[index] = next
  return copy
}

export function mergeCatalogRows(
  base: LayoutRow[],
  saved: LayoutRow[]
): LayoutRow[] {
  const byId = new Map(base.map((row) => [row.id, row]))
  const extras: LayoutRow[] = []
  for (const row of saved) {
    if (byId.has(row.id)) {
      byId.set(row.id, { ...byId.get(row.id)!, ...row })
    } else {
      extras.push(row)
    }
  }
  return [...extras, ...byId.values()]
}

export function stripEphemeralDocument(document: SavedLayoutDocument): SavedLayoutDocument {
  return {
    generatedLayout: structuredClone(document.generatedLayout),
    layoutEdits: structuredClone(document.layoutEdits),
    layerText: { ...document.layerText },
    layerStyles: structuredClone(document.layerStyles),
    hiddenLayers: [...document.hiddenLayers],
    layerDuplicates: { ...document.layerDuplicates },
    placedElements: structuredClone(document.placedElements),
    codeOverride: document.codeOverride,
  }
}
