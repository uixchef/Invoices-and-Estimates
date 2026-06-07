"use client"

import {
  ChevronDown,
  Code2,
  Download,
  FileText,
  Globe,
  History,
  PanelLeft,
  Plus,
  Redo2,
  Ruler,
  Type,
  Undo2,
} from "lucide-react"

import { AutoAwesomeIcon } from "@/components/icons/auto-awesome-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { BUILDER_DOCUMENT_TYPES } from "@/lib/layout-builder-types"
import { useMediumsStore } from "@/lib/mediums-store"
import { cn } from "@/lib/utils"

type ToolbarIconButtonProps = React.ComponentProps<"button"> & {
  active?: boolean
  tone?: "default" | "accent"
}

function ToolbarIconButton({
  className,
  active = false,
  tone = "default",
  ...props
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-4",
        "disabled:pointer-events-none disabled:text-[#d0d5dd]",
        active && tone === "accent" && "bg-[#ebe9fe] text-[#6938ef]",
        active && tone === "default" && "bg-[#f2f4f7] text-[#101828]",
        !active && "text-[#475467] hover:bg-[#f2f4f7] hover:text-[#101828]",
        className
      )}
      {...props}
    />
  )
}

function ToolbarTag({
  icon,
  children,
  selected = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  icon: React.ReactNode
  selected?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-[4px] px-2 outline-none transition-colors",
        "font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
        "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-[18px]",
        selected
          ? "bg-[#f2f4f7] text-[#475467]"
          : "border border-[#d0d5dd] bg-white text-[#475467] hover:bg-[#f9fafb]",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

/**
 * Figma: Layout Builder toolbar (3181:33796 / 3147:21968)
 */
export function LayoutBuilderToolbar() {
  const { getMediumName } = useMediumsStore()
  const {
    mediumId,
    documentType,
    setDocumentType,
    viewMode,
    setViewMode,
    status,
  } = useLayoutBuilder()

  const mediumName = mediumId ? getMediumName(mediumId) : "Medium"

  // Editing/utility tools only operate on a generated layout, so they stay
  // disabled until the first generation completes (status === "ready").
  const canEdit = status === "ready"

  return (
    <div className="flex h-11 w-full shrink-0 items-center gap-4 border-b border-[#d0d5dd] bg-white px-4 py-1">
      <div className="flex w-[360px] shrink-0 items-center gap-2.5">
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton aria-label="Add block" disabled={!canEdit}>
            <Plus aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Invoice AI" active tone="accent">
            <AutoAwesomeIcon className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Insert text" disabled={!canEdit}>
            <Type aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Theme" disabled={!canEdit}>
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
        </div>

        <div className="min-w-px flex-1" />

        <div className="flex items-center gap-0.5">
          <ToolbarIconButton aria-label="Version history" disabled={!canEdit}>
            <History aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Toggle panel" active>
            <PanelLeft aria-hidden />
          </ToolbarIconButton>
        </div>
      </div>

      <div className="flex min-w-px flex-1 items-center gap-1">
        <ToolbarIconButton
          aria-label="Code view"
          active={viewMode === "code"}
          onClick={() => setViewMode("code")}
        >
          <Code2 aria-hidden />
        </ToolbarIconButton>
        <button
          type="button"
          aria-pressed={viewMode === "preview"}
          onClick={() => setViewMode("preview")}
          className={cn(
            "inline-flex h-7 shrink-0 items-center justify-center gap-2 rounded-[4px] px-2.5 py-1.5 outline-none transition-colors",
            "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5",
            "focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-4",
            viewMode === "preview"
              ? "bg-[#eff4ff] text-[#004eeb]"
              : "text-[#475467] hover:bg-[#f2f4f7]"
          )}
        >
          <Globe aria-hidden />
          Preview
        </button>
      </div>

      <div className="flex w-[360px] shrink-0 items-center justify-center gap-1">
        <ToolbarTag icon={<Ruler aria-hidden />} selected>
          {mediumName}
        </ToolbarTag>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolbarTag
              icon={<FileText aria-hidden />}
              aria-label="Document type"
            >
              {documentType}
              <ChevronDown className="size-4 opacity-50" aria-hidden />
            </ToolbarTag>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[200px] rounded">
            {BUILDER_DOCUMENT_TYPES.map((type) => (
              <DropdownMenuItem
                key={type}
                onSelect={() => setDocumentType(type)}
                className={cn(documentType === type && "bg-[#f4f3ff]")}
              >
                {type}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-w-px flex-1 items-center justify-end gap-1">
        <div className="flex items-center gap-1">
          <ToolbarIconButton aria-label="Undo" disabled={!canEdit}>
            <Undo2 aria-hidden />
          </ToolbarIconButton>
          <ToolbarIconButton aria-label="Redo" disabled={!canEdit}>
            <Redo2 aria-hidden />
          </ToolbarIconButton>
        </div>
        <div className="h-4 w-px bg-[#d0d5dd]" />
        <ToolbarIconButton aria-label="Download" disabled={!canEdit}>
          <Download aria-hidden />
        </ToolbarIconButton>
      </div>
    </div>
  )
}
