"use client"

import {
  Code2,
  Download,
  Globe,
  History,
  PanelLeft,
  Plus,
  Redo2,
  Ruler,
  Save,
  Undo2,
} from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import { Settings04Icon } from "@/components/icons/settings-04-icon"
import { DocumentSourcePicker } from "@/components/invoices/builder/document-source-picker"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { PAGE_LAYER_LABEL } from "@/lib/layout-builder-types"
import { useMediumsStore } from "@/lib/mediums-store"
import { cn } from "@/lib/utils"

/**
 * Wraps a control in a hover/focus tooltip when a label is supplied. Disabled
 * triggers don't emit pointer events, so the button is wrapped in a span to keep
 * the tooltip working even while the action is unavailable.
 *
 * When `description` is set the tooltip stacks the label over a muted subtitle —
 * used for the "Coming soon" treatment on not-yet-built tools (Figma 3137:155701).
 */
function WithTooltip({
  label,
  description,
  disabled,
  children,
}: {
  label?: string
  description?: string
  disabled?: boolean
  children: React.ReactElement
}) {
  if (!label) {
    return children
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span className="inline-flex cursor-not-allowed">{children}</span>
        ) : (
          children
        )}
      </TooltipTrigger>
      <TooltipContent>
        {description ? (
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold text-[#101828]">{label}</span>
            <span className="text-[#475467]">{description}</span>
          </span>
        ) : (
          label
        )}
      </TooltipContent>
    </Tooltip>
  )
}

type ToolbarIconButtonProps = React.ComponentProps<"button"> & {
  active?: boolean
  tone?: "default" | "accent"
  tooltip?: string
  /** Marks a placeholder tool: shows a "Coming soon" subtitle in the tooltip. */
  comingSoon?: boolean
}

function ToolbarIconButton({
  className,
  active = false,
  tone = "default",
  tooltip,
  comingSoon = false,
  ...props
}: ToolbarIconButtonProps) {
  return (
    <WithTooltip
      label={tooltip ?? props["aria-label"]}
      description={comingSoon ? "Coming soon" : undefined}
      disabled={props.disabled}
    >
      <button
        type="button"
        aria-pressed={active}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-4",
          "disabled:pointer-events-none disabled:text-[#d0d5dd]",
          active && tone === "accent" && "bg-[#ebe9fe] text-[#6938ef]",
          active && tone === "default" && "bg-[#f2f4f7] text-[#101828]",
          !active &&
            !comingSoon &&
            "text-[#475467] hover:bg-[#f2f4f7] hover:text-[#101828]",
          // Not-yet-built tools stay hoverable (for the tooltip) but signal that
          // they can't be actioned yet — no hover fill, just the resting color.
          comingSoon && "cursor-not-allowed text-[#475467]",
          className
        )}
        {...props}
      />
    </WithTooltip>
  )
}

/**
 * Code / Preview view toggle. Collapses to an icon-only button when inactive
 * and expands to an icon + label in the accent treatment when active. The two
 * toggles are independent, so both can read as active at once (split view).
 */
function ViewToggleButton({
  icon,
  label,
  active,
  ...props
}: React.ComponentProps<"button"> & {
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <WithTooltip label={label} disabled={props.disabled}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        className={cn(
          "inline-flex h-7 shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors",
          "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5",
          "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-4",
          "disabled:pointer-events-none disabled:text-[#d0d5dd]",
          active
            ? "gap-2 bg-[#eff4ff] px-2.5 py-1.5 text-[#004eeb]"
            : "size-7 text-[#475467] hover:bg-[#f2f4f7] hover:text-[#101828]"
        )}
        {...props}
      >
        {icon}
        {active ? label : null}
      </button>
    </WithTooltip>
  )
}

function ToolbarTag({
  icon,
  children,
  selected = false,
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  icon: React.ReactNode
  selected?: boolean
  tooltip?: string
}) {
  return (
    <WithTooltip label={tooltip} disabled={props.disabled}>
      <button
        type="button"
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-[4px] px-2 outline-none transition-colors",
          "font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
          "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-[18px]",
          selected
            ? "bg-[#f2f4f7] text-[#475467]"
            : "border border-[#d0d5dd] bg-white text-[#475467] hover:bg-[#f9fafb]",
          "disabled:pointer-events-none disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    </WithTooltip>
  )
}

/**
 * Figma: Layout Builder toolbar (3181:33796 / 3147:21968)
 */
export function LayoutBuilderToolbar() {
  const { getMediumName } = useMediumsStore()
  const {
    mediumId,
    codeOpen,
    previewOpen,
    toggleCode,
    togglePreview,
    panelOpen,
    setPanelOpen,
    panelWidth,
    status,
    addingElement,
    openAddElements,
    closeAddElements,
    canUndo,
    canRedo,
    undo,
    redo,
    isBlankSession,
    openPageProperties,
    inspectingLayer,
    isCodeDetached,
  } = useLayoutBuilder()

  // The Invoice AI button represents the AI conversation view in the left panel.
  // That panel keeps showing the conversation even while a layer is inspected
  // (the inspector is now its own overlay/column, not the left rail), so
  // inspecting no longer deselects this button. It's only inactive when the
  // panel is closed, the Add elements palette is open, or edit mode is showing
  // its "select an element" empty state instead of the chat.
  const aiPanelActive = panelOpen && !addingElement

  const mediumName = mediumId ? getMediumName(mediumId) : "Paper type"

  // Editing/utility tools only operate on a generated layout, so they stay
  // disabled until the first generation completes (status === "ready").
  const canEdit = status === "ready"

  // Manually inserting elements is the whole point of the blank flow, so the
  // Add elements tool is available from the empty state (status === "idle")
  // even before anything has been generated.
  const canAddElements = canEdit || isBlankSession
  const pagePropertiesActive = inspectingLayer === PAGE_LAYER_LABEL

  return (
    <div className="relative flex h-11 w-full shrink-0 items-center gap-4 border-b border-[#d0d5dd] bg-white px-4 py-1">
      {/* Width tracks the Invoice AI panel so this cluster's right edge stays
          aligned with the panel's right edge as it's resized. */}
      <div
        className="flex shrink-0 items-center gap-0.5"
        style={panelOpen ? { width: panelWidth } : undefined}
      >
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton
            aria-label="Add elements"
            active={addingElement}
            disabled={!canAddElements}
            onClick={addingElement ? closeAddElements : openAddElements}
          >
            <Plus aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton
            aria-label="Invoice AI"
            tone="accent"
            active={aiPanelActive}
            onClick={() => {
              if (aiPanelActive) {
                setPanelOpen(false)
                return
              }
              // Bring the AI conversation forward in the left panel. The
              // inspector overlay is independent and stays open until the user
              // closes it, so we no longer clear the inspected layer here.
              setPanelOpen(true)
              closeAddElements()
            }}
          >
            <AutoAwesomeIcon className="size-4 text-[#6938ef]" />
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Brand boards" comingSoon>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
              <path
                d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="7.5" cy="11" r="1" fill="currentColor" />
              <circle cx="10" cy="7.5" r="1" fill="currentColor" />
              <circle cx="14.5" cy="7.5" r="1" fill="currentColor" />
            </svg>
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Saved items" comingSoon>
            <Save aria-hidden />
          </ToolbarIconButton>
        </div>

        <div className="min-w-px flex-1" />

        <div className="flex items-center gap-0.5">
          <ToolbarIconButton aria-label="Version history" disabled={!canEdit}>
            <History aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton
            aria-label="Toggle panel"
            active={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <PanelLeft aria-hidden />
          </ToolbarIconButton>
        </div>
      </div>

      <div className="flex min-w-px flex-1 items-center gap-1">
        <ViewToggleButton
          icon={<Code2 aria-hidden />}
          label="Code"
          active={codeOpen}
          onClick={toggleCode}
          disabled={!canEdit}
        />
        <ViewToggleButton
          icon={<Globe aria-hidden />}
          label="Preview"
          active={previewOpen}
          onClick={togglePreview}
        />
      </div>

      {/* Absolutely centred on the toolbar so it lines up with the page-centred
          "New layout" title above, independent of the asymmetric side zones. */}
      <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1">
        <ToolbarTag
          icon={<Ruler aria-hidden />}
          selected
          disabled
          tooltip="Paper size is defined at the time of layout creation and cannot be changed"
          className="cursor-not-allowed"
        >
          {mediumName}
        </ToolbarTag>

        <DocumentSourcePicker />
      </div>

      <div className="flex min-w-px flex-1 items-center justify-end gap-1">
        <div className="flex items-center gap-1">
          <ToolbarIconButton
            aria-label="Undo"
            disabled={!canEdit || !canUndo}
            onClick={undo}
          >
            <Undo2 aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton
            aria-label="Redo"
            disabled={!canEdit || !canRedo}
            onClick={redo}
          >
            <Redo2 aria-hidden />
          </ToolbarIconButton>
        </div>
        <div className="h-4 w-px bg-[#d0d5dd]" />
        <ToolbarIconButton aria-label="Download" disabled={!canEdit}>
          <Download aria-hidden />
        </ToolbarIconButton>
        <div className="h-4 w-px bg-[#d0d5dd]" />
        <ToolbarIconButton
          aria-label="Properties"
          tooltip="Properties"
          active={pagePropertiesActive}
          disabled={!canEdit || isCodeDetached}
          onClick={openPageProperties}
        >
          <Settings04Icon className="size-4" />
        </ToolbarIconButton>
      </div>
    </div>
  )
}
