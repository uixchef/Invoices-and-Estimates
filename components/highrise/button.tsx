/**
 * HighRise: `button` → HLButton
 * @see https://highrise.gohighlevel.com/components/common/button
 */

import type { ComponentProps } from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export const HIGHRISE_COMPONENT_KEY = "button" as const
export const HIGHRISE_INTERNAL_NAME = "HLButton" as const

export const buttonVariants = cva(
  [
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[4px] border px-3.5 py-2",
    "font-[family-name:var(--font-inter)] text-base font-semibold leading-6",
    "transition-colors focus-visible:outline-none disabled:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        neutral: [
          // Default — Figma 26682:48594
          "border-[#d0d5dd] bg-white text-[#475467] shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          // Hover — Figma 26682:49266
          "hover:border-[#d0d5dd] hover:bg-[#f9fafb] hover:text-[#1d2939]",
          // Active — Figma 26682:49042
          "active:border-[#d0d5dd] active:bg-[#f2f4f7] active:text-[#101828] active:shadow-none",
          // Focus — Figma 27602:27831
          "focus-visible:border-[#d0d5dd] focus-visible:bg-[#f9fafb] focus-visible:text-[#1d2939]",
          "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#f2f4f7]",
          // Disabled — Figma 26682:48818
          "disabled:border-[#eaecf0] disabled:bg-white disabled:text-[#d0d5dd] disabled:shadow-none disabled:opacity-100",
        ].join(" "),
        "neutral-tertiary": [
          // Default — Figma 27770:40849
          "border-[#f9fafb] bg-[#f9fafb] text-[#475467] shadow-none",
          // Hover — Figma 27770:40881
          "hover:border-[#eaecf0] hover:bg-[#f2f4f7]",
          // Active — Figma 27770:40865
          "active:border-[#d0d5dd] active:bg-[#eaecf0]",
          // Focus — Figma 27770:40873
          "focus-visible:border-[#eaecf0] focus-visible:bg-[#f2f4f7]",
          "focus-visible:shadow-[0_0_0_4px_#f2f4f7]",
          // Open (dropdown trigger)
          "data-[state=open]:border-[#eaecf0] data-[state=open]:bg-[#f2f4f7]",
          // Disabled — Figma 27770:40857
          "disabled:border-[#fcfcfd] disabled:bg-[#fcfcfd] disabled:text-[#d0d5dd] disabled:shadow-none disabled:opacity-100",
        ].join(" "),
        primary: [
          // Default — Figma 26682:48402
          "border-[#155eef] bg-[#155eef] text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          // Hover — Figma 26682:49074
          "hover:border-[#004eeb] hover:bg-[#0040c1]",
          // Active — Figma 26682:48850
          "active:border-[#155eef] active:bg-[#00359e] active:shadow-none",
          // Focus — Figma 27602:27623
          "focus-visible:border-[#155eef] focus-visible:bg-[#0040c1]",
          "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#d1e0ff]",
          // Disabled — Figma 26682:48626
          "disabled:border-[#b2ccff] disabled:bg-[#b2ccff] disabled:text-white disabled:shadow-none disabled:opacity-100",
        ].join(" "),
        warning: [
          "border-[#dc6803] bg-[#dc6803] text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          "hover:border-[#b54708] hover:bg-[#b54708]",
          "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#fef0c7]",
          "disabled:opacity-50",
        ].join(" "),
        "warning-outline": [
          "border-[#fec84b] bg-white text-[#b54708] shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          "hover:border-[#fec84b] hover:bg-[#fffaeb]",
          "active:border-[#fdb022] active:bg-[#fffaeb] active:shadow-none",
          "focus-visible:border-[#fec84b] focus-visible:bg-[#fffaeb]",
          "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#fef0c7]",
          "disabled:opacity-50",
        ].join(" "),
        destructive: [
          "border-[#d92d20] bg-[#d92d20] text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          "hover:border-[#b42318] hover:bg-[#b42318]",
          "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#fee4e2]",
          "disabled:opacity-50",
        ].join(" "),
        "destructive-tertiary": [
          // Default — Figma 26682:48450
          "border-[#fef3f2] bg-[#fef3f2] text-[#b42318] shadow-none",
          // Hover — Figma 26682:49122
          "hover:border-[#fee4e2] hover:bg-[#fee4e2] hover:text-[#912018]",
          // Active — Figma 26682:48898
          "active:border-[#fef3f2] active:bg-[#fecdca] active:text-[#7a271a] active:shadow-none",
          // Focus — Figma 27602:29399
          "focus-visible:border-[#fee4e2] focus-visible:bg-[#fee4e2] focus-visible:text-[#912018]",
          "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#fee4e2]",
          // Disabled — Figma 26682:48674
          "disabled:border-[#fffbfa] disabled:bg-[#fffbfa] disabled:text-[#fda29b] disabled:shadow-none disabled:opacity-100",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  className,
  variant,
  type = "button",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      type={asChild ? undefined : type}
      data-slot="highrise-button"
      data-variant={variant}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}
