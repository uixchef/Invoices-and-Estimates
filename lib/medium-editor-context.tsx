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

type EditorSnapshot = {
  name: string
  formState: MediumFormState
}

function editorSnapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  if (a.name !== b.name) {
    return false
  }

  const left = a.formState
  const right = b.formState

  return (
    left.paperSize === right.paperSize &&
    left.orientation === right.orientation &&
    left.width === right.width &&
    left.height === right.height &&
    left.resolution === right.resolution &&
    left.safeArea.top === right.safeArea.top &&
    left.safeArea.right === right.safeArea.right &&
    left.safeArea.bottom === right.safeArea.bottom &&
    left.safeArea.left === right.safeArea.left
  )
}

function createSnapshot(
  name: string,
  formState: MediumFormState
): EditorSnapshot {
  return {
    name,
    formState: {
      ...formState,
      safeArea: { ...formState.safeArea },
    },
  }
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
  isDirty: boolean
}

const MediumEditorContext = createContext<MediumEditorContextValue | null>(null)

export function MediumEditorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const routeMediumId = getMediumIdFromEditorPath(pathname)
  const isNewRoute = pathname === "/invoices/mediums/new"

  const { getMediumById, updateMediumName, saveMedium, createMedium } =
    useMediumsStore()

  const [formState, setFormState] = useState<MediumFormState>(DEFAULT_MEDIUM_FORM)
  const [name, setName] = useState("New paper type")
  const [draftName, setDraftName] = useState("New paper type")
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<EditorSnapshot>(() =>
    createSnapshot("New paper type", DEFAULT_MEDIUM_FORM)
  )
  const mediumId = routeMediumId
  const storedMedium = mediumId ? getMediumById(mediumId) : undefined

  const initializeEditor = useCallback(
    ({ initialState = DEFAULT_MEDIUM_FORM, initialName }: InitializeEditorInput) => {
      const resolvedName =
        initialName ?? storedMedium?.name ?? (isNewRoute ? "New paper type" : "Paper type")

      setFormState(initialState)
      setName(resolvedName)
      setDraftName(resolvedName)
      setIsEditingName(false)
      setSavedSnapshot(createSnapshot(resolvedName, initialState))
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
    const resolvedName = (isEditingName ? draftName : name).trim() || "New paper type"

    if (isEditingName) {
      setName(resolvedName)
      setDraftName(resolvedName)
      setIsEditingName(false)
    }

    setIsSaving(true)

    try {
      if (mediumId) {
        saveMedium(mediumId, { name: resolvedName, formState })
        setSavedSnapshot(createSnapshot(resolvedName, formState))
        return { action: "updated", name: resolvedName }
      }

      const newId = createMedium({ name: resolvedName, formState })
      setSavedSnapshot(createSnapshot(resolvedName, formState))
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

  const isDirty = useMemo(() => {
    const currentName = (isEditingName ? draftName : name).trim() || "New paper type"
    return !editorSnapshotsEqual(
      savedSnapshot,
      createSnapshot(currentName, formState)
    )
  }, [draftName, formState, isEditingName, name, savedSnapshot])

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
      isDirty,
    }),
    [
      cancelNameEdit,
      commitName,
      draftName,
      formState,
      initializeEditor,
      isDirty,
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
