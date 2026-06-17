"use client"

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Plus } from "lucide-react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
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
  /** Turns the button into a drag handle (e.g. the section "move" grip). */
  draggable?: boolean
  onDragStart?: (event: React.DragEvent) => void
}

const TOOLBAR_BASE =
  "absolute -top-[25px] z-20 flex items-center gap-1 bg-[#6938ef] p-1"

function ToolbarButton({ action }: { action: SelectorAction }) {
  return (
    <button
      type="button"
      aria-label={action.label}
      title={action.label}
      draggable={action.draggable}
      onDragStart={action.onDragStart}
      onClick={(event) => {
        event.stopPropagation()
        action.onClick()
      }}
      disabled={action.disabled}
      className={cn(
        "inline-flex size-4 items-center justify-center rounded-[4px] text-white outline-none transition-colors",
        "hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60",
        "disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-4",
        action.draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      {action.icon}
    </button>
  )
}

export function VisualEditSelector({
  label,
  selected = false,
  working = false,
  scope = "field",
  onSelect,
  leftActions = [],
  rightActions = [],
  showAddElement = true,
  onReorderDragOver,
  onReorderDrop,
  className,
  style,
  children,
}: {
  label: string
  selected?: boolean
  /**
   * Names the hover group so nested selectors don't leak each other's badges.
   * Sections and their child fields use different groups, so hovering a section
   * reveals only the section's badge — not every field badge inside it.
   */
  scope?: "field" | "section"
  /**
   * AI is acting on this container from a scoped prompt-box edit — renders the
   * same traveling beam + shimmer as the canvas, confined to this element so the
   * change reads as local (no full-invoice animation).
   */
  working?: boolean
  /** Selects the layer (click anywhere on it), like Cursor's element pick. */
  onSelect?: () => void
  leftActions?: SelectorAction[]
  rightActions?: SelectorAction[]
  /**
   * Whether to append the default "add element near…" palette button to the
   * left toolbar. Disable it for selectors that already expose their own
   * contextual insert (e.g. a line item's "Add item below") to avoid two "+"s.
   */
  showAddElement?: boolean
  /** Drag-reorder hooks: lets a section accept another section's "move" grip. */
  onReorderDragOver?: (event: React.DragEvent) => void
  onReorderDrop?: (event: React.DragEvent) => void
  className?: string
  /** Inline style overrides for the selectable box (e.g. a section's layer
   *  style edits — padding, colours, border, radius). */
  style?: CSSProperties
  children: ReactNode
}) {
  const { openAddElements } = useLayoutBuilder()
  const [hovered, setHovered] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(Number.POSITIVE_INFINITY)

  // Selectors expose a "+" that opens the add-elements palette, so inserting an
  // element is reachable from any selection. It sits at the end of the left
  // arrange toolbar — after the move up/down controls — and is suppressed when
  // the caller already provides its own contextual insert action.
  const effectiveLeftActions: SelectorAction[] = showAddElement
    ? [
        ...leftActions,
        {
          icon: <Plus />,
          label: `Add element near ${label}`,
          onClick: openAddElements,
        },
      ]
    : leftActions

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

  // Tools belong to the "hover over the selected layer" state. The scoped
  // "Describe your edit" prompt now lives in the draggable edits overlay that
  // opens beside the selection, so it's no longer docked here.
  const showChrome = selected && hovered

  // A toolbar is p-1 padding (8px) + N×16px buttons + gaps. When both toolbars
  // can't sit side by side without overlapping, merge them into one.
  const toolbarWidth = (count: number) =>
    count > 0 ? 8 + count * 16 + (count - 1) * 4 : 0
  const hasBothToolbars =
    effectiveLeftActions.length > 0 && rightActions.length > 0
  const mergeToolbars =
    hasBothToolbars &&
    width <
      toolbarWidth(effectiveLeftActions.length) +
        toolbarWidth(rightActions.length) +
        8

  const badgeClass = cn(
    "z-20 items-center whitespace-nowrap rounded-b-[4px] bg-[#6938ef] px-1 py-px",
    "font-[family-name:var(--font-inter)] text-[11px] font-semibold leading-4 text-white"
  )

  // Sections and fields use separate hover-group names so a section hover only
  // reveals the section's own badge — not every nested field badge inside it.
  const groupClass = scope === "section" ? "group/selsection" : "group/sel"
  const hoverBadgeClass =
    scope === "section"
      ? "hidden group-hover/selsection:flex group-has-[[data-sel]:hover]/selsection:hidden"
      : "hidden group-hover/sel:flex group-has-[[data-sel]:hover]/sel:hidden"

  return (
    <div
      ref={rootRef}
      data-sel
      data-layer={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Deepest element wins: stop the click from bubbling to ancestor
      // selectors so picking a child doesn't also select its container.
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
      onDragOver={onReorderDragOver}
      onDrop={onReorderDrop}
      style={style}
      className={cn(
        groupClass,
        "relative rounded-[4px] ring-1 transition-shadow",
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

      {/* AI working on this container (scoped prompt-box edit): the same beam +
          shimmer as the canvas, confined here so the change reads as local. The
          edge ring matches the selector's 4px radius; both overlays are inert. */}
      {working ? (
        <>
          <div
            aria-hidden
            className="canvas-working-highlight pointer-events-none absolute inset-0 z-[14]"
            style={{ borderRadius: 4 }}
          />
          <div
            aria-hidden
            className="canvas-working-shimmer pointer-events-none absolute inset-0 z-[15]"
            style={{ borderRadius: 4 }}
          />
          <div
            aria-hidden
            className="canvas-working-edge pointer-events-none absolute inset-0 z-[15]"
            style={{ borderRadius: 4, padding: 2 }}
          />
        </>
      ) : null}

      {showChrome && mergeToolbars ? (
        // Narrow element: a single combined bar (arrange + clipboard) so the
        // controls stay fully visible instead of overlapping.
        <div className={cn(TOOLBAR_BASE, "left-0 rounded-t-[4px]")}>
          {effectiveLeftActions.map((action) => (
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
          {showChrome && effectiveLeftActions.length > 0 ? (
            <div className={cn(TOOLBAR_BASE, "left-0 rounded-t-[4px]")}>
              {effectiveLeftActions.map((action) => (
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

      {/* Corner name badge — hangs just below the element's bottom-right
          outline so it sits on the ring, not inside the element (Figma
          3341:176351). Selected shows it always; otherwise it follows the
          deepest-only hover. */}
      <div
        className={cn(
          "absolute bottom-[-19px] right-[-1px]",
          badgeClass,
          selected ? "flex" : hoverBadgeClass
        )}
      >
        {label}
      </div>
    </div>
  )
}
