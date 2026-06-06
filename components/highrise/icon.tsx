"use client"

import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

export const HIGHRISE_COMPONENT_KEY = "icon" as const
export const HIGHRISE_INTERNAL_NAME = "HLIcon" as const

export type HLIconProps = {
  id?: string
  size?: string | number
  color?: string
  className?: string
  decorative?: boolean
  "aria-label"?: string
  title?: string
  children: ReactNode
}

function sizeToCss(size: string | number | undefined): CSSProperties | undefined {
  if (size === undefined) return undefined
  const value = typeof size === "number" ? `${size}px` : size
  return { width: value, height: value }
}

export function HLIcon({
  id,
  size = 16,
  color,
  className,
  decorative,
  "aria-label": ariaLabel,
  title,
  children,
}: HLIconProps) {
  const isDecorative = decorative ?? !ariaLabel
  const style: CSSProperties = {
    ...sizeToCss(size),
    ...(color ? { color } : {}),
  }

  const sizedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    const el = child as ReactElement<{ className?: string; style?: CSSProperties }>
    return cloneElement(el, {
      className: cn("h-full w-full shrink-0", el.props.className),
      style: { ...el.props.style, color: "currentColor" },
    })
  })

  return (
    <span
      id={id}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={isDecorative ? true : undefined}
      title={title}
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={style}
    >
      {sizedChildren}
    </span>
  )
}
