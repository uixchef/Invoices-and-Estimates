import type { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * HighRise AI 1.1 — Button / Neutral / Secondary / sm
 * Figma states for neutral gray CTA (e.g. Mediums):
 * - Default:  26682:48594
 * - Hover:    26682:49266
 * - Active:   26682:49042
 * - Focused:  27602:27831
 * - Disabled: 26682:48818
 */
export const neutralSecondaryButtonVariants = cva(
  [
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[4px] border px-3.5 py-2",
    "font-[family-name:var(--font-inter)] text-base font-semibold leading-6",
    "transition-colors focus-visible:outline-none",
    "border-[#d0d5dd] bg-white text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
    "hover:border-[#d0d5dd] hover:bg-[#f9fafb] hover:text-[#1d2939]",
    "active:border-[#d0d5dd] active:bg-[#f2f4f7] active:text-[#101828] active:shadow-none",
    "focus-visible:border-[#d0d5dd] focus-visible:bg-[#f9fafb] focus-visible:text-[#1d2939]",
    "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#f2f4f7]",
    "disabled:pointer-events-none disabled:border-[#eaecf0] disabled:bg-white disabled:text-[#d0d5dd] disabled:shadow-none",
  ].join(" ")
)

type NeutralSecondaryButtonProps = ComponentProps<"button"> &
  VariantProps<typeof neutralSecondaryButtonVariants>

export function NeutralSecondaryButton({
  className,
  disabled,
  type = "button",
  children,
  ...props
}: NeutralSecondaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(neutralSecondaryButtonVariants(), className)}
      {...props}
    >
      {children}
    </button>
  )
}
