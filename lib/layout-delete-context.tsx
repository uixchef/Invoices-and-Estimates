"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { useHubToast } from "@/components/payment-hub/hub-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import {
  DELETE_CANCEL_LABEL,
  DELETE_CONFIRMATION_LABEL,
  getDeleteConfirmationDescription,
  getDeleteConfirmationTitle,
  getDeleteSuccessMessage,
} from "@/lib/delete-confirmation-copy"
import { useLayoutPreview } from "@/lib/layout-preview-context"
import type { LayoutRow } from "@/lib/layouts-data"

type LayoutDeleteContextValue = {
  requestDelete: (layout: LayoutRow) => void
  isRemoved: (id: string) => boolean
}

const LayoutDeleteContext = createContext<LayoutDeleteContextValue | null>(null)

export function LayoutDeleteProvider({ children }: { children: ReactNode }) {
  const { showSuccess } = useHubToast()
  const { layout: previewLayout, close: closePreview } = useLayoutPreview()
  const [pendingDelete, setPendingDelete] = useState<LayoutRow | null>(null)
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())

  const cancelDelete = useCallback(() => {
    setPendingDelete(null)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) {
      return
    }

    setRemovedIds((current) => {
      const next = new Set(current)
      next.add(pendingDelete.id)
      return next
    })

    if (previewLayout?.id === pendingDelete.id) {
      closePreview()
    }

    showSuccess(getDeleteSuccessMessage("layout", pendingDelete.name))
    setPendingDelete(null)
  }, [closePreview, pendingDelete, previewLayout?.id, showSuccess])

  const requestDelete = useCallback((layout: LayoutRow) => {
    setPendingDelete(layout)
  }, [])

  const isRemoved = useCallback(
    (id: string) => removedIds.has(id),
    [removedIds]
  )

  const value = useMemo(
    () => ({
      requestDelete,
      isRemoved,
    }),
    [isRemoved, requestDelete]
  )

  return (
    <LayoutDeleteContext.Provider value={value}>
      {children}
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            cancelDelete()
          }
        }}
        title={getDeleteConfirmationTitle("layout")}
        description={
          pendingDelete
            ? getDeleteConfirmationDescription(pendingDelete.name)
            : null
        }
        confirmLabel={DELETE_CONFIRMATION_LABEL}
        cancelLabel={DELETE_CANCEL_LABEL}
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </LayoutDeleteContext.Provider>
  )
}

export function useLayoutDelete() {
  const context = useContext(LayoutDeleteContext)

  if (!context) {
    throw new Error("useLayoutDelete must be used within LayoutDeleteProvider")
  }

  return context
}
