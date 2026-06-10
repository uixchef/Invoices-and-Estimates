"use client"

import { useEffect, useRef, useState } from "react"
import { Copy, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/highrise/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LayoutRow } from "@/lib/layouts-data"
import { useMediumsStore } from "@/lib/mediums-store"
import { getLayoutThumbnail } from "@/lib/layout-thumbnails"
import { useLayoutClone } from "@/lib/layout-clone-context"
import { useLayoutDelete } from "@/lib/layout-delete-context"
import { useLayoutPreview } from "@/lib/layout-preview-context"
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

/**
 * `animated` drives the loading treatment (pulsing gradient + shimmer). Blank
 * layouts pass `animated={false}` for a static, empty thumbnail — animation is
 * reserved for actual image loading.
 */
function ThumbnailSkeleton({ animated = true }: { animated?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden",
        // Loading: pulsing gray fill. Empty/blank: the #EAECF0 illustration
        // sits on the card's white surface (Figma 3082:30385).
        animated ? "layout-thumbnail-skeleton-gradient bg-[#f2f4f7]" : "bg-transparent"
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={THUMBNAIL_SKELETON_SRC}
        alt=""
        className="absolute inset-0 block size-full max-w-none opacity-90"
      />
      {animated ? (
        <div className="layout-thumbnail-skeleton-shimmer absolute inset-0" />
      ) : null}
    </div>
  )
}

function LayoutCardActions({ item }: { item: LayoutRow }) {
  const { open } = useLayoutPreview()
  const { cloneLayout } = useLayoutClone()
  const { requestDelete } = useLayoutDelete()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex items-end justify-center gap-2 bg-gradient-to-b from-transparent to-[rgba(178,204,255,0.7)] p-3",
        "pointer-events-none opacity-0 transition-opacity",
        "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        "group-hover:pointer-events-auto group-hover:opacity-100",
        menuOpen && "pointer-events-auto opacity-100"
      )}
    >
      <button
        type="button"
        aria-label={`Edit ${item.name}`}
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

      <Button
        type="button"
        variant="neutral"
        aria-label={`Preview ${item.name}`}
        onClick={() => open(item)}
        className="h-8 min-w-0 flex-1 px-2.5 py-1.5 text-sm leading-5"
      >
        <Eye className="size-4 shrink-0" aria-hidden />
        Preview
      </Button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="neutral-tertiary"
            aria-label={`More actions for ${item.name}`}
            className="size-8 shrink-0 p-2"
          >
            <MoreVertical className="size-4 shrink-0" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded">
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
  const [imageReady, setImageReady] = useState(false)
  const delayElapsed = usePreviewReveal(item.id)
  const imgRef = useRef<HTMLImageElement>(null)
  const isBlank = Boolean(item.isBlank)
  const loaded = !isBlank && imageReady && delayElapsed

  // Cached/SSR-complete images may never fire onLoad after hydration.
  useEffect(() => {
    if (!isBlank && imgRef.current?.complete) {
      setImageReady(true)
    }
  }, [isBlank])

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
        aria-busy={!isBlank && !loaded}
        className={cn(
          "relative h-[292px] w-full shrink-0 overflow-hidden rounded border transition-colors",
          loaded
            ? "bg-gradient-to-b border-[#f2f4f7] from-[#f2f4f7] to-[#eaecf0] group-hover:border-[#eff4ff] group-hover:from-[#eff4ff] group-hover:to-[#84adff] group-focus-within:border-[#eff4ff] group-focus-within:from-[#eff4ff] group-focus-within:to-[#84adff]"
            : isBlank
              ? "border-transparent bg-white"
              : "border-[#f2f4f7] bg-white"
        )}
      >
        {!loaded ? <ThumbnailSkeleton animated={!isBlank} /> : null}

        {!isBlank ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={imgRef}
            src={getLayoutThumbnail(item.id, item.clonedFromId)}
            alt=""
            onLoad={() => setImageReady(true)}
            onError={() => setImageReady(true)}
            className={cn(
              "absolute inset-0 size-full object-cover object-top transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
            )}
            aria-hidden
          />
        ) : null}

        <div
          className="absolute right-[7px] top-[7px] z-[2] flex items-center gap-1.5"
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
