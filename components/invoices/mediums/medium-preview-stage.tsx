"use client"

import {
  getOrientedDimensions,
  type MediumFormState,
} from "@/lib/medium-form"
import { cn } from "@/lib/utils"

type MediumPreviewStageProps = {
  state: MediumFormState
  className?: string
  contentClassName?: string
  /** Builder uses 72% cap; cards maximize page silhouette for distinct aspect ratios. */
  variant?: "builder" | "card"
}

const PAGE_FILL: Record<NonNullable<MediumPreviewStageProps["variant"]>, string> =
  {
    builder: "72%",
    card: "84%",
  }

/**
 * Shared dot-grid canvas with page + safe area — used in builder and medium cards.
 */
export function MediumPreviewStage({
  state,
  className,
  contentClassName = "p-6",
  variant = "builder",
}: MediumPreviewStageProps) {
  const oriented = getOrientedDimensions(
    state.width,
    state.height,
    state.orientation
  )
  const pageAspect = oriented.width / oriented.height
  const fill = PAGE_FILL[variant]
  const safeLeftPct = (state.safeArea.left / oriented.width) * 100
  const safeRightPct = (state.safeArea.right / oriented.width) * 100
  const safeTopPct = (state.safeArea.top / oriented.height) * 100
  const safeBottomPct = (state.safeArea.bottom / oriented.height) * 100

  return (
    <div className={cn("relative overflow-hidden bg-[#f2f4f7]", className)}>
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, #d0d5dd 2px, transparent 2px)",
          backgroundSize: "20px 20px",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          contentClassName
        )}
      >
        <div
          className={cn(
            "relative z-[1] shrink-0 bg-white",
            variant === "card"
              ? "shadow-[0_10px_28px_rgba(16,24,40,0.14)]"
              : "shadow-[0_8px_24px_rgba(16,24,40,0.08)]"
          )}
          style={{
            aspectRatio: String(pageAspect),
            ...(pageAspect >= 1
              ? { width: fill, maxHeight: fill }
              : { height: fill, maxWidth: fill }),
          }}
          aria-hidden
        >
          <div
            className={cn(
              "absolute border border-dashed border-[#84adff]",
              variant === "card"
                ? "border-2 bg-[#dbeafe]/70"
                : "bg-[#eff4ff]/40"
            )}
            style={{
              left: `${safeLeftPct}%`,
              right: `${safeRightPct}%`,
              top: `${safeTopPct}%`,
              bottom: `${safeBottomPct}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
