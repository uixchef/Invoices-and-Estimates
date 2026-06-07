"use client"

import { useState, type ComponentType, type ReactNode } from "react"
import {
  Brain,
  ChevronDown,
  CircleHelp,
  FastForward,
  Hourglass,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Figma: Ask AI / "AI in Action" (34:35648)
 *
 * A single status line that communicates what the assistant is doing. Active
 * states (thinking / planning / asking) show a shimmer sweep; completed states
 * (thought / received-answers) are collapsible to reveal reasoning or answers.
 */
export type AiActionType =
  | "thinking"
  | "thought"
  | "planning"
  | "asking"
  | "received-answers"
  | "processing"

type TypeConfig = {
  icon: ComponentType<{ className?: string }>
  /** Static label, or null when the label is derived (e.g. "Thought for Ns"). */
  label: string | null
  /** In-progress states animate a shimmer over the row. */
  shimmer: boolean
  /** Completed states can expand to reveal content. */
  expandable: boolean
}

const TYPE_CONFIG: Record<Exclude<AiActionType, "processing">, TypeConfig> = {
  thinking: { icon: Brain, label: "Thinking...", shimmer: true, expandable: true },
  thought: { icon: Hourglass, label: null, shimmer: false, expandable: true },
  planning: {
    icon: FastForward,
    label: "Planning next moves...",
    shimmer: true,
    expandable: false,
  },
  asking: {
    icon: CircleHelp,
    label: "Asking questions...",
    shimmer: true,
    expandable: false,
  },
  "received-answers": {
    icon: CircleHelp,
    label: "Received answers",
    shimmer: false,
    expandable: true,
  },
}

type AiInActionProps = {
  type: AiActionType
  /** Seconds for the "thought" label → "Thought for {durationSec}s". */
  durationSec?: number
  /** Content revealed when an expandable state is open. */
  children?: ReactNode
  defaultExpanded?: boolean
  className?: string
}

function ProcessingDots() {
  return (
    <div
      className="flex h-4 items-center gap-1"
      role="status"
      aria-label="Processing"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="ai-action-dot size-1.5 rounded-full bg-[#9b8afb]"
          style={{ animationDelay: `${index * 0.16}s` }}
        />
      ))}
    </div>
  )
}

export function AiInAction({
  type,
  durationSec,
  children,
  defaultExpanded = false,
  className,
}: AiInActionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (type === "processing") {
    return <ProcessingDots />
  }

  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const label =
    config.label ?? `Thought for ${Math.max(0, durationSec ?? 0)}s`
  const hasContent = config.expandable && Boolean(children)
  const isExpanded = hasContent && expanded

  const RowTag = hasContent ? "button" : "div"

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1 font-[family-name:var(--font-inter)]",
        className
      )}
    >
      <RowTag
        {...(hasContent
          ? {
              type: "button" as const,
              onClick: () => setExpanded((value) => !value),
              "aria-expanded": isExpanded,
            }
          : {})}
        className={cn(
          "group flex w-full items-center gap-1 text-left",
          hasContent && "cursor-pointer outline-none",
          config.shimmer && !isExpanded && "ai-action-shimmer",
          // Expanded label deepens to purple/900; otherwise purple/400 → 600 on hover.
          isExpanded
            ? "text-[#3e1c96]"
            : "text-[#9b8afb] group-hover:text-[#6938ef]"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate text-[13px] font-medium leading-[18px]">
          {label}
        </span>
        {hasContent ? (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              isExpanded && "rotate-180"
            )}
            aria-hidden
          />
        ) : null}
      </RowTag>

      {isExpanded ? (
        <div className="pl-5 text-[12px] leading-[17px] text-[#3e1c96]">
          {children}
        </div>
      ) : null}
    </div>
  )
}
