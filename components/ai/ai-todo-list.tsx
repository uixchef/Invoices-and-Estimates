"use client"

import { useState } from "react"
import {
  ChevronDown,
  Circle,
  CircleArrowRight,
  CircleCheck,
  ListChecks,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Figma: HighRise AI — "To-dos" accordion (5354:28036)
 *
 * Collapsible plan checklist. The card lists the steps the assistant is working
 * through. The active step (in-progress) shows a filled arrow badge at full
 * opacity; pending / done steps dim to 60%, and done labels strike through.
 */
export type AiTodoStatus = "done" | "in-progress" | "pending"

export type AiTodoItem = {
  id: string
  label: string
  status: AiTodoStatus
}

function TodoItemIcon({ status }: { status: AiTodoStatus }) {
  if (status === "done") {
    return (
      <CircleCheck
        className="size-4 shrink-0 fill-[#6938ef] text-white"
        strokeWidth={2.5}
        aria-hidden
      />
    )
  }

  if (status === "in-progress") {
    return (
      <CircleArrowRight
        className="size-4 shrink-0 fill-[#6938ef] text-white"
        strokeWidth={2.5}
        aria-hidden
      />
    )
  }

  return <Circle className="size-4 shrink-0 text-[#667085]" aria-hidden />
}

type AiTodoListProps = {
  items: AiTodoItem[]
  title?: string
  defaultCollapsed?: boolean
  className?: string
}

export function AiTodoList({
  items,
  title = "To-dos",
  defaultCollapsed,
  className,
}: AiTodoListProps) {
  const doneCount = items.filter((item) => item.status === "done").length
  const allDone = items.length > 0 && doneCount === items.length
  // Once every step is done the plan auto-collapses to a summary row, since the
  // detail is no longer the focus (Figma 7027:256006). A live, in-progress plan
  // stays open. An explicit `defaultCollapsed` always wins.
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? allDone)

  if (items.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "flex w-fit max-w-full flex-col gap-3 rounded-lg border border-[#d9d6fe] bg-[#fafaff] p-2 font-[family-name:var(--font-inter)]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
      >
        <span className="flex min-w-0 items-center gap-1">
          <ListChecks className="size-4 shrink-0 text-[#101828]" aria-hidden />
          <span className="truncate text-sm font-semibold leading-5 text-[#101828]">
            {title}
          </span>
          <span className="flex shrink-0 items-center justify-center rounded-[2px] bg-[#ebe9fe] px-[5px] text-xs font-medium leading-[17px] text-[#344054]">
            {allDone ? `${doneCount}/${items.length} completed` : items.length}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#475467] transition-transform",
            collapsed ? "rotate-0" : "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {!collapsed ? (
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.status === "in-progress"
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-2",
                  active ? "opacity-100" : "opacity-60"
                )}
              >
                <span className="flex shrink-0 items-center pt-px">
                  <TodoItemIcon status={item.status} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-xs font-normal leading-[17px] text-[#101828]",
                    item.status === "done" && "line-through"
                  )}
                >
                  {item.label}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
