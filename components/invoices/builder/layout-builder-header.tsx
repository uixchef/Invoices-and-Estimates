"use client"

import { useEffect, useId, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Save } from "lucide-react"

import { Button } from "@/components/highrise/button"
import { useHubToast } from "@/components/payment-hub/hub-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

const LAYOUTS_LIST_HREF = "/invoices"

function HeaderIconButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const button = (
    <button
      type="button"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white text-[#475467]",
        "shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none transition-colors",
        "hover:bg-[#f9fafb] hover:text-[#1d2939] focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
        className
      )}
      {...props}
    />
  )

  const label = props["aria-label"]
  if (!label) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Figma: Layout Builder page header (3181:33796 / 3137:145815)
 */
export function LayoutBuilderHeader() {
  const router = useRouter()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { showSuccess } = useHubToast()
  const {
    name,
    draftName,
    isEditingName,
    setDraftName,
    startNameEdit,
    commitName,
    cancelNameEdit,
  } = useLayoutBuilder()

  useEffect(() => {
    if (!isEditingName) {
      return
    }
    const input = inputRef.current
    input?.focus()
    input?.select()
  }, [isEditingName])

  const handleBack = () => {
    router.push(LAYOUTS_LIST_HREF)
  }

  const handleSave = () => {
    // Persistence is stubbed in the prototype; saving confirms via a toast and
    // keeps the user in the builder (unlike Publish, which returns to the list).
    showSuccess(`${name} has been saved.`)
  }

  const handlePublish = () => {
    showSuccess(`${name} has been published.`)
    router.push(LAYOUTS_LIST_HREF)
  }

  return (
    <div className="flex h-[52px] w-full shrink-0 items-center border-b border-[#d0d5dd] bg-white px-4 py-1">
      <div className="w-[200px] shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828] outline-none hover:text-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          <ArrowLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Back
        </button>
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
            aria-label="Layout name"
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
              aria-label="Edit layout name"
              onClick={startNameEdit}
              className="flex size-6 shrink-0 items-center justify-center rounded outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <Pencil className="size-4 text-[#667085]" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex w-[200px] shrink-0 items-center justify-end gap-2">
        <HeaderIconButton aria-label="Save layout" onClick={handleSave}>
          <Save className="size-5" strokeWidth={2} aria-hidden />
        </HeaderIconButton>
        <Button
          type="button"
          variant="primary"
          className="h-9 px-2.5 py-1.5"
          onClick={handlePublish}
        >
          Publish
        </Button>
      </div>
    </div>
  )
}
