"use client"

import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function FormSectionDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-1">
      <div className="h-px w-4 shrink-0 bg-[#eaecf0]" aria-hidden />
      <span className="shrink-0 font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
        {label}
      </span>
      <div className="h-px min-w-0 flex-1 bg-[#eaecf0]" aria-hidden />
    </div>
  )
}

export function MediumFormLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#101828]"
    >
      {children}
    </label>
  )
}

export function ContentSwitcher<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (next: T) => void
  options: Array<{ value: T; label: string }>
  ariaLabel: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex h-9 w-full overflow-hidden rounded border border-[#d0d5dd]"
    >
      {options.map((option, index) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center px-3.5 py-2",
              "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5",
              index > 0 && "border-l border-[#d0d5dd]",
              isActive
                ? "bg-[#eff4ff] text-[#004eeb]"
                : "bg-white text-[#475467] shadow-[0_1px_1px_rgba(16,24,40,0.05)]"
            )}
          >
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Figma: Input Form / number stepper (3087:137039)
 * Enabled: Input 26683:40638 — white field, #101828 value.
 * Disabled/read-only: Input 26683:40560 — #f9fafb field, #98a2b3 value.
 */
export function NumberStepperInput({
  id,
  label,
  value,
  onChange,
  min = 0,
  disabled = false,
  readOnly = false,
}: {
  id: string
  label: string
  value: number
  onChange: (next: number) => void
  min?: number
  disabled?: boolean
  readOnly?: boolean
}) {
  const isLocked = disabled || readOnly
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(value + 1)

  const stepperButtonClass = cn(
    "flex size-4 shrink-0 items-center justify-center outline-none",
    isLocked
      ? "cursor-not-allowed text-[#98a2b3]"
      : "text-[#475467] transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
  )

  const valueClass = cn(
    "min-w-0 flex-1 font-[family-name:var(--font-inter)] text-sm font-normal leading-5",
    isLocked ? "text-[#98a2b3]" : "text-[#101828]"
  )

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <MediumFormLabel htmlFor={id}>{label}</MediumFormLabel>
      <div
        className={cn(
          "flex h-9 w-full items-center overflow-hidden rounded border border-[#d0d5dd] shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          isLocked
            ? "bg-[#f9fafb]"
            : "bg-white focus-within:border-[#84adff] focus-within:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]"
        )}
      >
        <div className="flex h-full min-w-0 flex-1 items-center gap-1 py-2 pl-2">
          {isLocked ? (
            <span id={id} className={valueClass} aria-readonly="true">
              {value}
            </span>
          ) : (
            <input
              id={id}
              type="text"
              inputMode="numeric"
              value={value}
              disabled={disabled}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (!Number.isNaN(next)) {
                  onChange(Math.max(min, next))
                }
              }}
              className={cn(valueClass, "bg-transparent outline-none")}
            />
          )}
          <button
            type="button"
            aria-label={`Increase ${label}`}
            disabled={isLocked}
            onClick={increment}
            className={stepperButtonClass}
          >
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="flex h-full shrink-0 items-center px-2.5 py-2">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            disabled={isLocked || value <= min}
            onClick={decrement}
            className={stepperButtonClass}
          >
            <Minus className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
