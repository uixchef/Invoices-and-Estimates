"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { LayoutRow } from "@/lib/layouts-data"
import {
  loadSavedLayoutRecords,
  mergeCatalogRows,
  persistSavedLayoutRecords,
  upsertSavedLayoutRecord,
  type SavedLayoutRecord,
} from "@/lib/layout-document-store"

type LayoutCatalogContextValue = {
  records: SavedLayoutRecord[]
  savedRows: LayoutRow[]
  upsertRecord: (record: SavedLayoutRecord) => void
  removeRecord: (id: string) => void
  getRecord: (id: string) => SavedLayoutRecord | null
  mergeRows: (base: LayoutRow[]) => LayoutRow[]
}

const LayoutCatalogContext = createContext<LayoutCatalogContextValue | null>(null)

export function LayoutCatalogProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<SavedLayoutRecord[]>([])

  useEffect(() => {
    setRecords(loadSavedLayoutRecords())
  }, [])

  const upsertRecord = useCallback((record: SavedLayoutRecord) => {
    setRecords((current) => {
      const next = upsertSavedLayoutRecord(current, record)
      persistSavedLayoutRecords(next)
      return next
    })
  }, [])

  const removeRecord = useCallback((id: string) => {
    setRecords((current) => {
      const next = current.filter((record) => record.row.id !== id)
      persistSavedLayoutRecords(next)
      return next
    })
  }, [])

  const getRecord = useCallback(
    (id: string) => records.find((record) => record.row.id === id) ?? null,
    [records]
  )

  const savedRows = useMemo(
    () => records.map((record) => record.row),
    [records]
  )

  const mergeRows = useCallback(
    (base: LayoutRow[]) => mergeCatalogRows(base, savedRows),
    [savedRows]
  )

  const value = useMemo(
    () => ({
      records,
      savedRows,
      upsertRecord,
      removeRecord,
      getRecord,
      mergeRows,
    }),
    [getRecord, mergeRows, records, removeRecord, savedRows, upsertRecord]
  )

  return (
    <LayoutCatalogContext.Provider value={value}>
      {children}
    </LayoutCatalogContext.Provider>
  )
}

export function useLayoutCatalog() {
  const context = useContext(LayoutCatalogContext)
  if (!context) {
    throw new Error("useLayoutCatalog must be used within LayoutCatalogProvider")
  }
  return context
}

export function useLayoutCatalogOptional() {
  return useContext(LayoutCatalogContext)
}
