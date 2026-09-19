"use client"

import { useLayoutEffect, useRef, useState } from "react"

import { InvoiceFamilyDocument } from "@/components/invoices/documents/invoice-family-document"
import type { DocumentPageProfile } from "@/lib/mediums-data"
import type { GeneratedLayout } from "@/lib/layout-builder-types"
import { useLayoutBuilderOptional } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

const PAGE_MAT_PADDING = 24

/**
 * Pure, non-interactive renderer for a `GeneratedLayout`. Dashboard cards,
 * the preview panel, and the builder canvas share `InvoiceFamilyDocument` so
 * thumbnails cannot drift from the editable paper.
 */
export function LayoutDocument({
  layout,
  pageProfile,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
}) {
  const builder = useLayoutBuilderOptional()
  return (
    <InvoiceFamilyDocument
      layout={layout}
      pageProfile={pageProfile}
      customBoards={builder?.brandCatalog}
    />
  )
}

/**
 * Fits a `LayoutDocument` into its container by scaling the fixed-width paper to
 * the available width and top-aligning it — the same fit behaviour as the
 * builder's `DocumentStage`, used for card and preview thumbnails.
 */
export function LayoutThumbnail({
  layout,
  pageProfile,
  className,
  flow = false,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
  className?: string
  flow?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)
  const [scaledHeight, setScaledHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }
    const update = () => {
      const available = node.clientWidth
      if (available > 0) {
        setScale(available / pageProfile.widthPx)
      }
    }
    const observer = new ResizeObserver(update)
    observer.observe(node)
    update()
    return () => observer.disconnect()
  }, [pageProfile.widthPx])

  useLayoutEffect(() => {
    if (!flow || scale === null) {
      return
    }
    const doc = docRef.current
    if (!doc) {
      return
    }
    const measure = () => setScaledHeight(doc.offsetHeight * scale)
    const observer = new ResizeObserver(measure)
    observer.observe(doc)
    measure()
    return () => observer.disconnect()
  }, [flow, scale, layout])

  return (
    <div
      ref={containerRef}
      className={cn(flow ? "overflow-hidden" : "overflow-hidden bg-white", className)}
      style={flow && scaledHeight !== null ? { height: scaledHeight } : undefined}
    >
      {scale !== null ? (
        <div
          ref={docRef}
          style={{
            width: pageProfile.widthPx,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <LayoutDocument layout={layout} pageProfile={pageProfile} />
        </div>
      ) : null}
    </div>
  )
}

export function LayoutPagePreview({
  layout,
  pageProfile,
  className,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
  className?: string
}) {
  const matRef = useRef<HTMLDivElement>(null)
  const [matWidth, setMatWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const node = matRef.current
    if (!node) {
      return
    }
    const update = () => setMatWidth(node.clientWidth)
    const observer = new ResizeObserver(update)
    observer.observe(node)
    update()
    return () => observer.disconnect()
  }, [])

  const pageWidth =
    matWidth !== null ? Math.max(matWidth - PAGE_MAT_PADDING * 2, 0) : 0

  return (
    <div
      ref={matRef}
      className={cn(
        "h-full w-full overflow-y-auto overflow-x-hidden bg-[#f2f4f7]",
        className
      )}
      style={{ padding: PAGE_MAT_PADDING }}
    >
      {pageWidth > 0 ? (
        <div className="flex min-h-full items-center justify-center">
          <div
            className="rounded-[6px] bg-white shadow-[0_12px_24px_-6px_rgba(16,24,40,0.16),0_4px_8px_-4px_rgba(16,24,40,0.08)] ring-1 ring-[#eaecf0]"
            style={{ width: pageWidth }}
          >
            <LayoutThumbnail
              layout={layout}
              pageProfile={pageProfile}
              flow
              className="w-full"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
