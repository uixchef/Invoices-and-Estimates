"use client"

import { useEffect, useState, type ComponentProps, type SVGProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { useCreateWithAi } from "@/lib/create-with-ai-context"
import { cn } from "@/lib/utils"

function AutoAwesomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </svg>
  )
}

/**
 * HighRise AI 1.1 — Button / Primary / Secondary / sm
 * Figma states for "Create with AI":
 * - Default:  27769:38848
 * - Active:   27769:38880
 * - Hover:    27769:38896
 * - Focused:  27769:38900
 * - Disabled: 27769:38864
 */
const createWithAiButtonVariants = cva(
  [
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded border px-3.5 py-2",
    "font-[family-name:var(--font-inter)] text-base font-semibold leading-6",
    "transition-colors focus-visible:outline-none",
    "border-[#bdb4fe] bg-white text-[#5925dc] shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
    "hover:border-[#bdb4fe] hover:bg-[#f4f3ff] hover:text-[#4a1fb8]",
    "active:border-[#bdb4fe] active:bg-[#ebe9fe] active:text-[#3e1c96] active:shadow-none",
    "focus-visible:border-[#bdb4fe] focus-visible:bg-[#f4f3ff] focus-visible:text-[#4a1fb8]",
    "focus-visible:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_0_0_4px_#ebe9fe]",
    "disabled:pointer-events-none disabled:border-[#d9d6fe] disabled:bg-white disabled:text-[#d9d6fe] disabled:shadow-none",
  ].join(" ")
)

type CreateWithAiButtonProps = ComponentProps<"button"> &
  VariantProps<typeof createWithAiButtonVariants>

const BUTTON_TRANSITION_MS = 300

export function CreateWithAiButton({
  className,
  disabled,
  type = "button",
  onClick,
  ...props
}: CreateWithAiButtonProps) {
  const { isOpen, open } = useCreateWithAi()
  const [shouldRender, setShouldRender] = useState(!isOpen)
  const [isVisible, setIsVisible] = useState(!isOpen)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(false)
      const timeout = window.setTimeout(
        () => setShouldRender(false),
        BUTTON_TRANSITION_MS
      )
      return () => window.clearTimeout(timeout)
    }

    setShouldRender(true)
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsVisible(true))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  if (!shouldRender) {
    return null
  }

  return (
    <button
      type={type}
      disabled={disabled}
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      className={cn(
        createWithAiButtonVariants(),
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        className
      )}
      onClick={(event) => {
        open()
        onClick?.(event)
      }}
      {...props}
    >
      <AutoAwesomeIcon className="size-5 shrink-0" />
      Create with AI
    </button>
  )
}
