"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import {
  DEFAULT_MEDIUM_FORM,
  type MediumFormState,
} from "@/lib/medium-form"
import { getMediumIdFromEditorPath } from "@/lib/medium-routes"
import { useMediumsStore } from "@/lib/mediums-store"

type InitializeEditorInput = {
  initialState?: MediumFormState
  initialName?: string
}

export type MediumSaveResult =
  | { action: "updated"; name: string }
  | { action: "created"; name: string; newId: string }

type MediumEditorContextValue = {
  formState: MediumFormState
  setFormState: (next: MediumFormState) => void
  name: string
  draftName: string
  setDraftName: (name: string) => void
  isEditingName: boolean
  startNameEdit: () => void
  commitName: () => void
  cancelNameEdit: () => void
  saveMedium: () => MediumSaveResult | null
  initializeEditor: (input: InitializeEditorInput) => void
  mediumId: string | null
  isSaving: boolean
}

const MediumEditorContext = createContext<MediumEditorContextValue | null>(null)

export function MediumEditorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const routeMediumId = getMediumIdFromEditorPath(pathname)
  const isNewRoute = pathname === "/invoices/mediums/new"

  const { getMediumById, updateMediumName, saveMedium, createMedium } =
    useMediumsStore()

  const [formState, setFormState] = useState<MediumFormState>(DEFAULT_MEDIUM_FORM)
  const [name, setName] = useState("New medium")
  const [draftName, setDraftName] = useState("New medium")
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const mediumId = routeMediumId
  const storedMedium = mediumId ? getMediumById(mediumId) : undefined

  const initializeEditor = useCallback(
    ({ initialState = DEFAULT_MEDIUM_FORM, initialName }: InitializeEditorInput) => {
      const resolvedName =
        initialName ?? storedMedium?.name ?? (isNewRoute ? "New medium" : "Medium")

      setFormState(initialState)
      setName(resolvedName)
      setDraftName(resolvedName)
      setIsEditingName(false)
    },
    [isNewRoute, storedMedium?.name]
  )

  const startNameEdit = useCallback(() => {
    setDraftName(name)
    setIsEditingName(true)
  }, [name])

  const commitName = useCallback(() => {
    const trimmed = draftName.trim()
    const nextName = trimmed || name

    setName(nextName)
    setDraftName(nextName)
    setIsEditingName(false)

    if (mediumId) {
      updateMediumName(mediumId, nextName)
    }
  }, [draftName, mediumId, name, updateMediumName])

  const cancelNameEdit = useCallback(() => {
    setDraftName(name)
    setIsEditingName(false)
  }, [name])

  const saveMediumHandler = useCallback((): MediumSaveResult | null => {
    const resolvedName = (isEditingName ? draftName : name).trim() || "New medium"

    if (isEditingName) {
      setName(resolvedName)
      setDraftName(resolvedName)
      setIsEditingName(false)
    }

    setIsSaving(true)

    try {
      if (mediumId) {
        saveMedium(mediumId, { name: resolvedName, formState })
        return { action: "updated", name: resolvedName }
      }

      const newId = createMedium({ name: resolvedName, formState })
      return { action: "created", name: resolvedName, newId }
    } finally {
      setIsSaving(false)
    }
  }, [
    createMedium,
    draftName,
    formState,
    isEditingName,
    mediumId,
    name,
    saveMedium,
  ])

  const value = useMemo(
    () => ({
      formState,
      setFormState,
      name,
      draftName,
      setDraftName,
      isEditingName,
      startNameEdit,
      commitName,
      cancelNameEdit,
      saveMedium: saveMediumHandler,
      initializeEditor,
      mediumId,
      isSaving,
    }),
    [
      cancelNameEdit,
      commitName,
      draftName,
      formState,
      initializeEditor,
      isEditingName,
      isSaving,
      mediumId,
      name,
      saveMediumHandler,
      startNameEdit,
    ]
  )

  return (
    <MediumEditorContext.Provider value={value}>
      {children}
    </MediumEditorContext.Provider>
  )
}

export function useMediumEditor(): MediumEditorContextValue {
  const context = useContext(MediumEditorContext)

  if (!context) {
    throw new Error("useMediumEditor must be used within MediumEditorProvider")
  }

  return context
}
