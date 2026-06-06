"use client"

import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { MediumPreviewStage } from "@/components/invoices/mediums/medium-preview-stage"
import { mediumRowToFormState } from "@/lib/medium-form"
import { getMediumEditorHref } from "@/lib/medium-routes"
import type { MediumRow } from "@/lib/mediums-data"
import { usePreviewReveal } from "@/lib/use-preview-reveal"
import { cn } from "@/lib/utils"

/** Figma Medium cards (3161:161750) — compact preview canvas. */
const MEDIUM_CARD_PREVIEW_HEIGHT_PX = 180

function MediumPreviewSkeleton() {
  return (
    <div
      className="layout-thumbnail-skeleton-gradient absolute inset-0 overflow-hidden rounded bg-[#f2f4f7]"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, #d0d5dd 2px, transparent 2px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="h-[84%] w-[52%] rounded-sm bg-[#eaecf0]" />
      </div>
      <div className="layout-thumbnail-skeleton-shimmer absolute inset-0" />
    </div>
  )
}

function MediumCardActions({
  item,
  editHref,
}: {
  item: MediumRow
  editHref: string
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-[3] flex items-end justify-center gap-1.5 bg-gradient-to-b from-transparent to-[rgba(178,204,255,0.7)] p-3",
        "pointer-events-none opacity-0 transition-opacity",
        "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        "group-hover:pointer-events-auto group-hover:opacity-100"
      )}
    >
      <Link
        href={editHref}
        className={cn(
          "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded border border-[#84adff] bg-white px-2.5 py-1.5",
          "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#004eeb]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",
          "hover:bg-[#f5f8ff] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        )}
      >
        <Pencil className="size-4 shrink-0" aria-hidden />
        Edit
      </Link>

      <button
        type="button"
        aria-label={`Delete ${item.name}`}
        className={cn(
          "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded border border-[#fda29b] bg-white px-2.5 py-1.5",
          "font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#b42318]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none",
          "hover:bg-[#fffbfa] focus-visible:ring-2 focus-visible:ring-[#f04438]/40"
        )}
      >
        <Trash2 className="size-4 shrink-0" aria-hidden />
        Delete
      </button>
    </div>
  )
}

function MediumPreviewCanvas({ item }: { item: MediumRow }) {
  const previewReady = usePreviewReveal(item.id)
  const formState = mediumRowToFormState(item)

  return (
    <div
      aria-busy={!previewReady}
      className="relative w-full shrink-0 overflow-hidden rounded"
      style={{ height: MEDIUM_CARD_PREVIEW_HEIGHT_PX }}
    >
      {!previewReady ? <MediumPreviewSkeleton /> : null}

      <div
        className={cn(
          "size-full transition-opacity duration-300",
          previewReady ? "opacity-100" : "opacity-0"
        )}
      >
        <MediumPreviewStage
          state={formState}
          variant="card"
          className="size-full rounded"
          contentClassName="p-2"
        />
      </div>
    </div>
  )
}

function MediumCardMeta({ item }: { item: MediumRow }) {
  const detailSegments =
    item.paper === "Custom"
      ? [item.dimensions, item.resolution]
      : [item.paper, item.resolution]

  return (
    <div className="flex min-w-0 items-center whitespace-nowrap">
      <p className="shrink-0 font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#101828]">
        {item.name}
      </p>
      {detailSegments.map((segment, index) => (
        <span key={`${segment}-${index}`} className="flex min-w-0 items-center">
          <span
            className="mx-1.5 shrink-0 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#475467]"
            aria-hidden
          >
            •
          </span>
          <p className="min-w-0 truncate font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
            {segment}
          </p>
        </span>
      ))}
    </div>
  )
}

type MediumCardProps = {
  item: MediumRow
}

/**
 * Figma: Medium cards (3161:161750) · Default (3161:161821) · Hover (3161:161751)
 */
export function MediumCard({ item }: MediumCardProps) {
  const editHref = getMediumEditorHref(item.id)

  return (
    <article
      className={cn(
        "group flex w-full flex-col gap-3 overflow-hidden rounded-lg border p-4 transition-colors",
        "border-[#d0d5dd] bg-white",
        "hover:border-[#84adff] hover:bg-[#f5f8ff]",
        "focus-within:border-[#84adff] focus-within:bg-[#f5f8ff]"
      )}
    >
      <div className="relative w-full shrink-0">
        <MediumPreviewCanvas item={item} />
        <MediumCardActions item={item} editHref={editHref} />
      </div>

      <div className="flex w-full flex-col gap-1">
        <MediumCardMeta item={item} />
        <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
          {item.updatedOn}, {item.updatedAgo}
        </p>
      </div>
    </article>
  )
}
