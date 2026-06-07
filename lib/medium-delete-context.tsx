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
import type { MediumRow } from "@/lib/mediums-data"
import { useMediumsStore } from "@/lib/mediums-store"

type MediumDeleteContextValue = {
  requestDelete: (medium: MediumRow) => void
}

const MediumDeleteContext = createContext<MediumDeleteContextValue | null>(null)

export function MediumDeleteProvider({ children }: { children: ReactNode }) {
  const { showSuccess } = useHubToast()
  const { deleteMedium } = useMediumsStore()
  const [pendingDelete, setPendingDelete] = useState<MediumRow | null>(null)

  const cancelDelete = useCallback(() => {
    setPendingDelete(null)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) {
      return
    }

    deleteMedium(pendingDelete.id)
    showSuccess(getDeleteSuccessMessage("medium", pendingDelete.name))
    setPendingDelete(null)
  }, [deleteMedium, pendingDelete, showSuccess])

  const requestDelete = useCallback((medium: MediumRow) => {
    setPendingDelete(medium)
  }, [])

  const value = useMemo(
    () => ({
      requestDelete,
    }),
    [requestDelete]
  )

  return (
    <MediumDeleteContext.Provider value={value}>
      {children}
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            cancelDelete()
          }
        }}
        title={getDeleteConfirmationTitle("medium")}
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
    </MediumDeleteContext.Provider>
  )
}

export function useMediumDelete() {
  const context = useContext(MediumDeleteContext)

  if (!context) {
    throw new Error("useMediumDelete must be used within MediumDeleteProvider")
  }

  return context
}
