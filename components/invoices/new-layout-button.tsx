"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/highrise/button"
import { useLayoutCreate } from "@/lib/layout-create-context"

/**
 * "New" — starts a layout from a blank canvas. Prepends a Draft Invoice card
 * to the grid (Figma Layout Card 3082:30384 default / 3082:30369 hover).
 */
export function NewLayoutButton() {
  const { createBlankLayout } = useLayoutCreate()

  return (
    <Button type="button" variant="primary" onClick={() => createBlankLayout()}>
      <Plus className="size-5 shrink-0" strokeWidth={2} aria-hidden />
      Start from blank
    </Button>
  )
}
