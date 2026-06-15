"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
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
  const [promptHovered, setPromptHovered] = useState(false)
  const [promptValue, setPromptValue] = useState("")
  const [promptFocused, setPromptFocused] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(Number.POSITIVE_INFINITY)
  // Screen-space anchor for the docked prompt. It's rendered in a portal so the
  // canvas's scaled, overflow-hidden ancestors can't clip it (Figma 5625:23853).
  const [promptAnchor, setPromptAnchor] = useState<{
    left: number
    top: number
  } | null>(null)

  // Track the element's rendered width so narrow elements can collapse their
  // left + right toolbars into one bar instead of letting them overlap.
  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) {
      return
    }
    const update = () => setWidth(node.getBoundingClientRect().width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Tools + prompt belong to the "hover over the selected layer" state; we keep
  // them while the prompt is hovered or focused so moving to / typing in the
  // (portaled) prompt doesn't dismiss it.
  const showChrome = selected && (hovered || promptFocused || promptHovered)

  // A toolbar is p-1 padding (8px) + N×16px buttons + gaps. When both toolbars
  // can't sit side by side without overlapping, merge them into one.
  const toolbarWidth = (count: number) =>
    count > 0 ? 8 + count * 16 + (count - 1) * 4 : 0
  const hasBothToolbars = leftActions.length > 0 && rightActions.length > 0
  const mergeToolbars =
    hasBothToolbars &&
    width <
      toolbarWidth(leftActions.length) + toolbarWidth(rightActions.length) + 8
  // The scoped prompt box docks under the element at a fixed 288px width. The
  // name badge normally pins to the element's bottom-right; on a narrow element
  // it would land on top of the prompt box, so we move it to the prompt's
  // bottom edge instead. Estimate the badge width (11px semibold ≈ 7px/char +
  // padding) so the relocation also covers wide-ish elements with long labels.
  const PROMPT_WIDTH = 288
  const promptVisible = Boolean(onSubmitPrompt) && showChrome
  const estimatedBadgeWidth = label.length * 7 + 8
  const relocateLabel = promptVisible && width < PROMPT_WIDTH + estimatedBadgeWidth

  const badgeClass = cn(
    "z-20 items-center whitespace-nowrap rounded-bl-[4px] rounded-br-[4px] rounded-tl-[4px] bg-[#6938ef] px-1 py-px",
    "font-[family-name:var(--font-inter)] text-[11px] font-semibold leading-4 text-white"
  )

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

  // Track the element's on-screen rect so the portaled prompt stays docked to it
  // (and clamped within the viewport) as the canvas scrolls or resizes.
  useLayoutEffect(() => {
    if (!promptVisible) {
      return
    }
    const node = rootRef.current
    if (!node) {
      return
    }
    const update = () => {
      const rect = node.getBoundingClientRect()
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - PROMPT_WIDTH - 8)
      )
      setPromptAnchor({ left, top: rect.bottom + 8 })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [promptVisible])

  return (
    <div
      ref={rootRef}
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

      {showChrome && mergeToolbars ? (
        // Narrow element: a single combined bar (arrange + clipboard) so the
        // controls stay fully visible instead of overlapping.
        <div className={cn(TOOLBAR_BASE, "left-0 rounded-t-[4px]")}>
          {leftActions.map((action) => (
            <ToolbarButton key={action.label} action={action} />
          ))}
          <span
            className="mx-0.5 h-3.5 w-px shrink-0 bg-white/30"
            aria-hidden
          />
          {rightActions.map((action) => (
            <ToolbarButton key={action.label} action={action} />
          ))}
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Corner name badge — pinned bottom-right (Figma 3194:71355). Selected
          shows it always; otherwise it follows the deepest-only hover. Hidden
          when relocated onto the prompt box (narrow element) to avoid overlap. */}
      {relocateLabel ? null : (
        <div
          className={cn(
            "absolute -bottom-2 right-0",
            badgeClass,
            selected
              ? "flex"
              : "hidden group-hover/sel:flex group-has-[[data-sel]:hover]/sel:hidden"
          )}
        >
          {label}
        </div>
      )}

      {/* Scoped "Describe your edit" prompt docked below the selected layer.
          Rendered in a portal at the element's screen position so the canvas's
          scaled, overflow-hidden ancestors can't clip it; clamped to the
          viewport. Hover → purple/300 border + md shadow; focus → purple/400
          border + lg shadow (Figma 5625:23853 / 23856). */}
      {onSubmitPrompt &&
      promptVisible &&
      promptAnchor &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              onClick={(event) => event.stopPropagation()}
              onMouseEnter={() => setPromptHovered(true)}
              onMouseLeave={() => setPromptHovered(false)}
              style={{
                position: "fixed",
                left: promptAnchor.left,
                top: promptAnchor.top,
                width: PROMPT_WIDTH,
              }}
              className={cn(
                "z-[60] flex max-w-[768px] items-center gap-2.5 rounded-lg border border-[#bdb4fe] bg-white p-2 transition-shadow",
                "shadow-[0px_4px_4px_rgba(16,24,40,0.1),0px_2px_2px_rgba(16,24,40,0.06)]",
                "focus-within:border-[#9b8afb] focus-within:shadow-[0px_12px_8px_rgba(16,24,40,0.08),0px_4px_3px_rgba(16,24,40,0.03)]"
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

              {/* On a narrow element the name sits just under the prompt box's
                  bottom-left (2px gap) instead of the element corner, so it never
                  overlaps the prompt and has room to breathe. */}
              {relocateLabel ? (
                <div
                  className={cn(
                    "absolute left-0 top-full mt-0.5 flex",
                    badgeClass
                  )}
                >
                  {label}
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
