import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded border border-[#d0d5dd] bg-white px-2 py-1 text-base text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#475467] selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-input dark:bg-input/30 dark:text-foreground",
        "focus:border-[#84adff] focus:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)] focus-visible:border-[#84adff] focus-visible:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_4px_rgba(254,228,226,1),0_1px_2px_rgba(16,24,40,0.05)] aria-invalid:focus:border-destructive aria-invalid:focus:shadow-[0_0_0_4px_#fee4e2,0_1px_2px_rgba(16,24,40,0.05)] dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
