"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  formatMediumUpdatedOn,
  mediumFormToRowFields,
  type MediumFormState,
} from "@/lib/medium-form"
import { MEDIUM_ROWS, type MediumRow } from "@/lib/mediums-data"

type MediumSaveInput = {
  name: string
  formState: MediumFormState
}

type MediumsStoreValue = {
  mediums: MediumRow[]
  getMediumById: (mediumId: string) => MediumRow | undefined
  getMediumName: (mediumId: string) => string
  updateMediumName: (mediumId: string, name: string) => void
  saveMedium: (mediumId: string, input: MediumSaveInput) => void
  createMedium: (input: MediumSaveInput) => string
}

const MediumsStoreContext = createContext<MediumsStoreValue | null>(null)

export function MediumsStoreProvider({ children }: { children: ReactNode }) {
  const [mediums, setMediums] = useState<MediumRow[]>(() => [...MEDIUM_ROWS])

  const getMediumById = useCallback(
    (mediumId: string) => mediums.find((medium) => medium.id === mediumId),
    [mediums]
  )

  const getMediumName = useCallback(
    (mediumId: string) => getMediumById(mediumId)?.name ?? mediumId,
    [getMediumById]
  )

  const updateMediumName = useCallback((mediumId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }

    setMediums((current) =>
      current.map((medium) =>
        medium.id === mediumId ? { ...medium, name: trimmed } : medium
      )
    )
  }, [])

  const saveMedium = useCallback((mediumId: string, input: MediumSaveInput) => {
    const trimmed = input.name.trim() || "New medium"
    const fields = mediumFormToRowFields(input.formState)
    const updatedOn = formatMediumUpdatedOn()

    setMediums((current) =>
      current.map((medium) =>
        medium.id === mediumId
          ? {
              ...medium,
              name: trimmed,
              ...fields,
              updatedOn,
              updatedAgo: "Just now",
            }
          : medium
      )
    )
  }, [])

  const createMedium = useCallback((input: MediumSaveInput) => {
    const trimmed = input.name.trim() || "New medium"
    const fields = mediumFormToRowFields(input.formState)
    const updatedOn = formatMediumUpdatedOn()
    const newId = `medium-${Date.now()}`

    const newMedium: MediumRow = {
      id: newId,
      name: trimmed,
      ...fields,
      updatedOn,
      updatedAgo: "Just now",
    }

    setMediums((current) => [newMedium, ...current])
    return newId
  }, [])

  const value = useMemo(
    () => ({
      mediums,
      getMediumById,
      getMediumName,
      updateMediumName,
      saveMedium,
      createMedium,
    }),
    [
      mediums,
      getMediumById,
      getMediumName,
      updateMediumName,
      saveMedium,
      createMedium,
    ]
  )

  return (
    <MediumsStoreContext.Provider value={value}>
      {children}
    </MediumsStoreContext.Provider>
  )
}

export function useMediumsStore(): MediumsStoreValue {
  const context = useContext(MediumsStoreContext)

  if (!context) {
    throw new Error("useMediumsStore must be used within MediumsStoreProvider")
  }

  return context
}
