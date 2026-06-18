"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/highrise/button"
import { StartBlankMediumDialog } from "@/components/invoices/start-blank-medium-dialog"
import { useCreateWithAi } from "@/lib/create-with-ai-context"

/**
 * "Start from blank" — opens a medium picker, then the builder empty state
 * (Figma 3268:37410), where the user can describe the layout to Invoice AI or
 * insert elements manually. No card is created until the draft is saved.
 */
export function NewLayoutButton() {
  const { startBlankLayout } = useCreateWithAi()
  const [mediumDialogOpen, setMediumDialogOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => setMediumDialogOpen(true)}
      >
        <Plus className="size-5 shrink-0" strokeWidth={2} aria-hidden />
        Start from blank
      </Button>

      <StartBlankMediumDialog
        open={mediumDialogOpen}
        onOpenChange={setMediumDialogOpen}
        onContinue={startBlankLayout}
      />
    </>
  )
}
