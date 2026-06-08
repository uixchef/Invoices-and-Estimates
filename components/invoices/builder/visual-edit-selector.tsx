"use client"

import { useRef, useState, type ReactNode } from "react"
import { Send } from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { cn } from "@/lib/utils"

/**
 * Figma: Invoices — Visual edit "Selector"
 *   • Default / selected (3194:71355): purple outline + corner name badge.
 *   • Hover over selected (3194:71358): adds the arrange (top-left) and
 *     clipboard (top-right) toolbars plus a "Describe your edit" inline prompt
 *     docked beneath the element.
 *
 * Cursor's model: hovering a layer hints it (light ring + label); clicking
 * selects it (solid ring + label); hovering the selected layer reveals its
 * actions and the scoped prompt input.
 */
export type SelectorAction = {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}

const TOOLBAR_BASE =
  "absolute -top-[25px] z-20 flex items-center gap-1 bg-[#6938ef] p-1"

function ToolbarButton({ action }: { action: SelectorAction }) {
  return (
    <button
      type="button"
      aria-label={action.label}
      onClick={(event) => {
        event.stopPropagation()
        action.onClick()
      }}
      disabled={action.disabled}
      className={cn(
        "inline-flex size-4 items-center justify-center rounded-[4px] text-white outline-none transition-colors",
        "hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60",
        "disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-4"
      )}
    >
      {action.icon}
    </button>
  )
}

export function VisualEditSelector({
  label,
  selected = false,
  onSelect,
  onSubmitPrompt,
  leftActions = [],
  rightActions = [],
  className,
  children,
}: {
  label: string
  selected?: boolean
  /** Selects the layer (click anywhere on it), like Cursor's element pick. */
  onSelect?: () => void
  /** Submits the inline "Describe your edit" prompt scoped to this layer. */
  onSubmitPrompt?: (text: string) => void
  leftActions?: SelectorAction[]
  rightActions?: SelectorAction[]
  className?: string
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const [promptValue, setPromptValue] = useState("")
  const [promptFocused, setPromptFocused] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  // Tools + prompt belong to the "hover over the selected layer" state; we keep
  // them while the prompt is focused so typing doesn't dismiss them.
  const showChrome = selected && (hovered || promptFocused)
  // "Filled" drives the active send button (Figma 5625:23865 / 23868).
  const filled = promptValue.trim().length > 0

  const resizePrompt = () => {
    const node = promptRef.current
    if (!node) {
      return
    }
    node.style.height = "auto"
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`
  }

  const submitPrompt = () => {
    if (!filled) {
      return
    }
    onSubmitPrompt?.(promptValue.trim())
    setPromptValue("")
    requestAnimationFrame(resizePrompt)
  }

  return (
    <div
      data-sel
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Deepest element wins: stop the click from bubbling to ancestor
      // selectors so picking a child doesn't also select its container.
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
      className={cn(
        "group/sel relative rounded-[4px] ring-1 transition-shadow",
        // Selected always shows the solid ring. Otherwise hover shows the soft
        // ring, but it's suppressed whenever a nested selector is hovered so
        // only the innermost element under the pointer highlights (Cursor model).
        selected
          ? "ring-[#6938ef]"
          : "ring-transparent hover:ring-[#9b8afb] has-[[data-sel]:hover]:ring-transparent",
        className
      )}
    >
      {children}

      {showChrome && leftActions.length > 0 ? (
        <div className={cn(TOOLBAR_BASE, "left-0 rounded-t-[4px]")}>
          {leftActions.map((action) => (
            <ToolbarButton key={action.label} action={action} />
          ))}
        </div>
      ) : null}

      {showChrome && rightActions.length > 0 ? (
        <div className={cn(TOOLBAR_BASE, "right-0 rounded-t-[4px]")}>
          {rightActions.map((action) => (
            <ToolbarButton key={action.label} action={action} />
          ))}
        </div>
      ) : null}

      {/* Corner name badge — pinned bottom-right (Figma 3194:71355). Selected
          shows it always; otherwise it follows the deepest-only hover. */}
      <div
        className={cn(
          "absolute -bottom-2 right-0 z-20 items-center whitespace-nowrap rounded-bl-[4px] rounded-br-[4px] rounded-tl-[4px] bg-[#6938ef] px-1 py-px",
          "font-[family-name:var(--font-inter)] text-[11px] font-semibold leading-4 text-white",
          selected
            ? "flex"
            : "hidden group-hover/sel:flex group-has-[[data-sel]:hover]/sel:hidden"
        )}
      >
        {label}
      </div>

      {/* Scoped "Describe your edit" prompt docked below the selected layer.
          Hover → purple/300 border + md shadow; focus → purple/400 border + lg
          shadow (Figma 5625:23853 / 23856). */}
      {onSubmitPrompt ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "absolute left-0 top-full z-30 mt-2 w-[288px] max-w-[768px] items-center gap-2.5 rounded-lg border border-[#bdb4fe] bg-white p-2 transition-shadow",
            "shadow-[0px_4px_4px_rgba(16,24,40,0.1),0px_2px_2px_rgba(16,24,40,0.06)]",
            "focus-within:border-[#9b8afb] focus-within:shadow-[0px_12px_8px_rgba(16,24,40,0.08),0px_4px_3px_rgba(16,24,40,0.03)]",
            showChrome ? "flex" : "hidden"
          )}
        >
          <AutoAwesomeIcon className="size-4 shrink-0 text-[#6938ef]" />
          <textarea
            ref={promptRef}
            value={promptValue}
            rows={1}
            onChange={(event) => {
              setPromptValue(event.target.value)
              resizePrompt()
            }}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submitPrompt()
              }
            }}
            placeholder="Describe your edit"
            aria-label={`Describe your edit for ${label}`}
            className={cn(
              "min-w-0 max-h-[200px] flex-1 resize-none border-0 bg-transparent p-0 outline-none",
              "font-[family-name:var(--font-inter)] text-base font-normal leading-5 text-[#101828]",
              "placeholder:text-[#98a2b3] caret-[#6938ef]"
            )}
          />
          {/* Empty → purple/200 idle; filled → purple/600 active (xs shadow). */}
          <button
            type="button"
            aria-label="Submit edit"
            disabled={!filled}
            onClick={submitPrompt}
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] border outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-3.5",
              filled
                ? "border-[#6938ef] bg-[#6938ef] text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#5925dc]"
                : "cursor-not-allowed border-[#d9d6fe] bg-[#d9d6fe] text-white"
            )}
          >
            <Send aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
