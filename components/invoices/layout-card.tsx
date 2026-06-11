"use client"

import { useEffect, useRef, useState } from "react"
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

/** Document-shape paths for the empty-thumbnail placeholder (Figma 3082:29975). */
const EMPTY_THUMBNAIL_PATHS = [
  "M0 5.3578C0 2.39877 2.85685 0 6.38095 0H261.619C265.143 0 268 2.39877 268 5.3578V52.2385C268 55.1976 265.143 57.5963 261.619 57.5963H6.38096C2.85686 57.5963 0 55.1976 0 52.2385V5.3578Z",
  "M0 76.3486C0 73.3896 2.85685 70.9908 6.38095 70.9908H81.3571C84.8812 70.9908 87.7381 73.3896 87.7381 76.3486V286.642C87.7381 289.601 84.8812 292 81.3571 292H6.38095C2.85685 292 0 289.601 0 286.642V76.3486Z",
  "M103.69 76.3486C103.69 73.3896 106.547 70.9908 110.071 70.9908H261.619C265.143 70.9908 268 73.3896 268 76.3486V127.248C268 130.207 265.143 132.606 261.619 132.606H110.071C106.547 132.606 103.69 130.207 103.69 127.248V76.3486Z",
  "M103.69 143.321C103.69 141.102 105.833 139.303 108.476 139.303H263.214C265.857 139.303 268 141.102 268 143.321C268 145.54 265.857 147.339 263.214 147.339H108.476C105.833 147.339 103.69 145.54 103.69 143.321Z",
  "M103.69 158.055C103.69 155.836 105.833 154.037 108.476 154.037H186.643C189.286 154.037 191.429 155.836 191.429 158.055C191.429 160.274 189.286 162.073 186.643 162.073H108.476C105.833 162.073 103.69 160.274 103.69 158.055Z",
  "M103.69 180.826C103.69 177.867 106.547 175.468 110.071 175.468H185.048C188.572 175.468 191.429 177.867 191.429 180.826V221.009C191.429 223.968 188.572 226.367 185.048 226.367H110.071C106.547 226.367 103.69 223.968 103.69 221.009V180.826Z",
  "M199.405 178.147C199.405 176.667 200.833 175.468 202.595 175.468H264.81C266.572 175.468 268 176.667 268 178.147V180.826C268 182.305 266.572 183.505 264.81 183.505H202.595C200.833 183.505 199.405 182.305 199.405 180.826V178.147Z",
  "M199.405 192.881C199.405 191.401 200.833 190.202 202.595 190.202H264.81C266.572 190.202 268 191.401 268 192.881V195.56C268 197.039 266.572 198.239 264.81 198.239H202.595C200.833 198.239 199.405 197.039 199.405 195.56V192.881Z",
  "M199.405 207.615C199.405 206.135 200.833 204.936 202.595 204.936H264.81C266.572 204.936 268 206.135 268 207.615V210.294C268 211.773 266.572 212.972 264.81 212.972H202.595C200.833 212.972 199.405 211.773 199.405 210.294V207.615Z",
  "M199.405 221.009C199.405 219.53 200.833 218.33 202.595 218.33H240.881C242.643 218.33 244.071 219.53 244.071 221.009V223.688C244.071 225.168 242.643 226.367 240.881 226.367H202.595C200.833 226.367 199.405 225.168 199.405 223.688V221.009Z",
  "M103.69 245.119C103.69 242.16 106.547 239.761 110.071 239.761H185.048C188.572 239.761 191.429 242.16 191.429 245.119V285.303C191.429 288.262 188.572 290.661 185.048 290.661H110.071C106.547 290.661 103.69 288.262 103.69 285.303V245.119Z",
  "M199.405 242.44C199.405 240.961 200.833 239.761 202.595 239.761H264.81C266.572 239.761 268 240.961 268 242.44V245.119C268 246.599 266.572 247.798 264.81 247.798H202.595C200.833 247.798 199.405 246.599 199.405 245.119V242.44Z",
  "M199.405 257.174C199.405 255.695 200.833 254.495 202.595 254.495H264.81C266.572 254.495 268 255.695 268 257.174V259.853C268 261.333 266.572 262.532 264.81 262.532H202.595C200.833 262.532 199.405 261.333 199.405 259.853V257.174Z",
  "M199.405 271.908C199.405 270.429 200.833 269.229 202.595 269.229H264.81C266.572 269.229 268 270.429 268 271.908V274.587C268 276.067 266.572 277.266 264.81 277.266H202.595C200.833 277.266 199.405 276.067 199.405 274.587V271.908Z",
  "M199.405 285.303C199.405 283.823 200.833 282.624 202.595 282.624H240.881C242.643 282.624 244.071 283.823 244.071 285.303V287.982C244.071 289.461 242.643 290.661 240.881 290.661H202.595C200.833 290.661 199.405 289.461 199.405 287.982V285.303Z",
] as const

/**
 * Empty-thumbnail document shapes for blank layouts. Two stacked path layers
 * crossfade on hover, matching the Figma vector swap exactly:
 * - Default (3082:30384): solid gray #EAECF0
 * - Hover (3082:30369): a single vertical gradient across the whole thumbnail,
 *   #F5F8FF at the top → #B2CCFF at the bottom, clipped to the shapes.
 */
function EmptyThumbnailShapes() {
  const shapes = EMPTY_THUMBNAIL_PATHS.map((d, index) => (
    <path key={index} d={d} />
  ))

  return (
    <svg
      className="absolute inset-0 size-full"
      preserveAspectRatio="none"
      viewBox="0 0 268 292"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="empty-thumbnail-hover"
          x1="134"
          y1="292"
          x2="134"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B2CCFF" />
          <stop offset="1" stopColor="#F5F8FF" />
        </linearGradient>
      </defs>

      <g
        fill="#EAECF0"
        className="transition-opacity group-hover:opacity-0 group-focus-within:opacity-0"
      >
        {shapes}
      </g>
      <g
        fill="url(#empty-thumbnail-hover)"
        className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {shapes}
      </g>
    </svg>
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
  const ready = isBlank
    ? delayElapsed
    : imageReady && delayElapsed

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
        aria-busy={!ready}
        className={cn(
          "relative h-[292px] w-full shrink-0 overflow-hidden rounded border transition-colors",
          ready && !isBlank
            ? "bg-gradient-to-b border-[#f2f4f7] from-[#f2f4f7] to-[#eaecf0] group-hover:border-[#eff4ff] group-hover:from-[#eff4ff] group-hover:to-[#84adff] group-focus-within:border-[#eff4ff] group-focus-within:from-[#eff4ff] group-focus-within:to-[#84adff]"
            : ready && isBlank
              ? "border-transparent bg-transparent"
              : "border-[#f2f4f7] bg-white"
        )}
      >
        {!ready ? <ThumbnailSkeleton /> : null}
        {ready && isBlank ? <EmptyThumbnailShapes /> : null}

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
              ready ? "opacity-100" : "opacity-0"
            )}
            aria-hidden
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
