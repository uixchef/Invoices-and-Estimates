"use client"

import { useLayoutEffect, useRef, useState } from "react"

import type { DocumentPageProfile } from "@/lib/mediums-data"
import type { GeneratedLayout } from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

/**
 * Pure, non-interactive renderer for a `GeneratedLayout`. This is the resting
 * visual of the builder's `DocumentSurface` (same markup, classes, and
 * style/accent logic, minus the edit selectors), so dashboard thumbnails and
 * the preview panel depict exactly the layout the builder reconstructs. Both
 * sides take their layout from `layoutFromRow`, so they can never drift.
 */

function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return letters || "B"
}

function Monogram({
  layout,
  onAccent = false,
}: {
  layout: GeneratedLayout
  onAccent?: boolean
}) {
  if (!layout.sections.logo) {
    return null
  }
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
        onAccent ? "bg-white/20 text-white" : "text-white"
      )}
      style={onAccent ? undefined : { backgroundColor: layout.accent }}
      aria-hidden
    >
      {initialsFor(layout.businessName)}
    </div>
  )
}

type SafePadding = { top: number; right: number; bottom: number; left: number }

function DocumentHeader({
  layout,
  safePadding,
}: {
  layout: GeneratedLayout
  safePadding: SafePadding
}) {
  const addressLine = "123 Market Street · Suite 400"

  if (layout.style === "bold") {
    return (
      <div
        className="flex items-start justify-between gap-4 py-9 text-white"
        style={{
          backgroundColor: layout.accent,
          paddingRight: safePadding.right,
          paddingLeft: safePadding.left,
        }}
      >
        <div className="flex items-center gap-3">
          <Monogram layout={layout} onAccent />
          <div>
            <p className="text-xl font-bold leading-tight">
              {layout.businessName}
            </p>
            <p className="text-sm text-white/80">{addressLine}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold uppercase tracking-wide">
            {layout.documentType}
          </p>
          <p className="text-sm text-white/80">{layout.documentNumber}</p>
        </div>
      </div>
    )
  }

  if (layout.style === "classic") {
    return (
      <div
        className="flex flex-col items-center gap-2 text-center"
        style={{
          paddingLeft: safePadding.left,
          paddingRight: safePadding.right,
        }}
      >
        <Monogram layout={layout} />
        <p className="text-2xl font-semibold text-[#101828]">
          {layout.businessName}
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-[#667085]">
          {layout.documentType}
        </p>
        <p className="text-sm text-[#98a2b3]">{layout.documentNumber}</p>
      </div>
    )
  }

  // minimal + modern share a left-aligned header; modern adds a top accent bar
  // and tints the document title.
  return (
    <>
      {layout.style === "modern" ? (
        <div className="h-1.5 w-full" style={{ backgroundColor: layout.accent }} />
      ) : null}
      <div
        className="flex items-start justify-between gap-4"
        style={{
          paddingLeft: safePadding.left,
          paddingRight: safePadding.right,
        }}
      >
        <div className="flex items-center gap-3">
          <Monogram layout={layout} />
          <div>
            <p className="text-lg font-semibold text-[#101828]">
              {layout.businessName}
            </p>
            <p className="text-sm text-[#667085]">{addressLine}</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-2xl font-semibold"
            style={
              layout.style === "modern" ? { color: layout.accent } : undefined
            }
          >
            {layout.documentType}
          </p>
          <p className="text-sm text-[#667085]">{layout.documentNumber}</p>
        </div>
      </div>
    </>
  )
}

export function LayoutDocument({
  layout,
  pageProfile,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
}) {
  const safePadding = pageProfile.padding
  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  )
  const discount = layout.sections.discount ? subtotal * layout.discountRate : 0
  const tax = layout.sections.taxes ? (subtotal - discount) * layout.taxRate : 0
  const total = subtotal - discount + tax
  const money = (value: number) => formatMoney(layout.currencySymbol, value)
  const paperClassName =
    layout.style === "classic"
      ? "font-serif"
      : "font-[family-name:var(--font-inter)]"

  return (
    <div
      className={cn("bg-white text-[#101828]", paperClassName)}
      style={{ width: pageProfile.widthPx, paddingTop: safePadding.top }}
    >
      <div className="flex flex-col">
        <DocumentHeader layout={layout} safePadding={safePadding} />

        <div
          className="flex flex-1 flex-col gap-6 pt-8"
          style={{
            paddingLeft: safePadding.left,
            paddingRight: safePadding.right,
            paddingBottom: safePadding.bottom,
          }}
        >
          {/* Billing details */}
          <div className="flex justify-between gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                Bill to
              </p>
              <p className="text-sm font-semibold text-[#101828]">
                {layout.clientName}
              </p>
              <p className="text-sm text-[#667085]">456 Client Avenue</p>
              <p className="text-sm text-[#667085]">San Francisco, CA 94103</p>
            </div>
            <div className="flex flex-col gap-1.5 text-right">
              <div className="flex justify-between gap-10">
                <span className="text-sm text-[#667085]">Issued</span>
                <span className="text-sm font-medium text-[#101828]">
                  {layout.issueDate}
                </span>
              </div>
              <div className="flex justify-between gap-10">
                <span className="text-sm text-[#667085]">Due</span>
                <span className="text-sm font-medium text-[#101828]">
                  {layout.dueDate}
                </span>
              </div>
              <div className="flex justify-between gap-10">
                <span className="text-sm text-[#667085]">Currency</span>
                <span className="text-sm font-medium text-[#101828]">
                  {layout.currencyCode}
                </span>
              </div>
            </div>
          </div>

          {/* Line items */}
          {layout.sections.items ? (
            <div className="flex flex-col">
              <div
                className="flex items-center gap-4 border-b-2 py-2 text-xs font-semibold uppercase tracking-wide text-[#98a2b3]"
                style={{ borderColor: layout.accent }}
              >
                <span className="flex-1">Description</span>
                <span className="w-12 text-right">Qty</span>
                <span className="w-24 text-right">Rate</span>
                <span className="w-28 text-right">Amount</span>
              </div>
              {layout.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 border-b border-[#eaecf0] py-3 text-sm text-[#101828]"
                >
                  <span className="flex-1">{item.description}</span>
                  <span className="w-12 text-right text-[#667085]">
                    {item.qty}
                  </span>
                  <span className="w-24 text-right text-[#667085]">
                    {money(item.rate)}
                  </span>
                  <span className="w-28 text-right font-medium">
                    {money(item.qty * item.rate)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="flex w-60 flex-col gap-2">
              <div className="flex justify-between text-sm text-[#667085]">
                <span>Subtotal</span>
                <span className="text-[#101828]">{money(subtotal)}</span>
              </div>
              {layout.sections.discount ? (
                <div className="flex justify-between text-sm text-[#667085]">
                  <span>Discount ({Math.round(layout.discountRate * 100)}%)</span>
                  <span className="text-[#101828]">-{money(discount)}</span>
                </div>
              ) : null}
              {layout.sections.taxes ? (
                <div className="flex justify-between text-sm text-[#667085]">
                  <span>Tax ({Math.round(layout.taxRate * 100)}%)</span>
                  <span className="text-[#101828]">{money(tax)}</span>
                </div>
              ) : null}
              <div className="mt-1 flex items-baseline justify-between border-t border-[#eaecf0] pt-2">
                <span className="text-sm font-semibold text-[#101828]">
                  Total
                </span>
                <span className="text-lg font-bold" style={{ color: layout.accent }}>
                  {money(total)}
                </span>
              </div>
            </div>
          </div>

          {layout.sections.onlinePayment ? (
            <div className="flex justify-end">
              <div
                className="inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: layout.accent }}
              >
                Pay online
              </div>
            </div>
          ) : null}

          {/* Notes & terms */}
          {layout.sections.notes ||
          layout.sections.terms ||
          layout.sections.paymentDetails ? (
            <div className="mt-auto flex flex-col gap-4 border-t border-[#eaecf0] pt-6">
              {layout.sections.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-[#667085]">
                    {`Thank you for your business.${
                      layout.emphasis
                        ? ` Designed to emphasise ${layout.emphasis}.`
                        : ""
                    }`}
                  </p>
                </div>
              ) : null}
              {layout.sections.terms ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    Payment terms
                  </p>
                  <p className="mt-1 text-sm text-[#667085]">
                    Payment due within 14 days. Late payments may incur a 1.5%
                    monthly fee.
                  </p>
                </div>
              ) : null}
              {layout.sections.paymentDetails ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    Payment details
                  </p>
                  <div className="mt-1 flex flex-col gap-0.5 text-sm text-[#667085]">
                    <span>{`Bank: ${layout.businessName} · Acct 0042 1188`}</span>
                    <span>Routing 110000000 · SWIFT NWBKUS33</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
  /**
   * When true, the wrapper grows to the full scaled document height so it can
   * scroll within its parent (preview panel). When false (default), it fills
   * its container and crops the overflow — the cropped card thumbnail.
   */
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

  // Once scaled, track the document's rendered height so `flow` mode can size
  // the wrapper for scrolling. Re-measures when the layout or scale changes.
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
