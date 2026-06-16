"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, ThumbsDown, X } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** Issue categories for negative answer feedback (Figma feedback modal). */
const FEEDBACK_ISSUES = [
  "Other",
  "Did not fully follow instructions",
  "Incomplete response",
  "Not factually correct",
  "Harmful content",
] as const

export type FeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired with the chosen issue + details when the user submits. */
  onSubmit: (feedback: { issue: string; details: string }) => void
}

/**
 * Negative-feedback capture modal, opened from an answer's thumbs-down. Mirrors
 * the answer toolbar's dislike affordance: a categorised "issue" picker plus a
 * free-text detail field, with submit gated until the user has said something
 * actionable (a non-default issue or some detail).
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
}: FeedbackDialogProps) {
  const [issue, setIssue] = useState<string>(FEEDBACK_ISSUES[0])
  const [details, setDetails] = useState("")

  // Reset to defaults whenever the dialog reopens, so each turn's feedback
  // starts clean.
  useEffect(() => {
    if (open) {
      setIssue(FEEDBACK_ISSUES[0])
      setDetails("")
    }
  }, [open])

  const canSubmit = issue !== FEEDBACK_ISSUES[0] || details.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }
    onSubmit({ issue, details: details.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[420px] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold leading-6 text-[#101828]">
            <ThumbsDown className="size-5 shrink-0 text-[#344054]" aria-hidden />
            Feedback
          </DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close feedback"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-[#667085] outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              <X className="size-5" aria-hidden />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-[family-name:var(--font-inter)] text-base font-medium leading-5 text-[#101828]">
              Select issue
            </label>
            <IssueSelect value={issue} onChange={setIssue} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="feedback-details"
              className="font-[family-name:var(--font-inter)] text-base font-medium leading-5 text-[#101828]"
            >
              Please provide details
            </label>
            <textarea
              id="feedback-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What was unsatisfying about the response?"
              rows={5}
              className="w-full resize-y rounded-[4px] border border-[#d0d5dd] px-3 py-2.5 font-[family-name:var(--font-inter)] text-base leading-5 text-[#101828] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors placeholder:text-[#667085] focus:border-[#9b8afb] focus:ring-2 focus:ring-[#9b8afb]/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-4 pb-4">
          <DialogClose asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-[4px] border border-[#d0d5dd] bg-white px-3.5 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#344054] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-[4px] border px-3.5 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
              canSubmit
                ? "border-[#6938ef] bg-[#6938ef] text-white hover:bg-[#5925dc]"
                : "cursor-not-allowed border-[#e9d7fe] bg-white text-[#c3b5fd]"
            )}
          >
            Submit feedback
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** HighRise-style single-select (selected row: blue bg + check; chevron flips). */
function IssueSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-9 w-full items-center gap-2 rounded-[4px] border border-[#d0d5dd] bg-white px-3 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#f9fafb] focus-visible:border-[#9b8afb] focus-visible:ring-2 focus-visible:ring-[#9b8afb]/40 data-[state=open]:border-[#9b8afb] data-[state=open]:ring-2 data-[state=open]:ring-[#9b8afb]/40"
        >
          <span className="min-w-0 flex-1 truncate text-left font-[family-name:var(--font-inter)] text-base leading-5 text-[#101828]">
            {value}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-[#667085] transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        // Must clear the Dialog's overlay/content (z-120); the default z-50
        // renders the menu behind the modal and it appears invisible.
        className="z-[130] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] rounded-lg p-1.5 font-[family-name:var(--font-inter)]"
      >
        {FEEDBACK_ISSUES.map((option) => {
          const isActive = option === value
          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => onChange(option)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-[4px] px-2 py-2 text-base leading-5",
                isActive
                  ? "bg-[#f4f3ff] text-[#5925dc] focus:bg-[#f4f3ff] focus:text-[#5925dc]"
                  : "text-[#475467]"
              )}
            >
              <span className="truncate">{option}</span>
              {isActive ? (
                <Check className="size-4 shrink-0 text-[#5925dc]" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
