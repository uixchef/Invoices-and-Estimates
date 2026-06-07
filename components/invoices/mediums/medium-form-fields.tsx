"use client"

import { useState, type ReactNode } from "react"
import { Minus, Plus } from "lucide-react"

import type { MediumSafeArea } from "@/lib/medium-form"
import { cn } from "@/lib/utils"

/** Figma section title (3177:33349) — Text 2xl/Medium, 16px. */
export function MediumSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#101828]">
      {children}
    </h3>
  )
}

/** Figma Divider (3177:33374) — full-width #eaecf0 rule. */
export function MediumSectionDivider() {
  return <div className="h-px w-full bg-[#eaecf0]" aria-hidden />
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

export { ContentSwitcher } from "@/components/highrise/content-switcher"

/** Figma Padding icons (3178:33461). */
const SAFE_AREA_ICONS = {
  distributeHorizontal: "/icons/safe-area/distribute-spacing-horizontal.png",
  distributeVertical: "/icons/safe-area/distribute-spacing-vertical.png",
  alignLeft: "/icons/safe-area/flex-align-left.png",
  alignTop: "/icons/safe-area/flex-align-top.png",
  alignRight: "/icons/safe-area/flex-align-right.png",
  alignBottom: "/icons/safe-area/flex-align-bottom.png",
  maximize: "/icons/safe-area/maximize-02.png",
  maximizeActive: "/icons/safe-area/maximize-02-blue.png",
} as const

function SafeAreaIcon({ src, size = 16 }: { src: string; size?: 16 | 20 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="block shrink-0"
      aria-hidden
    />
  )
}

const STEPPER_BUTTON_CLASS =
  "flex size-4 shrink-0 items-center justify-center text-[#475467] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"

function SafeAreaValueInput({
  id,
  iconSrc,
  value,
  onChange,
  ariaLabel,
  min = 0,
}: {
  id: string
  iconSrc: string
  value: number
  onChange: (next: number) => void
  ariaLabel: string
  min?: number
}) {
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(value + 1)

  return (
    <div
      className={cn(
        "flex h-9 w-full items-center overflow-hidden rounded-[4px]",
        "border border-[#d0d5dd] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        "focus-within:border-[#84adff] focus-within:shadow-[0_0_0_4px_#eff4ff,0_1px_2px_rgba(16,24,40,0.05)]"
      )}
    >
      <div className="flex h-full min-w-0 flex-1 items-center gap-1 py-2 pl-2">
        <SafeAreaIcon src={iconSrc} />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          aria-label={ariaLabel}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (!Number.isNaN(next)) {
              onChange(Math.max(min, next))
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-left font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#101828] outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${ariaLabel}`}
          onClick={increment}
          className={STEPPER_BUTTON_CLASS}
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <div className="flex h-full shrink-0 items-center px-2.5 py-2">
        <button
          type="button"
          aria-label={`Decrease ${ariaLabel}`}
          disabled={value <= min}
          onClick={decrement}
          className={cn(
            STEPPER_BUTTON_CLASS,
            value <= min && "cursor-not-allowed text-[#98a2b3] hover:text-[#98a2b3]"
          )}
        >
          <Minus className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  )
}

const PADDING_TOGGLE_CLASS = cn(
  "inline-flex size-9 shrink-0 items-center justify-center rounded-[4px] border outline-none transition-colors",
  "focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
)

/**
 * Figma Padding (3178:33461 / 3178:33462) — uniform H/V pair or per-side grid.
 */
export function SafeAreaPadding({
  value,
  onChange,
}: {
  value: MediumSafeArea
  onChange: (next: MediumSafeArea) => void
}) {
  const [isUniform, setIsUniform] = useState(
    () => value.left === value.right && value.top === value.bottom
  )

  const setUniformHorizontal = (next: number) => {
    onChange({ ...value, left: next, right: next })
  }

  const setUniformVertical = (next: number) => {
    onChange({ ...value, top: next, bottom: next })
  }

  const setSide = (side: keyof MediumSafeArea, next: number) => {
    onChange({ ...value, [side]: next })
  }

  const toggleUniform = () => {
    if (isUniform) {
      setIsUniform(false)
      return
    }

    onChange({
      left: value.left,
      right: value.left,
      top: value.top,
      bottom: value.top,
    })
    setIsUniform(true)
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <MediumFormLabel htmlFor="safe-area-horizontal">Margin</MediumFormLabel>
      <div className="flex w-full items-start gap-4">
        {isUniform ? (
          <>
            <div className="min-w-0 flex-1">
              <SafeAreaValueInput
                id="safe-area-horizontal"
                iconSrc={SAFE_AREA_ICONS.distributeHorizontal}
                value={value.left}
                onChange={setUniformHorizontal}
                ariaLabel="Horizontal margin"
              />
            </div>
            <div className="min-w-0 flex-1">
              <SafeAreaValueInput
                id="safe-area-vertical"
                iconSrc={SAFE_AREA_ICONS.distributeVertical}
                value={value.top}
                onChange={setUniformVertical}
                ariaLabel="Vertical margin"
              />
            </div>
          </>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2">
          <SafeAreaValueInput
            id="safe-left"
            iconSrc={SAFE_AREA_ICONS.alignLeft}
            value={value.left}
            onChange={(next) => setSide("left", next)}
            ariaLabel="Left margin"
          />
          <SafeAreaValueInput
            id="safe-top"
            iconSrc={SAFE_AREA_ICONS.alignTop}
            value={value.top}
            onChange={(next) => setSide("top", next)}
            ariaLabel="Top margin"
          />
          <SafeAreaValueInput
            id="safe-right"
            iconSrc={SAFE_AREA_ICONS.alignRight}
            value={value.right}
            onChange={(next) => setSide("right", next)}
            ariaLabel="Right margin"
          />
          <SafeAreaValueInput
            id="safe-bottom"
            iconSrc={SAFE_AREA_ICONS.alignBottom}
            value={value.bottom}
            onChange={(next) => setSide("bottom", next)}
            ariaLabel="Bottom margin"
          />
        </div>
        )}

        <button
        type="button"
        aria-label={
          isUniform
            ? "Expand safe area to individual sides"
            : "Collapse safe area to uniform padding"
        }
        aria-pressed={!isUniform}
        onClick={toggleUniform}
        className={cn(
          PADDING_TOGGLE_CLASS,
          isUniform
            ? "border-[#d0d5dd] bg-white text-[#667085] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-[#f9fafb]"
            : "border-[#84adff] bg-[#d1e0ff] text-[#004eeb]"
        )}
      >
        <SafeAreaIcon
          src={isUniform ? SAFE_AREA_ICONS.maximize : SAFE_AREA_ICONS.maximizeActive}
          size={20}
        />
        </button>
      </div>
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
    STEPPER_BUTTON_CLASS,
    isLocked && "cursor-not-allowed text-[#98a2b3] hover:text-[#98a2b3]"
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
          "flex h-9 w-full items-center overflow-hidden rounded-[4px] border border-[#d0d5dd] shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
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
