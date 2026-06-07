"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type CreateWithAiContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CreateWithAiContext = createContext<CreateWithAiContextValue | null>(null)

export function CreateWithAiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((current) => !current), [])

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  )

  return (
    <CreateWithAiContext.Provider value={value}>
      {children}
    </CreateWithAiContext.Provider>
  )
}

export function useCreateWithAi() {
  const context = useContext(CreateWithAiContext)

  if (!context) {
    throw new Error("useCreateWithAi must be used within CreateWithAiProvider")
  }

  return context
}
