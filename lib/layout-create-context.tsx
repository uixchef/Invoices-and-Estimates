"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useHubToast } from "@/components/payment-hub/hub-toast"
import { formatUpdatedOn } from "@/lib/format-updated-ago"
import type { LayoutRow } from "@/lib/layouts-data"
import { getDefaultA4MediumId, MEDIUM_ROWS } from "@/lib/mediums-data"

type LayoutCreateContextValue = {
  /** Blank-canvas layouts created this session, newest first. */
  createdLayouts: LayoutRow[]
  /** Creates a blank Draft layout and surfaces it as a grid card. */
  createBlankLayout: () => LayoutRow
}

const LayoutCreateContext = createContext<LayoutCreateContextValue | null>(null)

/**
 * Blank canvas starts on an A4 medium to match the Layout Card design
 * (Figma 3082:30384 default / 3082:30369 hover — "Layout 1 · A4").
 */
const BLANK_LAYOUT_MEDIUM_ID =
  getDefaultA4MediumId(MEDIUM_ROWS) ?? MEDIUM_ROWS[0].id

function createBlankLayoutRow(sequence: number): LayoutRow {
  return {
    id: `layout-new-${sequence}`,
    name: `Layout ${sequence}`,
    type: "Invoice",
    mediumId: BLANK_LAYOUT_MEDIUM_ID,
    status: "Draft",
    updatedOn: formatUpdatedOn(new Date()),
    updatedAgo: "Just now",
    isBlank: true,
  }
}

export function LayoutCreateProvider({ children }: { children: ReactNode }) {
  const { showSuccess } = useHubToast()
  const sequenceRef = useRef(0)
  const [createdLayouts, setCreatedLayouts] = useState<LayoutRow[]>([])

  const createBlankLayout = useCallback(() => {
    sequenceRef.current += 1
    const layout = createBlankLayoutRow(sequenceRef.current)

    setCreatedLayouts((current) => [layout, ...current])
    showSuccess(`${layout.name} has been created.`)

    return layout
  }, [showSuccess])

  const value = useMemo(
    () => ({ createdLayouts, createBlankLayout }),
    [createBlankLayout, createdLayouts]
  )

  return (
    <LayoutCreateContext.Provider value={value}>
      {children}
    </LayoutCreateContext.Provider>
  )
}

export function useLayoutCreate() {
  const context = useContext(LayoutCreateContext)

  if (!context) {
    throw new Error("useLayoutCreate must be used within LayoutCreateProvider")
  }

  return context
}
