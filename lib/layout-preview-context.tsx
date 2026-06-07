"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { LayoutRow } from "@/lib/layouts-data"

type LayoutPreviewContextValue = {
  layout: LayoutRow | null
  isOpen: boolean
  open: (layout: LayoutRow) => void
  close: () => void
}

const LayoutPreviewContext = createContext<LayoutPreviewContextValue | null>(null)

export function LayoutPreviewProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<LayoutRow | null>(null)

  const open = useCallback((next: LayoutRow) => {
    setLayout(next)
  }, [])

  const close = useCallback(() => {
    setLayout(null)
  }, [])

  const value = useMemo(
    () => ({
      layout,
      isOpen: layout !== null,
      open,
      close,
    }),
    [layout, open, close]
  )

  return (
    <LayoutPreviewContext.Provider value={value}>
      {children}
    </LayoutPreviewContext.Provider>
  )
}

export function useLayoutPreview() {
  const context = useContext(LayoutPreviewContext)

  if (!context) {
    throw new Error("useLayoutPreview must be used within LayoutPreviewProvider")
  }

  return context
}
