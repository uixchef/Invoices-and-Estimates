"use client"

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import {
  Maximize2,
  Minimize2,
  MoreVertical,
  RotateCcw,
  Send,
  X,
} from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AiQuestions } from "@/components/ai/ai-questions"
import { VisualEditsPanel } from "@/components/invoices/builder/visual-edits-panel"
import { EditsEmptyState } from "@/components/invoices/builder/edits-empty-state"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { isPageLayer } from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

/** "More options" menu glyphs (Untitled UI). Pre-coloured PNGs served from
 *  /public/icons/menu — the trash glyph already ships in the destructive red. */
const MENU_ICONS = "/icons/menu"
const MENU_ICON = {
  copy: `${MENU_ICONS}/copy.png`,
  duplicate: `${MENU_ICONS}/duplicate.png`,
  pasteReplace: `${MENU_ICONS}/repeat.png`,
  copyCode: `${MENU_ICONS}/code.png`,
  selectParent: `${MENU_ICONS}/layers.png`,
  moveUp: `${MENU_ICONS}/arrow-up.png`,
  moveDown: `${MENU_ICONS}/arrow-down.png`,
  delete: `${MENU_ICONS}/trash.png`,
} as const

/** Floating overlay width (anchored beside the selection). */
const PANEL_WIDTH = 320
/** Docked "full view" width — matches the left AI panel (Figma 3181:33796). */
const DOCK_WIDTH = 360
/** 16px gap between the docked panel and the viewport's right edge. */
const DOCK_GUTTER = 16
/** Dock / undock animation duration (ms) — keep in sync with the CSS below. */
const DOCK_TRANSITION_MS = 260
/** Gap between the selected element and the overlay's anchored edge. */
const ANCHOR_GAP = 16
/** Keep the overlay this far from any viewport edge. */
const VIEWPORT_MARGIN = 8

type Point = { left: number; top: number }

const TABS: { id: "content" | "style" | "advanced"; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "style", label: "Style" },
  { id: "advanced", label: "Advanced" },
]

/**
 * Edits panel (Figma 3344:47420 / 3347:47016 / 3347:49869 floating; 3181:33796
 * docked).
 *
 * Two presentations share one set of controls (Content / Style / Advanced + a
 * scoped "Describe your edit" prompt):
 *   • Floating (default): a draggable overlay portaled to the body, anchored
 *     beside the selected element on the canvas.
 *   • Docked ("full view"): a full-height right column rendered inline in the
 *     builder layout, so the canvas reflows beside it instead of being covered.
 *
 * It's mounted once in `LayoutBuilderBody` as the layout's third column: when
 * floating it portals out and leaves the column empty (canvas stays full width);
 * when docked it occupies the column and the canvas shrinks.
 */
export function EditsOverlay() {
  const {
    editMode,
    toggleEditMode,
    addingElement,
    inspectingLayer,
    inspectLayer,
    clearSelections,
    editsTab,
    setEditsTab,
    editsDocked,
    setEditsDocked,
    hasLayerChanges,
    resetLayer,
    sendScopedEdit,
    status,
    questions,
    submitAnswers,
    skipQuestions,
    aiEditingLayer,
    selectLayer,
    duplicateLayer,
    requestDeleteLayer,
    copyLayer,
    copyLayerProperties,
    pasteToReplace,
    pasteAfter,
    pasteLayerProperties,
    canPasteLayer,
    canPasteProperties,
    canMoveLayer,
    moveLayer,
    showCanvasToast,
  } = useLayoutBuilder()

  // "More options" menu open state. Computing the parent-layer lookup only while
  // open keeps the DOM query off the common render path.
  const [moreOpen, setMoreOpen] = useState(false)

  // Dock transition state machine so the docked column can animate both in and
  // out: `dockMounted` keeps the column in the layout through its exit, while
  // `dockExpanded` drives the width / slide that animates the canvas reflow.
  const [dockMounted, setDockMounted] = useState(editsDocked)
  const [dockExpanded, setDockExpanded] = useState(editsDocked)
  useEffect(() => {
    if (editsDocked) {
      setDockMounted(true)
      // Expand on the next frame so the 0 → full-width transition runs.
      const frame = requestAnimationFrame(() => setDockExpanded(true))
      return () => cancelAnimationFrame(frame)
    }
    // Collapse, then unmount once the width/slide transition has finished.
    setDockExpanded(false)
    const timer = window.setTimeout(
      () => setDockMounted(false),
      DOCK_TRANSITION_MS
    )
    return () => window.clearTimeout(timer)
  }, [editsDocked])

  // Clarifying questions raised by a scoped edit on this layer render inside the
  // panel (replacing the tabs) instead of the left AI panel, so the Q&A stays
  // attached to the element being edited.
  const scopedAsking =
    status === "asking" &&
    aiEditingLayer !== null &&
    aiEditingLayer === inspectingLayer

  // The questions card only has an overlay presentation, so it should never show
  // inside the docked "full view" column. When a scoped question arrives while
  // docked, collapse the expand view back to the floating overlay; once the user
  // answers or skips, restore the panel to whichever view it came from.
  const restoreDockRef = useRef(false)
  useEffect(() => {
    if (!inspectingLayer) {
      restoreDockRef.current = false
      return
    }
    if (scopedAsking) {
      if (editsDocked) {
        restoreDockRef.current = true
        setEditsDocked(false)
      }
    } else if (restoreDockRef.current) {
      restoreDockRef.current = false
      setEditsDocked(true)
    }
  }, [scopedAsking, editsDocked, inspectingLayer, setEditsDocked])

  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Point | null>(null)
  const [promptValue, setPromptValue] = useState("")
  const promptRef = useRef<HTMLTextAreaElement>(null)

  // Drag bookkeeping kept in a ref so the window listeners read live values
  // without re-subscribing on every move.
  const dragRef = useRef<{
    pointerX: number
    pointerY: number
    startLeft: number
    startTop: number
  } | null>(null)

  const clampToViewport = useCallback((next: Point): Point => {
    const node = panelRef.current
    const width = node?.offsetWidth ?? PANEL_WIDTH
    const height = node?.offsetHeight ?? 480
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
    return {
      left: Math.min(Math.max(VIEWPORT_MARGIN, next.left), maxLeft),
      top: Math.min(Math.max(VIEWPORT_MARGIN, next.top), maxTop),
    }
  }, [])

  // Docking is a per-selection choice — clear it once nothing is selected so the
  // next selection opens floating again.
  useEffect(() => {
    if (!inspectingLayer) {
      setEditsDocked(false)
    }
  }, [inspectingLayer, setEditsDocked])

  // Anchor beside the freshly selected element (floating only), or park the
  // empty-state overlay top-right when edit mode is on but nothing is picked yet.
  useLayoutEffect(() => {
    if (editsDocked) {
      setPos(null)
      return
    }
    if (!editMode) {
      setPos(null)
      return
    }
    if (!inspectingLayer) {
      // Empty state only — it yields to the Add elements palette.
      if (addingElement) {
        setPos(null)
        return
      }
      setPos(
        clampToViewport({
          left: window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
          top: 96,
        })
      )
      return
    }
    setPromptValue("")
    let frame = 0
    const place = () => {
      const target = document.querySelector(
        `[data-layer="${CSS.escape(inspectingLayer)}"]`
      )
      const panelHeight = panelRef.current?.offsetHeight ?? 480
      if (!target) {
        // No element found — drop it top-right of the viewport as a fallback.
        setPos(
          clampToViewport({
            left: window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
            top: 96,
          })
        )
        return
      }
      const rect = target.getBoundingClientRect()
      // Prefer the right of the element; fall back to the left when there's no
      // room, then clamp into the viewport either way.
      const rightLeft = rect.right + ANCHOR_GAP
      const fitsRight = rightLeft + PANEL_WIDTH + VIEWPORT_MARGIN <= window.innerWidth
      const left = fitsRight ? rightLeft : rect.left - ANCHOR_GAP - PANEL_WIDTH
      // Vertically align the overlay's top with the element, nudged up slightly
      // so the header sits near the selection's top edge.
      const top = rect.top - 8
      setPos(clampToViewport({ left, top }))
      // Re-clamp once the real height is known (panel mounts same frame).
      frame = requestAnimationFrame(() => {
        setPos((prev) =>
          prev
            ? clampToViewport({
                left: prev.left,
                top: Math.min(prev.top, window.innerHeight - panelHeight - VIEWPORT_MARGIN),
              })
            : prev
        )
      })
    }
    frame = requestAnimationFrame(place)
    return () => cancelAnimationFrame(frame)
    // Re-anchor only when the selected layer changes or docking toggles off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectingLayer, editsDocked, editMode, addingElement])

  // Keep the floating overlay inside the viewport on resize.
  useEffect(() => {
    if (editsDocked || !editMode) {
      return
    }
    // Empty state yields to the Add elements palette; the inspector persists.
    if (!inspectingLayer && addingElement) {
      return
    }
    const onResize = () => setPos((prev) => (prev ? clampToViewport(prev) : prev))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [inspectingLayer, editsDocked, editMode, addingElement, clampToViewport])

  // Closest ancestor layer of the inspected element (for "Select parent").
  // Resolved from the DOM only while the menu is open; null disables the action.
  const parentLabel = useMemo(() => {
    if (!moreOpen || !inspectingLayer || typeof document === "undefined") {
      return null
    }
    const node = document.querySelector(
      `[data-layer="${CSS.escape(inspectingLayer)}"]`
    )
    const parent = node?.parentElement?.closest("[data-layer]")
    const label = parent?.getAttribute("data-layer")
    return label && label !== inspectingLayer ? label : null
  }, [moreOpen, inspectingLayer])

  const onHeaderPointerDown = (event: React.PointerEvent) => {
    // Docked as a column — pinned, so dragging is disabled.
    if (editsDocked) {
      return
    }
    // Ignore drags that start on interactive controls so buttons, option tiles,
    // inputs, and selects keep working (used by both the header drag bar and the
    // questions card, which is draggable from any non-interactive area).
    if (
      (event.target as HTMLElement).closest(
        "button, input, textarea, select, a, [contenteditable='true']"
      )
    ) {
      return
    }
    if (!pos) {
      return
    }
    event.preventDefault()
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startLeft: pos.left,
      startTop: pos.top,
    }
    const onMove = (move: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) {
        return
      }
      setPos(
        clampToViewport({
          left: drag.startLeft + (move.clientX - drag.pointerX),
          top: drag.startTop + (move.clientY - drag.pointerY),
        })
      )
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const exitEdits = () => {
    toggleEditMode()
  }

  const close = () => {
    inspectLayer(null)
    clearSelections()
  }

  // The inspector overlay is an independent surface: once a layer is selected it
  // stays open while the user toggles the left panel between Add elements and
  // Invoice AI. Only the "select an element" empty state hides while the
  // Add elements palette is open (it would otherwise compete with the palette).
  const showOverlay = editMode && (Boolean(inspectingLayer) || !addingElement)

  if (!showOverlay) {
    return null
  }

  if (!inspectingLayer) {
    if (!pos || typeof document === "undefined") {
      return null
    }

    return createPortal(
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Edits"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: PANEL_WIDTH,
          maxHeight: "min(420px, calc(100vh - 32px))",
        }}
        className={cn(
          "z-[70] flex flex-col overflow-hidden rounded-[12px] border border-[#eaecf0] bg-white",
          "font-[family-name:var(--font-inter)]",
          "shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]",
          "animate-in fade-in-0 zoom-in-95 duration-200 ease-out motion-reduce:animate-none"
        )}
      >
        <div className="flex flex-col gap-2 px-4 pt-3 pb-3">
          <div
            onPointerDown={onHeaderPointerDown}
            className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
          >
            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-[#101828]">
              Edits
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Close edits"
                  onClick={exitEdits}
                  className="inline-flex size-[18px] items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                >
                  <X className="size-[18px]" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-[90]">
                Close edits
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f9fafb] px-4 py-12">
          <EditsEmptyState />
        </div>
      </div>,
      document.body
    )
  }

  const resizePrompt = () => {
    const node = promptRef.current
    if (!node) {
      return
    }
    node.style.height = "auto"
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`
  }

  const filled = promptValue.trim().length > 0
  const submitPrompt = () => {
    if (!filled || !inspectingLayer) {
      return
    }
    sendScopedEdit(inspectingLayer, promptValue.trim())
    setPromptValue("")
    requestAnimationFrame(resizePrompt)
  }

  // Scoped clarifying questions — swap the whole property panel for just the
  // questions card (Cursor-style). Answering restores the property panel.
  const questionsCard = (
    <AiQuestions
      key={questions.map((question) => question.id).join("|")}
      questions={questions}
      onComplete={submitAnswers}
      onSkip={skipQuestions}
      className="shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
    />
  )

  // Element context menu (Figma 3350:64356 all-enabled / 3350:65267 some
  // disabled). Paste actions stay disabled until something is copied; Move
  // up/down disable for layers that aren't part of a reorderable group.
  type MoreMenuItem = {
    id: string
    label: string
    /** Path to a pre-coloured menu glyph in /public/icons/menu. */
    icon?: string
    onSelect: () => void
    disabled?: boolean
    destructive?: boolean
  }

  const copyCode = () => {
    const node = document.querySelector(
      `[data-layer="${CSS.escape(inspectingLayer)}"]`
    )
    const code = node instanceof HTMLElement ? node.outerHTML : inspectingLayer
    void navigator.clipboard?.writeText(code)
    showCanvasToast("Code copied")
  }

  const isPage = isPageLayer(inspectingLayer)
  const visibleTabs = isPage ? TABS.filter((tab) => tab.id === "style") : TABS

  const moreMenuGroups: MoreMenuItem[][] = isPage
    ? [
        [
          {
            id: "copy-code",
            label: "Copy code",
            icon: MENU_ICON.copyCode,
            onSelect: copyCode,
          },
          {
            id: "copy-props",
            label: "Copy properties",
            onSelect: () => {
              copyLayerProperties(inspectingLayer!)
              showCanvasToast("Properties copied")
            },
          },
          {
            id: "paste-props",
            label: "Paste properties",
            onSelect: () => pasteLayerProperties(inspectingLayer!),
            disabled: !canPasteProperties,
          },
        ],
      ]
    : [
    [
      {
        id: "copy",
        label: "Copy",
        icon: MENU_ICON.copy,
        onSelect: () => {
          copyLayer(inspectingLayer)
          showCanvasToast("Copied")
        },
      },
      {
        id: "duplicate",
        label: "Duplicate",
        icon: MENU_ICON.duplicate,
        onSelect: () => duplicateLayer(inspectingLayer),
      },
      {
        id: "paste-replace",
        label: "Paste to replace",
        icon: MENU_ICON.pasteReplace,
        onSelect: () => pasteToReplace(inspectingLayer),
        disabled: !canPasteLayer,
      },
      {
        id: "paste-after",
        label: "Paste after",
        onSelect: () => pasteAfter(inspectingLayer),
        disabled: !canPasteLayer,
      },
      {
        id: "copy-code",
        label: "Copy code",
        icon: MENU_ICON.copyCode,
        onSelect: copyCode,
      },
      {
        id: "copy-props",
        label: "Copy properties",
        onSelect: () => {
          copyLayerProperties(inspectingLayer)
          showCanvasToast("Properties copied")
        },
      },
      {
        id: "paste-props",
        label: "Paste properties",
        onSelect: () => pasteLayerProperties(inspectingLayer),
        disabled: !canPasteProperties,
      },
    ],
    [
      {
        id: "select-parent",
        label: "Select parent",
        icon: MENU_ICON.selectParent,
        onSelect: () => {
          if (parentLabel) {
            selectLayer(parentLabel)
          }
        },
        disabled: !parentLabel,
      },
      {
        id: "move-up",
        label: "Move up",
        icon: MENU_ICON.moveUp,
        onSelect: () => moveLayer(inspectingLayer, "up"),
        disabled: !canMoveLayer(inspectingLayer, "up"),
      },
      {
        id: "move-down",
        label: "Move down",
        icon: MENU_ICON.moveDown,
        onSelect: () => moveLayer(inspectingLayer, "down"),
        disabled: !canMoveLayer(inspectingLayer, "down"),
      },
    ],
    [
      {
        id: "delete",
        label: "Delete",
        icon: MENU_ICON.delete,
        onSelect: () => requestDeleteLayer(inspectingLayer),
        destructive: true,
      },
    ],
  ]

  const header = (
    <div
      className={cn(
        "flex flex-col px-4",
        // Docked "full view" gets a roomier header (16px top padding, 12px gap)
        // to match the left AI panel; the compact floating overlay keeps its
        // tighter 12px / 8px rhythm with a 12px bottom padding before the body.
        editsDocked ? "gap-3 pt-4 pb-4" : "gap-2 pt-3 pb-3"
      )}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        className={cn(
          "flex items-center gap-2",
          editsDocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
      >
        <p
          className={cn(
            "min-w-0 flex-1 truncate font-semibold text-[#101828]",
            editsDocked ? "text-base leading-6" : "text-sm leading-5"
          )}
        >
          {inspectingLayer}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {hasLayerChanges(inspectingLayer) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Reset changes to ${inspectingLayer}`}
                  onClick={() => resetLayer(inspectingLayer)}
                  className="inline-flex size-[18px] items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                >
                  <RotateCcw className="size-[18px]" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-[90]">
                Reset changes
              </TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={editsDocked ? "Float panel" : "Dock to right"}
                aria-pressed={editsDocked}
                onClick={() => setEditsDocked(!editsDocked)}
                className="inline-flex size-[18px] items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              >
                {editsDocked ? (
                  <Minimize2 className="size-[18px]" aria-hidden />
                ) : (
                  <Maximize2 className="size-[18px]" aria-hidden />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-[90]">
              {editsDocked ? "Float panel" : "Dock to right"}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="inline-flex size-[18px] items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 data-[state=open]:text-[#101828]"
              >
                <MoreVertical className="size-[18px]" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[90] w-[208px] font-[family-name:var(--font-inter)]"
            >
              {moreMenuGroups.map((group, groupIndex) => (
                <Fragment key={group[0]?.id ?? groupIndex}>
                  {groupIndex > 0 ? (
                    <DropdownMenuSeparator className="bg-[#eaecf0]" />
                  ) : null}
                  {group.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      disabled={item.disabled}
                      onSelect={() => item.onSelect()}
                      className={cn(
                        "flex items-center gap-2 rounded-[4px] px-2 py-1 text-[14px] leading-5 text-[#344054]",
                        "focus:bg-[#f9fafb] focus:text-[#101828]",
                        item.destructive &&
                          "text-[#d92d20] focus:bg-[#fef3f2] focus:text-[#d92d20]",
                        item.disabled &&
                          "data-[disabled]:bg-[#f9fafb] data-[disabled]:text-[#98a2b3] data-[disabled]:opacity-100"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {item.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.icon}
                          alt=""
                          aria-hidden
                          className={cn(
                            "size-3.5 shrink-0 object-contain",
                            // Glyphs ship pre-coloured; dim them when the action
                            // is unavailable to match the greyed label.
                            item.disabled && "opacity-40"
                          )}
                        />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Close edits"
                onClick={close}
                className="inline-flex size-[18px] items-center justify-center rounded text-[#667085] outline-none transition-colors hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              >
                <X className="size-[18px]" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-[90]">
              Close
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tabs (Figma 3246:46487). Page layer only exposes Style. */}
      {visibleTabs.length > 1 ? (
      <div
        role="tablist"
        aria-label="Edit mode"
        className="flex items-center gap-1 rounded-[4px] bg-[#f2f4f7] p-1"
      >
        {visibleTabs.map((tab) => {
          const active = editsTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setEditsTab(tab.id)}
              className={cn(
                "inline-flex h-6 flex-1 items-center justify-center rounded-[4px] px-2 text-[14px] leading-5 outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                active
                  ? "bg-white font-semibold text-[#004eeb] shadow-[0px_1px_3px_0px_rgba(16,24,40,0.1),0px_1px_2px_0px_rgba(16,24,40,0.06)]"
                  : "font-medium text-[#475467] hover:text-[#101828]"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      ) : null}
    </div>
  )

  const footer = (
    <div className={cn("px-4", editsDocked ? "pt-4 pb-4" : "pt-3 pb-3")}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-[#bdb4fe] bg-white p-2 transition-shadow",
          "focus-within:border-[#9b8afb] focus-within:shadow-[0px_2px_4px_rgba(16,24,40,0.06),0px_1px_2px_rgba(16,24,40,0.04)]"
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submitPrompt()
            }
          }}
          placeholder="Describe your edit"
          aria-label={`Describe your edit for ${inspectingLayer}`}
          className={cn(
            "max-h-[160px] min-w-0 flex-1 resize-none border-0 bg-transparent p-0 outline-none",
            "text-base font-normal leading-5 text-[#101828] placeholder:text-[#98a2b3] caret-[#6938ef]"
          )}
        />
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
    </div>
  )

  // The full property panel (header + tabs + controls + prompt). The docked
  // "full view" always renders this — the questions card is overlay-only.
  const propertyPanel: ReactNode = (
    <>
      {header}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4",
          // Docked header carries the top spacing; floating keeps pt-4 on the body.
          editsDocked ? "bg-white" : "bg-[#f9fafb] pt-4"
        )}
      >
        <VisualEditsPanel />
      </div>
      {footer}
    </>
  )

  // Floating overlay contents: the scoped questions card when the AI is asking,
  // otherwise the same property panel.
  const panelContents: ReactNode = scopedAsking ? (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">{questionsCard}</div>
  ) : (
    propertyPanel
  )

  // Docked: a full-height right column that lives in the builder layout, so the
  // canvas reflows beside it (Figma 3181:33796). Mirrors the left AI panel's
  // card treatment exactly (rounded-[12px], no border, soft shadow, 360px).
  //
  // The wrapper animates its width (driving the canvas reflow) while the panel
  // slides + fades, giving a smooth transition into and out of full view.
  if (dockMounted) {
    return (
      <div
        aria-hidden={!dockExpanded}
        style={{ width: dockExpanded ? DOCK_WIDTH + DOCK_GUTTER : 0 }}
        className="relative flex shrink-0 overflow-hidden py-4 transition-[width] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Edit ${inspectingLayer}`}
          style={{ width: DOCK_WIDTH }}
          className={cn(
            "mr-4 flex h-full shrink-0 flex-col overflow-hidden rounded-[12px] bg-white",
            "font-[family-name:var(--font-inter)]",
            "shadow-[0_12px_8px_rgba(16,24,40,0.08),0_4px_3px_rgba(16,24,40,0.03)]",
            // Apple-style scale/maximize: grows from the right edge with a snappy
            // settle (iOS sheet curve) rather than a slow linear slide.
            "origin-right transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            dockExpanded ? "scale-100 opacity-100" : "scale-95 opacity-0"
          )}
        >
          {propertyPanel}
        </div>
      </div>
    )
  }

  if (!pos || typeof document === "undefined") {
    return null
  }

  // Floating: a draggable overlay portaled to the body so the canvas's scaled,
  // overflow-hidden ancestors can't clip it.
  if (scopedAsking) {
    return createPortal(
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Questions about ${inspectingLayer}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={onHeaderPointerDown}
        style={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: PANEL_WIDTH,
        }}
        className="z-[70] cursor-grab rounded-lg active:cursor-grabbing"
      >
        {questionsCard}
      </div>,
      document.body
    )
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Edit ${inspectingLayer}`}
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: PANEL_WIDTH,
        maxHeight: "min(620px, calc(100vh - 32px))",
      }}
      className={cn(
        "z-[70] flex flex-col overflow-hidden rounded-[12px] border border-[#eaecf0] bg-white",
        "font-[family-name:var(--font-inter)]",
        "shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]",
        "animate-in fade-in-0 zoom-in-95 duration-200 ease-out motion-reduce:animate-none"
      )}
    >
      {panelContents}
    </div>,
    document.body
  )
}
