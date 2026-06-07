"use client"

/**
 * HighRise: `content-switcher` → HLContentSwitcher
 * Figma Content Switcher / Item / Primary / sm (HighRise 1.1):
 * - Unselected default: 26901:5737
 * - Unselected hover:   28422:175810
 * - Selected default:   26901:5735
 * - Selected hover:     28422:175738
 * @see https://highrise.gohighlevel.com/components/common/content-switcher
 */

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export const HIGHRISE_COMPONENT_KEY = "content-switcher" as const
export const HIGHRISE_INTERNAL_NAME = "HLContentSwitcher" as const

export type ContentSwitcherOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

export type ContentSwitcherProps<T extends string> = {
  value: T
  onChange: (next: T) => void
  options: Array<ContentSwitcherOption<T>>
  ariaLabel: string
  /** Icon-only compact control (e.g. grid/list view toggle in toolbars). */
  iconOnly?: boolean
  className?: string
}

const ITEM_BASE = cn(
  "outline-none transition-[background-color,border-color,color,box-shadow]",
  "focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
)

const ITEM_BASE_DEFAULT = cn(
  ITEM_BASE,
  "flex min-w-0 flex-1 items-center justify-center gap-2 px-3.5 py-2",
  "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5"
)

const ITEM_BASE_ICON_ONLY = cn(
  ITEM_BASE,
  "flex w-9 shrink-0 items-center justify-center"
)

const ITEM_UNSELECTED = cn(
  "bg-white text-[#475467] shadow-[0_1px_1px_rgba(16,24,40,0.05)]",
  "hover:bg-[#f9fafb]"
)

const ITEM_SELECTED = cn(
  "bg-[#eff4ff] text-[#004eeb] border border-[#eff4ff]",
  "hover:bg-[#d1e0ff] hover:border-[#b2ccff]"
)

export function ContentSwitcher<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  iconOnly = false,
  className,
}: ContentSwitcherProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex h-9 overflow-hidden rounded-[4px] border border-[#d0d5dd]",
        iconOnly ? "w-auto shrink-0" : "w-full",
        className
      )}
    >
      {options.map((option, index) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            aria-label={iconOnly ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              iconOnly ? ITEM_BASE_ICON_ONLY : ITEM_BASE_DEFAULT,
              index > 0 && "border-l border-[#d0d5dd]",
              isActive ? ITEM_SELECTED : ITEM_UNSELECTED
            )}
          >
            {option.icon ? (
              <span className="inline-flex size-5 shrink-0 items-center justify-center [&_svg]:size-5">
                {option.icon}
              </span>
            ) : null}
            {iconOnly ? null : <span className="truncate">{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
