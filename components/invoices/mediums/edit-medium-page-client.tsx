"use client"

import { useMemo } from "react"
import { notFound } from "next/navigation"

import { MediumEditorPage } from "@/components/invoices/mediums/create-medium-page"
import { mediumRowToFormState } from "@/lib/medium-form"
import { useMediumsStore } from "@/lib/mediums-store"

type EditMediumPageClientProps = {
  mediumId: string
}

export function EditMediumPageClient({ mediumId }: EditMediumPageClientProps) {
  const { getMediumById } = useMediumsStore()
  const medium = getMediumById(mediumId)

  const initialState = useMemo(() => {
    if (!medium) {
      return null
    }

    return mediumRowToFormState(medium)
  }, [
    medium?.dimensions,
    medium?.id,
    medium?.orientation,
    medium?.paper,
    medium?.resolution,
    medium?.safeArea.bottom,
    medium?.safeArea.left,
    medium?.safeArea.right,
    medium?.safeArea.top,
  ])

  if (!medium || !initialState) {
    notFound()
  }

  return (
    <MediumEditorPage initialState={initialState} pageTitle={medium.name} />
  )
}
