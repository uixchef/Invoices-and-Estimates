"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, MoreVertical, Pencil } from "lucide-react"
import type { LayoutRow } from "@/lib/layouts-data"
import { useMediumsStore } from "@/lib/mediums-store"
import { getLayoutThumbnail } from "@/lib/layout-thumbnails"
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

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex items-end justify-center gap-2 bg-gradient-to-b from-transparent to-[rgba(178,204,255,0.7)] p-3",
        "pointer-events-none opacity-0 transition-opacity",
        "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        "group-hover:pointer-events-auto group-hover:opacity-100"
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

      <button
        type="button"
        aria-label={`Preview ${item.name}`}
        onClick={() => open(item)}
        className={cn(
          "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded border border-[#d0d5dd] bg-white px-2.5 py-1.5",
          "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#475467]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",
          "hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        )}
      >
        <Eye className="size-4 shrink-0" aria-hidden />
        Preview
      </button>

      <button
        type="button"
        aria-label={`More actions for ${item.name}`}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded border border-[#f9fafb] bg-[#f9fafb] p-2 outline-none",
          "hover:border-[#d0d5dd] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        )}
      >
        <MoreVertical className="size-4 text-[#475467]" aria-hidden />
      </button>
    </div>
  )
}

export function LayoutCard({ item }: { item: LayoutRow }) {
  const { getMediumName } = useMediumsStore()
  const [imageReady, setImageReady] = useState(false)
  const delayElapsed = usePreviewReveal(item.id)
  const imgRef = useRef<HTMLImageElement>(null)
  const loaded = imageReady && delayElapsed

  // Cached/SSR-complete images may never fire onLoad after hydration.
  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageReady(true)
    }
  }, [])

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
        aria-busy={!loaded}
        className={cn(
          "relative h-[292px] w-full shrink-0 overflow-hidden rounded border transition-colors",
          loaded
            ? "bg-gradient-to-b border-[#f2f4f7] from-[#f2f4f7] to-[#eaecf0] group-hover:border-[#eff4ff] group-hover:from-[#eff4ff] group-hover:to-[#84adff] group-focus-within:border-[#eff4ff] group-focus-within:from-[#eff4ff] group-focus-within:to-[#84adff]"
            : "border-[#f2f4f7] bg-white"
        )}
      >
        {!loaded ? <ThumbnailSkeleton /> : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={getLayoutThumbnail(item.id)}
          alt=""
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(true)}
          className={cn(
            "absolute inset-0 size-full object-cover object-top transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          aria-hidden
        />

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
