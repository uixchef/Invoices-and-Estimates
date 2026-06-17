"use client"

import { Fragment, useLayoutEffect, useRef, useState } from "react"
import { Info } from "lucide-react"

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

/**
 * Detailed, branded invoice template (Figma node 3333:158560). A self-contained
 * layout with a business/contact header, an issue/invoice/due info bar, a tax-
 * aware itemised table, a multi-line totals block with a payment schedule, and
 * footer notes. Reads from `GeneratedLayout` so it stays dynamic (and responds
 * to the document data-source picker); template-specific lines (contact details,
 * payment schedule dates) use believable demo content, matching the rest of the
 * renderer's placeholder convention.
 */
function BrandedInvoiceDocument({
  layout,
  pageProfile,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
}) {
  const accent = layout.accent
  const lightAccent = "#eaecf5"
  const money = (value: number) => formatMoney(layout.currencySymbol, value)

  const title = /invoice/i.test(layout.documentType)
    ? "INVOICE"
    : layout.documentType.toUpperCase()

  const subtotal = layout.lineItems.reduce(
    (sum, item) => sum + item.qty * item.rate,
    0
  )
  const discount = subtotal * (layout.discountRate || 0.12)
  const taxableSubtotal = subtotal - discount
  const centralRate = 0.1
  const cityRate = 0.08
  const centralTax = taxableSubtotal * centralRate
  const cityTax = taxableSubtotal * cityRate
  const deposit = 50
  const amountDue = taxableSubtotal + centralTax + cityTax - deposit
  const paymentHalf = amountDue / 2
  const taxPct = Math.round((layout.taxRate || 0.18) * 100)

  const businessSlug =
    layout.businessName
      .split(",")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "studio"
  const businessLines = [
    `www.${businessSlug}.co`,
    "+91 86900 01213",
    "2/112, Friends Colony, Raja Park",
    "Jaipur, Rajasthan, India, 302031",
  ]
  const clientLines = [
    "hey@uixchef.com",
    "+91 86900 01213",
    "2/112, Friends Colony, Raja Park",
    "Jaipur, Rajasthan, India, 302031",
  ]

  const hint = "text-[14px] leading-5 text-[#475467]"
  const totalLabel =
    "flex-1 px-3 text-[16px] leading-6 font-medium overflow-hidden text-ellipsis whitespace-nowrap"
  const totalAmount =
    "w-[120px] px-4 text-right text-[16px] leading-6 font-medium text-[#101828]"

  function InfoBox({
    label,
    value,
    filled,
  }: {
    label: string
    value: string
    filled?: boolean
  }) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 p-4 text-center text-[14px] leading-5"
        style={
          filled
            ? { backgroundColor: accent, color: "#ffffff" }
            : { backgroundColor: lightAccent, color: accent }
        }
      >
        <p className="w-[82px] font-medium">{label}</p>
        <p className="w-[82px]">{value}</p>
      </div>
    )
  }

  function PaymentRow({
    label,
    due,
    amount,
  }: {
    label: string
    due: string
    amount: number
  }) {
    return (
      <div className="flex w-full items-center">
        <div className="flex w-[79px] items-center justify-start">
          <span className="rounded-xl bg-[#fffaeb] px-2 text-[14px] font-medium leading-5 text-[#b54708]">
            Pending
          </span>
        </div>
        <div className="pl-1 pr-2">
          <span
            className="text-[16px] font-medium leading-6"
            style={{ color: accent }}
          >
            {label}
          </span>
        </div>
        <div className="flex-1 px-3">
          <span
            className="text-[16px] font-medium leading-6"
            style={{ color: accent }}
          >
            {due}
          </span>
        </div>
        <div className="px-4 text-right text-[16px] font-medium leading-6 text-[#475467]">
          {money(amount)}
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-white font-[family-name:var(--font-inter)] text-[#101828]"
      style={{ width: pageProfile.widthPx }}
    >
      {/* Business information */}
      <div className="flex items-start justify-between gap-4 overflow-hidden p-4">
        <div className="flex flex-col gap-0.5">
          <p className={hint}>{layout.businessName}</p>
          {businessLines.map((line) => (
            <p key={line} className={hint}>
              {line}
            </p>
          ))}
        </div>
        <p
          className="text-[20px] font-semibold leading-[30px]"
          style={{ color: accent }}
        >
          {title}
        </p>
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          {initialsFor(layout.businessName)}
        </div>
      </div>

      {/* Customer information + info bar */}
      <div className="flex items-start justify-between border-t border-[#eaecf0] pb-4 pl-4">
        <div className="flex flex-col gap-1 pt-2">
          <p className="text-[14px] font-medium leading-5 text-[#101828]">
            Billed to
          </p>
          <div className="flex flex-col gap-0.5">
            <p className={hint}>{layout.clientName}</p>
            {clientLines.map((line) => (
              <p key={line} className={hint}>
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex">
            <InfoBox label="Issue date" value={layout.issueDate} />
            <InfoBox label="Invoice no." value={layout.documentNumber} filled />
            <InfoBox label="Due date" value={layout.dueDate} />
          </div>
          <div
            className="flex w-[114px] items-center justify-center rounded px-2.5 py-1.5 text-[16px] font-semibold leading-6 text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
            style={{ backgroundColor: accent }}
          >
            {`Pay ${money(amountDue)}`}
          </div>
        </div>
      </div>

      {/* Products table */}
      <div className="flex flex-col border-b border-[#d0d5dd]">
        {/* Header */}
        <div className="flex">
          <div className="flex h-9 flex-1 items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
            Item
          </div>
          <div className="flex h-9 w-[110px] items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
            Price
          </div>
          <div className="flex h-9 w-[60px] items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
            Qty
          </div>
          <div className="flex h-9 w-[90px] items-center border-b border-[#d0d5dd] px-4 text-[16px] font-semibold leading-6 text-[#101828]">
            Tax
          </div>
          <div className="flex h-9 w-[120px] items-center justify-end border-b border-[#d0d5dd] px-4 text-right text-[16px] font-semibold leading-6 text-[#101828]">
            Subtotal
          </div>
        </div>
        {/* Item rows */}
        {layout.lineItems.map((item, index) => (
          <Fragment key={index}>
            <div className={cn("flex", index !== 0 && "border-b border-[#d0d5dd]")}>
              <div className="flex flex-1 items-center px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {item.description}
                </span>
              </div>
              <div className="flex w-[110px] items-center px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                {money(item.rate)}
              </div>
              <div className="flex w-[60px] items-center px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                {item.qty}
              </div>
              <div className="flex w-[90px] items-center gap-1 px-4 py-1 text-[16px] font-medium leading-6 text-[#475467]">
                <span>{taxPct}%</span>
                <Info className="size-4 shrink-0 text-[#98a2b3]" aria-hidden />
              </div>
              <div className="flex w-[120px] items-center justify-end px-4 py-1 text-right text-[16px] font-medium leading-6 text-[#475467]">
                {money(item.qty * item.rate)}
              </div>
            </div>
            {index === 0 ? (
              <div className="border-b border-[#d0d5dd] px-4 pb-1 pt-0.5">
                <p className={hint}>
                  Sustainably sourced from Colombia and Ethiopia, these
                  medium-roast beans offer rich notes of dark chocolate, caramel,
                  and citrus. Perfect for any brewing method, they deliver a
                  smooth, full-bodied cup every time.
                </p>
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-1 py-2">
        <div className="flex w-full pl-[71px]">
          <span className={cn(totalLabel, "text-[#101828]")}>Subtotal</span>
          <span className={totalAmount}>{money(subtotal)}</span>
        </div>
        <div className="flex w-full pl-[71px]">
          <span className={totalLabel} style={{ color: accent }}>
            {`Discount (${Math.round((layout.discountRate || 0.12) * 100)}%)`}
          </span>
          <span className={totalAmount}>{`-${money(discount)}`}</span>
        </div>
        <div className="flex w-full pl-[71px]">
          <span className={cn(totalLabel, "text-[#101828]")}>
            Taxable subtotal
          </span>
          <span className={totalAmount}>{money(taxableSubtotal)}</span>
        </div>
        <div className="flex w-full pl-[71px]">
          <span className={totalLabel} style={{ color: accent }}>
            {`Central tax (${Math.round(centralRate * 100)}% on ${money(
              taxableSubtotal
            )})`}
          </span>
          <span className={totalAmount}>{money(centralTax)}</span>
        </div>
        <div className="flex w-full pl-[71px]">
          <span className={totalLabel} style={{ color: accent }}>
            {`City tax (${Math.round(cityRate * 100)}% on ${money(
              taxableSubtotal
            )})`}
          </span>
          <span className={totalAmount}>{money(cityTax)}</span>
        </div>
        <div className="flex w-full pl-[71px]">
          <span className={cn(totalLabel, "text-[#101828]")}>
            Deposit (Check)
          </span>
          <span className={totalAmount}>{`-${money(deposit)}`}</span>
        </div>

        <div className="my-1 h-px w-full bg-[#d0d5dd]" />

        <div className="flex flex-col gap-1">
          <PaymentRow
            label="Payment 1 of 2"
            due="Due Aug 15, 2024"
            amount={paymentHalf}
          />
          <PaymentRow
            label="Payment 2 of 2"
            due="Due Sept 30, 2024"
            amount={paymentHalf}
          />
        </div>

        <div className="my-1 h-px w-full bg-[#d0d5dd]" />

        <div className="flex w-full items-center justify-between pl-[71px]">
          <span className="w-[240px] px-3 text-[16px] font-medium leading-6 text-[#101828]">
            {`Amount due (in ${layout.currencyCode})`}
          </span>
          <span className="w-[120px] px-4 text-right text-[16px] font-medium leading-6 text-[#101828]">
            {money(amountDue)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1 p-4">
        <p className="text-[14px] font-medium leading-5 text-[#101828]">
          Note to customer
        </p>
        <p className="text-[14px] leading-5 text-[#475467]">
          {`Thank you for your business.${
            layout.emphasis ? ` Designed to emphasise ${layout.emphasis}.` : ""
          }`}
        </p>
      </div>

      {/* Footer hint */}
      <div className="flex items-center p-4">
        <p className="text-[14px] leading-5 text-[#475467]">
          Reverse charge (Article 197 - Directive 2006/112 EC)
        </p>
      </div>
    </div>
  )
}

export function LayoutDocument({
  layout,
  pageProfile,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
}) {
  if (layout.style === "branded") {
    return <BrandedInvoiceDocument layout={layout} pageProfile={pageProfile} />
  }

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
 * Frames a `LayoutDocument` as a sheet of paper: a page sized to the medium's
 * real aspect ratio (A4 / US Letter), centred on a neutral mat with a soft
 * elevation, and scaled to contain within the available area so it never
 * stretches into a tall full-bleed strip. The document fits the page width and
 * longer templates scroll inside the page frame, so the silhouette always reads
 * as a page — the mental model the preview panel needs to communicate.
 */
const PAGE_MAT_PADDING = 24

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
  const [box, setBox] = useState<{ width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const node = matRef.current
    if (!node) {
      return
    }
    const update = () =>
      setBox({ width: node.clientWidth, height: node.clientHeight })
    const observer = new ResizeObserver(update)
    observer.observe(node)
    update()
    return () => observer.disconnect()
  }, [])

  const aspect = pageProfile.widthPx / pageProfile.heightPx

  // Contain the page within the mat (minus padding) at the paper aspect ratio:
  // start width-bound, fall back to height-bound when that would overflow.
  let pageWidth = 0
  let pageHeight = 0
  if (box) {
    const availWidth = Math.max(box.width - PAGE_MAT_PADDING * 2, 0)
    const availHeight = Math.max(box.height - PAGE_MAT_PADDING * 2, 0)
    pageWidth = availWidth
    pageHeight = pageWidth / aspect
    if (pageHeight > availHeight) {
      pageHeight = availHeight
      pageWidth = pageHeight * aspect
    }
  }

  return (
    <div
      ref={matRef}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden bg-[#f2f4f7]",
        className
      )}
      style={{ padding: PAGE_MAT_PADDING }}
    >
      {box && pageWidth > 0 ? (
        <div
          className="overflow-y-auto rounded-[6px] bg-white ring-1 ring-[#eaecf0] shadow-[0_12px_24px_-6px_rgba(16,24,40,0.16),0_4px_8px_-4px_rgba(16,24,40,0.08)]"
          style={{ width: pageWidth, height: pageHeight }}
        >
          <LayoutThumbnail
            layout={layout}
            pageProfile={pageProfile}
            flow
            className="w-full"
          />
        </div>
      ) : null}
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
