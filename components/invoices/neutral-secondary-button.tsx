import type { ComponentProps } from "react"
import { Slot } from "radix-ui"

import { buttonVariants } from "@/components/highrise/button"
import { cn } from "@/lib/utils"

type NeutralSecondaryButtonProps = ComponentProps<"button"> & {
  asChild?: boolean
}

/**
 * HighRise neutral secondary CTA — delegates to HLButton `neutral` variant.
 */
export function neutralSecondaryButtonVariants() {
  return buttonVariants({ variant: "neutral" })
}

export function NeutralSecondaryButton({
  className,
  asChild = false,
  type = "button",
  ...props
}: NeutralSecondaryButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant: "neutral" }), className)}
      {...props}
    />
  )
}
