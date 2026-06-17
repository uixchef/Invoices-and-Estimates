"use client"

import { useMemo, useState } from "react"
import { Copy, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LayoutRow } from "@/lib/layouts-data"
import { useMediumsStore } from "@/lib/mediums-store"
import { LayoutThumbnail } from "@/components/invoices/builder/layout-document"
import { layoutFromRow } from "@/lib/layout-builder-context"
import { getDocumentPageProfile } from "@/lib/mediums-data"
import { useLayoutClone } from "@/lib/layout-clone-context"
import { useLayoutDelete } from "@/lib/layout-delete-context"
import { useLayoutPreview } from "@/lib/layout-preview-context"
import { useCreateWithAi } from "@/lib/create-with-ai-context"
import { layoutEditSeedFromRow } from "@/lib/layout-edit-seed"
import { usePreviewReveal } from "@/lib/use-preview-reveal"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: LayoutRow["status"] }) {
  if (status === "Published") {
    return (
      <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[#ecfdf3] px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#027a48]">
        Published
      </span>
    )
  }

  return (
    <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[#f2f4f7] px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]">
      Draft
    </span>
  )
}

const TYPE_BADGE_STYLES: Record<LayoutRow["type"], string> = {
  Invoice: "bg-[#eff4ff] text-[#004eeb]",
  Estimate: "bg-[#fffaeb] text-[#b54708]",
  Receipt: "bg-[#fef3f2] text-[#b42318]",
}

function TypeBadge({ label }: { label: LayoutRow["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-2 font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
        TYPE_BADGE_STYLES[label]
      )}
    >
      {label}
    </span>
  )
}

/** Figma: Layout Cards · thumbnail=False (3082:29975) — exact vector asset */
const THUMBNAIL_SKELETON_SRC = "/layouts/thumbnail-skeleton.svg"

/** Loading placeholder — pulsing gradient + shimmer over the document skeleton. */
function ThumbnailSkeleton() {
  return (
    <div
      className="layout-thumbnail-skeleton-gradient absolute inset-0 overflow-hidden bg-[#f2f4f7]"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={THUMBNAIL_SKELETON_SRC}
        alt=""
        className="absolute inset-0 block size-full max-w-none opacity-90"
      />
      <div className="layout-thumbnail-skeleton-shimmer absolute inset-0" />
    </div>
  )
}

function LayoutCardActions({ item }: { item: LayoutRow }) {
  const { open } = useLayoutPreview()
  const { cloneLayout } = useLayoutClone()
  const { requestDelete } = useLayoutDelete()
  const { requestLayoutEdit } = useCreateWithAi()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={cn(
        // Figma 3082:30369 — Layout Cards · thumbnail=False · Hover
        "absolute inset-0 z-[1] flex h-full items-end justify-center gap-1.5 bg-gradient-to-b from-white/0 to-[rgba(178,204,255,0.7)] p-3",
        "pointer-events-none opacity-0 transition-opacity",
        "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        "group-hover:pointer-events-auto group-hover:opacity-100",
        menuOpen && "pointer-events-auto opacity-100"
      )}
    >
      <button
        type="button"
        aria-label={`Edit ${item.name}`}
        onClick={() => requestLayoutEdit(layoutEditSeedFromRow(item))}
        className={cn(
          "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded border border-[#84adff] bg-white px-2.5 py-1.5",
          "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#004eeb]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",
          "hover:bg-[#f5f8ff] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        )}
      >
        <Pencil className="size-4 shrink-0" aria-hidden />
        Edit
      </button>

      <button
        type="button"
        aria-label={`Preview ${item.name}`}
        onClick={() => open(item)}
        className={cn(
          "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded border border-[#d0d5dd] bg-white px-2.5 py-1.5",
          "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#475467]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",
          "hover:border-[#d0d5dd] hover:bg-[#f9fafb] hover:text-[#1d2939]",
          "focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        )}
      >
        <Eye className="size-4 shrink-0" aria-hidden />
        Preview
      </button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`More actions for ${item.name}`}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded border border-[#f9fafb] bg-[#f9fafb] p-2",
              "text-[#475467] outline-none shadow-none",
              "hover:border-[#eaecf0] hover:bg-[#f2f4f7]",
              "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
              "data-[state=open]:border-[#eaecf0] data-[state=open]:bg-[#f2f4f7]"
            )}
          >
            <MoreVertical className="size-4 shrink-0" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => cloneLayout(item)}>
            <Copy className="size-4 text-[#667085]" aria-hidden />
            Clone
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-[#b42318] focus:text-[#b42318]"
            onSelect={() => requestDelete(item)}
          >
            <Trash2 className="size-4 text-[#b42318]" aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function LayoutCard({ item }: { item: LayoutRow }) {
  const { getMediumName } = useMediumsStore()
  const ready = usePreviewReveal(item.id)
  // The exact layout the builder reconstructs for this row — the card depicts
  // what the user will land on when they edit it.
  const layout = useMemo(() => layoutFromRow(item), [item])
  const pageProfile = useMemo(
    () => getDocumentPageProfile(item.mediumId),
    [item.mediumId]
  )

  return (
    <article
      className={cn(
        "group flex w-full flex-col gap-3 overflow-hidden rounded-lg border p-4 transition-colors",
        "border-[#d0d5dd] bg-white",
        "hover:border-[#84adff] hover:bg-[#f5f8ff]",
        "focus-within:border-[#84adff] focus-within:bg-[#f5f8ff]"
      )}
    >
      <div
        aria-busy={!ready}
        className={cn(
          "relative h-[292px] w-full shrink-0 overflow-hidden rounded border transition-colors",
          ready
            ? "bg-gradient-to-b border-[#f2f4f7] from-[#f2f4f7] to-[#eaecf0] group-hover:border-[#eff4ff] group-hover:from-[#eff4ff] group-hover:to-[#84adff] group-focus-within:border-[#eff4ff] group-focus-within:from-[#eff4ff] group-focus-within:to-[#84adff]"
            : "border-[#f2f4f7] bg-white"
        )}
      >
        {!ready ? <ThumbnailSkeleton /> : null}

        {ready ? (
          <LayoutThumbnail
            layout={layout}
            pageProfile={pageProfile}
            className="absolute inset-0 size-full animate-in fade-in-0 duration-300"
          />
        ) : null}

        <div
          className="absolute right-2 top-2 z-[2] flex items-center gap-1.5"
          aria-label={`${item.status}, ${item.type}`}
        >
          <StatusBadge status={item.status} />
          <TypeBadge label={item.type} />
        </div>

        <LayoutCardActions item={item} />
      </div>

      <div className="flex w-full flex-col gap-1">
        <div className="flex min-w-0 items-center justify-start whitespace-nowrap">
          <p className="shrink-0 font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#101828]">
            {item.name}
          </p>
          <span
            className="mx-1.5 shrink-0 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#475467]"
            aria-hidden
          >
            •
          </span>
          <p className="min-w-0 truncate font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
            {getMediumName(item.mediumId)}
          </p>
        </div>
        <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
          {item.updatedOn}, {item.updatedAgo}
        </p>
      </div>
    </article>
  )
}
