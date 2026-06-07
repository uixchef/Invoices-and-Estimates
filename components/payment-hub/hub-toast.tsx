"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { AlertCircle, CheckCircle2, X } from "lucide-react"

import { cn } from "@/lib/utils"

type HubToastVariant = "success" | "error"

type HubToastState = {
  message: string
  variant: HubToastVariant
} | null

type HubToastContextValue = {
  toast: HubToastState
  dismiss: () => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

const HubToastContext = createContext<HubToastContextValue | null>(null)

export const HUB_TOAST_DURATION_MS = 3000

/** Figma modal overlay — Alert from top of viewport (Subscription-2025, e.g. node 1422:260829). */
export const MODAL_OVERLAY_TOAST_TOP_PX = 52

const TOAST_MS = HUB_TOAST_DURATION_MS

/**
 * Figma Alert (node 1399:35444) — error: bg/border/text from Secondary/Error tokens.
 * Success: same layout with success surface + check icon.
 */
export function HubAlertToast({
  variant,
  message,
  onDismiss,
  className,
}: {
  variant: HubToastVariant
  message: string
  onDismiss: () => void
  /** e.g. `w-full max-w-none` when embedded in a modal */
  className?: string
}) {
  const titleId = useId()
  const isError = variant === "error"

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-labelledby={titleId}
      className={cn(
        "pointer-events-auto flex w-fit max-w-[min(478px,calc(100vw-2rem))] items-start gap-2 rounded-[8px] border border-solid p-2 shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]",
        isError
          ? "border-[#fda29b] bg-[#fffbfa]"
          : "border-[#6ce9a6] bg-[#ecfdf3]",
        className
      )}
    >
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center"
        aria-hidden
      >
        {isError ? (
          <AlertCircle className="size-5 text-[#b42318]" strokeWidth={2} />
        ) : (
          <CheckCircle2 className="size-5 text-[#027a48]" strokeWidth={2} />
        )}
      </span>
      <p
        id={titleId}
        className={cn(
          "min-w-0 flex-1 break-words text-base font-semibold leading-6",
          isError ? "text-[#b42318]" : "text-[#027a48]"
        )}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center self-start rounded text-[#667085] outline-none hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[#004eeb]/30"
        aria-label="Dismiss notification"
      >
        <X className="size-5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}

export function HubToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<HubToastState>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const dismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast(null)
  }, [])

  const show = useCallback((variant: HubToastVariant, message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast({ variant, message })
    timeoutRef.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const showSuccess = useCallback(
    (message: string) => show("success", message),
    [show]
  )
  const showError = useCallback(
    (message: string) => show("error", message),
    [show]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const value: HubToastContextValue = {
    toast,
    dismiss,
    showSuccess,
    showError,
  }

  return (
    <HubToastContext.Provider value={value}>{children}</HubToastContext.Provider>
  )
}

/**
 * Centered horizontally within the shell `main` column (white content area, excluding sidebar).
 */
export function HubToastViewport() {
  const ctx = useContext(HubToastContext)
  if (!ctx) {
    throw new Error("HubToastViewport must be used within HubToastProvider")
  }
  const { toast, dismiss } = ctx
  if (!toast) return null

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-4 z-[260] w-max max-w-[min(478px,calc(100%-2rem))] -translate-x-1/2 px-4"
    >
      <HubAlertToast
        variant={toast.variant}
        message={toast.message}
        onDismiss={dismiss}
      />
    </div>
  )
}

export function useHubToast(): Pick<
  HubToastContextValue,
  "showSuccess" | "showError"
> {
  const ctx = useContext(HubToastContext)
  if (!ctx) {
    throw new Error("useHubToast must be used within HubToastProvider")
  }
  const { showSuccess, showError } = ctx
  return { showSuccess, showError }
}
