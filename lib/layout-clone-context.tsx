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
import {
  getClonedLayoutName,
  getLayoutCloneSuccessMessage,
} from "@/lib/layout-clone-copy"
import type { LayoutRow } from "@/lib/layouts-data"

type LayoutCloneContextValue = {
  clonedLayouts: LayoutRow[]
  cloneLayout: (layout: LayoutRow) => LayoutRow
}

const LayoutCloneContext = createContext<LayoutCloneContextValue | null>(null)

function createClonedLayout(
  source: LayoutRow,
  cloneCounter: number
): LayoutRow {
  return {
    ...source,
    id: `layout-clone-${source.id}-${cloneCounter}`,
    name: getClonedLayoutName(source.name),
    clonedFromId: source.clonedFromId ?? source.id,
    status: "Draft",
    updatedOn: formatUpdatedOn(new Date()),
    updatedAgo: "Just now",
  }
}

export function LayoutCloneProvider({ children }: { children: ReactNode }) {
  const { showSuccess } = useHubToast()
  const cloneCounterRef = useRef(0)
  const [clonedLayouts, setClonedLayouts] = useState<LayoutRow[]>([])

  const cloneLayout = useCallback(
    (layout: LayoutRow) => {
      cloneCounterRef.current += 1
      const clone = createClonedLayout(layout, cloneCounterRef.current)

      setClonedLayouts((current) => [clone, ...current])
      showSuccess(getLayoutCloneSuccessMessage(clone.name))

      return clone
    },
    [showSuccess]
  )

  const value = useMemo(
    () => ({
      clonedLayouts,
      cloneLayout,
    }),
    [cloneLayout, clonedLayouts]
  )

  return (
    <LayoutCloneContext.Provider value={value}>
      {children}
    </LayoutCloneContext.Provider>
  )
}

export function useLayoutClone() {
  const context = useContext(LayoutCloneContext)

  if (!context) {
    throw new Error("useLayoutClone must be used within LayoutCloneProvider")
  }

  return context
}
