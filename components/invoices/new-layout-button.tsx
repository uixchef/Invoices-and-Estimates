"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/highrise/button"
import { useCreateWithAi } from "@/lib/create-with-ai-context"

/**
 * "Start from blank" — opens the builder directly on its empty state (Figma
 * 3268:37410), where the user can either describe the layout to Invoice AI or
 * insert elements manually. No card is created until the draft is saved.
 */
export function NewLayoutButton() {
  const { startBlankLayout } = useCreateWithAi()

  return (
    <Button type="button" variant="primary" onClick={() => startBlankLayout()}>
      <Plus className="size-5 shrink-0" strokeWidth={2} aria-hidden />
      Start from blank
    </Button>
  )
}
