"use client"

import { useEffect, useId, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Save } from "lucide-react"

import { useHubToast } from "@/components/payment-hub/hub-toast"
import { Button } from "@/components/ui/button"
import { useMediumEditor } from "@/lib/medium-editor-context"
import {
  mediumCreatedSuccessMessage,
  mediumSavedSuccessMessage,
} from "@/lib/medium-saved-messages"
import { getMediumEditorHref } from "@/lib/medium-routes"
import { cn } from "@/lib/utils"

/**
 * Figma: Medium editor page header (3087:132524)
 */
export function CreateMediumHeader() {
  const router = useRouter()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { showSuccess } = useHubToast()
  const {
    name,
    draftName,
    setDraftName,
    isEditingName,
    startNameEdit,
    commitName,
    cancelNameEdit,
    saveMedium,
    isSaving,
  } = useMediumEditor()

  useEffect(() => {
    if (!isEditingName) {
      return
    }

    const input = inputRef.current
    input?.focus()
    input?.select()
  }, [isEditingName])

  const handleSave = () => {
    const result = saveMedium()
    if (!result) {
      return
    }

    if (result.action === "created") {
      showSuccess(mediumCreatedSuccessMessage(result.name))
      router.replace(getMediumEditorHref(result.newId))
      return
    }

    showSuccess(mediumSavedSuccessMessage(result.name))
  }

  return (
    <div className="flex h-[52px] w-full items-center border-b border-[#d0d5dd] bg-white px-4 py-1">
      <div className="w-[200px] shrink-0">
        <Link
          href="/invoices/mediums"
          className="inline-flex items-center gap-1 rounded font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828] outline-none hover:text-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <ArrowLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Back
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {isEditingName ? (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitName()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                cancelNameEdit()
              }
            }}
            aria-label="Medium name"
            className={cn(
              "h-8 max-w-md min-w-[12rem] rounded border border-[#84adff] bg-white px-2 text-center",
              "font-[family-name:var(--font-inter)] text-xl font-semibold leading-[30px] text-[#101828] outline-none",
              "shadow-[0_0_0_4px_#eff4ff]"
            )}
          />
        ) : (
          <>
            <h2 className="truncate font-[family-name:var(--font-inter)] text-xl font-semibold leading-[30px] text-[#101828]">
              {name}
            </h2>
            <button
              type="button"
              aria-label="Edit medium name"
              onClick={startNameEdit}
              className="flex size-6 shrink-0 items-center justify-center rounded outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <Pencil className="size-4 text-[#667085]" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex w-[200px] shrink-0 items-center justify-end">
        <Button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="h-9 gap-2 rounded border-[#155eef] bg-[#155eef] px-3.5 text-base font-semibold leading-6 text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-[#004eeb] disabled:opacity-70"
        >
          <Save className="size-5 shrink-0" strokeWidth={2} aria-hidden />
          Save
        </Button>
      </div>
    </div>
  )
}
