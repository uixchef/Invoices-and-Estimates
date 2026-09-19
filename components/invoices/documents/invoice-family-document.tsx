"use client"

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react"

import { InvoiceBrandMark, initialsFor } from "@/lib/invoice-brand-mark"
import { demoPaymentDetails } from "@/lib/demo-payment"
import {
  findPayOnlineButton,
  findPaymentDetailsRoot,
} from "@/lib/document-actions"
import { invoiceTotals } from "@/lib/invoice-totals"
import type { DocumentPageProfile } from "@/lib/mediums-data"
import type { GeneratedLayout, PlacedElementZone } from "@/lib/layout-builder-types"
import {
  brandCssVars,
  resolveFamilyBrand,
  type BrandBoard,
  type ResolvedFamilyBrand,
} from "@/lib/brand-boards"
import { normalizeLayoutStyle, type LayoutFamilyId } from "@/lib/layout-family"
import { cn } from "@/lib/utils"
import { slotFromDisplayLabel } from "@/lib/native-instance-id"

export type FamilyTextProps = {
  label: string
  /** Stable semantic slot. Independent of `label`. */
  slot?: string
  /** Same-parent index when two nodes share a slot. Default 1. */
  occurrence?: number
  value: string
  className?: string
  onCommit?: (next: string) => void
}

export type FamilySectionProps = {
  label: string
  /** Stable semantic slot. Independent of `label`. */
  slot?: string
  /** Same-parent index when two nodes share a slot. Default 1. */
  occurrence?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export type FamilySlotsValue = {
  text?: (props: FamilyTextProps) => ReactNode
  section?: (props: FamilySectionProps) => ReactNode
  zone?: (zone: PlacedElementZone) => ReactNode
}

const FamilySlots = createContext<FamilySlotsValue>({})
const BrandPaint = createContext<ResolvedFamilyBrand | null>(null)

function usePaint(): ResolvedFamilyBrand {
  return (
    useContext(BrandPaint) ??
    resolveFamilyBrand("studio", null)
  )
}

export function FamilySlotsProvider({
  value,
  children,
}: {
  value: FamilySlotsValue
  children: ReactNode
}) {
  return <FamilySlots.Provider value={value}>{children}</FamilySlots.Provider>
}

function Z({ zone }: { zone: PlacedElementZone }) {
  const slots = useContext(FamilySlots)
  return slots.zone ? <>{slots.zone(zone)}</> : null
}

function T(props: FamilyTextProps) {
  const slots = useContext(FamilySlots)
  const paint = usePaint()
  const slot = props.slot ?? slotFromDisplayLabel(props.label)
  const heading = slot === "business-name"
  const style = heading ? { fontFamily: paint.headingFont } : undefined
  const resolved = { ...props, slot }
  if (slots.text) {
    const node = slots.text(resolved)
    return heading ? <span style={style}>{node}</span> : node
  }
  return (
    <span className={props.className} style={style}>
      {props.value}
    </span>
  )
}

function S(props: FamilySectionProps) {
  const slots = useContext(FamilySlots)
  const slot = props.slot ?? slotFromDisplayLabel(props.label)
  const resolved = { ...props, slot }
  if (slots.section) {
    return slots.section(resolved)
  }
  return (
    <div className={props.className} style={props.style}>
      {props.children}
    </div>
  )
}

function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function totalsOf(layout: GeneratedLayout) {
  const { subtotal, discount, tax, total } = invoiceTotals(layout)
  return {
    subtotal,
    discount,
    tax,
    total,
    money: (value: number) => formatMoney(layout.currencySymbol, value),
  }
}

function FamilyDocumentExtras({
  layout,
  money,
  onDark = false,
}: {
  layout: GeneratedLayout
  money: (n: number) => string
  onDark?: boolean
}) {
  const payment = layout.payment ?? demoPaymentDetails(layout)
  const hasPlacedPay = findPayOnlineButton(layout.blocks ?? [])
  const hasPlacedPayment = findPaymentDetailsRoot(layout.blocks ?? [])
  const showPay = layout.sections.onlinePayment && !hasPlacedPay
  const showBank = layout.sections.paymentDetails && !hasPlacedPayment
  if (!showPay && !showBank) {
    return null
  }

  const labelClass = onDark
    ? "text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45"
    : "text-[9px] font-semibold uppercase tracking-[0.16em] opacity-60"
  const bodyClass = onDark ? "text-[11px] leading-4 text-white/75" : "text-[11px] leading-4"
  const ctaTextClass = onDark ? "text-[12px] font-semibold text-[#0b1220]" : "text-[12px] font-semibold text-white"

  return (
    <S slot="payment-extras" label="Payment extras" className="mt-3 space-y-3">
      {showPay ? (
        <div className="space-y-1">
          <a
            href={payment.payUrl}
            className="inline-flex h-9 items-center justify-center rounded-lg px-4 no-underline"
            style={{
              backgroundColor: onDark ? "#ffffff" : layout.accent,
            }}
            onClick={(event) => event.preventDefault()}
          >
            <T
              slot="pay-online-button"
              label="Pay online button"
              value={payment.payLabel}
              className={ctaTextClass}
            />
          </a>
          <p className={bodyClass}>
            <T slot="online-payment-link" label="Online payment link" value={payment.payUrl} />
          </p>
        </div>
      ) : null}
      {showBank ? (
        <S slot="payment-details" label="Payment details" className="space-y-1">
          <p className={labelClass}>
            <T slot="payment-details-heading" label="Payment details heading" value="Payment details" />
          </p>
          <p className={bodyClass}>
            <T slot="payment-bank-name" label="Payment bank name" value={payment.bankName} />
          </p>
          <p className={bodyClass}>
            <T slot="payment-account-name" label="Payment account name" value={payment.accountName} />
          </p>
          <p className={bodyClass}>
            <T
              slot="payment-account-number"
              label="Payment account number"
              value={`Account ${payment.accountNumber}`}
            />
          </p>
          <p className={bodyClass}>
            <T
              slot="payment-routing-number"
              label="Payment routing number"
              value={`Routing ${payment.routingNumber}`}
            />
          </p>
        </S>
      ) : null}
    </S>
  )
}

function FamilyDiscountLine({
  layout,
  money,
  className,
}: {
  layout: GeneratedLayout
  money: (n: number) => string
  className?: string
}) {
  if (!layout.sections.discount) {
    return null
  }
  const { discount } = totalsOf(layout)
  return (
    <p className={className}>
      <T
        slot="discount-label"
        label="Discount label"
        value={`Discount (${Math.round(layout.discountRate * 100)}%)`}
      />{" "}
      <T slot="discount-amount" label="Discount amount" value={`−${money(discount)}`} />
    </p>
  )
}

function notesBody(layout: GeneratedLayout): string {
  return `Thank you for your business.${
    layout.emphasis ? ` Designed to emphasise ${layout.emphasis}.` : ""
  }`
}

function termsBody(): string {
  return "Payment due within 14 days. Late payments may incur a 1.5% monthly fee."
}

const BUSINESS_ADDRESS = "123 Market Street · Suite 400"
const CLIENT_LINE_1 = "456 Client Avenue"
const CLIENT_LINE_2 = "San Francisco, CA 94103"

function invoiceSuffix(num: string): string {
  const tail = num.split("-").pop() ?? num
  return tail.replace(/\D/g, "").slice(-4) || tail
}

type Pad = DocumentPageProfile["padding"]

function StudioFamily({
  layout,
  pad,
  pageH,
}: {
  layout: GeneratedLayout
  pad: Pad
  pageH: number
}) {
  const { subtotal, discount, tax, total, money } = totalsOf(layout)
  const tokens = usePaint()
  const accent = tokens.primary
  const mark = initialsFor(layout.businessName).slice(0, 1) || "N"

  return (
    <div
      className="relative flex min-h-full flex-col overflow-hidden"
      style={{
        minHeight: pageH,
        backgroundColor: tokens.page,
        color: tokens.text,
        fontFamily: tokens.bodyFont,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 z-[1] w-[14px]"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <p
        style={{ color: `${accent}0f` }}
        aria-hidden
      >
        {mark}
      </p>

      <div
        className="relative z-[1] flex min-h-full flex-1 flex-col"
        style={{
          padding: `${pad.top + 4}px ${pad.right}px 0 ${pad.left + 18}px`,
        }}
      >
        <S slot="header" label="Header" className="relative">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0 flex-[1.6]">
              {layout.sections.logo ? (
                <InvoiceBrandMark layout={layout} family="studio" size="sm" />
              ) : null}
              <p className="mt-7 max-w-[9.5ch] text-[52px] font-semibold leading-[0.84] tracking-[-0.055em] break-words">
                <T
                  slot="business-name"
                  label="Business name"
                  value={layout.businessName}
                />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end pt-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: accent }}
              >
                <T slot="document-type" label="Document type" value={layout.documentType} />
              </p>
              <p className="mt-10 text-right font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[#475569]">
                <T slot="document-number" label="Document number" value={layout.documentNumber} />
              </p>
            </div>
          </div>
        </S>

        <S
          slot="billing-details"
          label="Billing details"
          className="mt-10 grid grid-cols-[1.7fr_0.9fr] gap-x-10 border-t border-[#0b1220]/12 pt-6"
        >
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">
              <T slot="bill-to-label" label="Bill to label" value="Invoice to" />
            </p>
            <p className="mt-3 text-[22px] font-semibold leading-[1.05] tracking-[-0.035em] break-words">
              <T slot="client-name" label="Client name" value={layout.clientName} />
            </p>
            <p className="mt-2 max-w-[28ch] text-[11px] leading-4 text-[#64748b]">
              <T slot="client-address-1" label="Client address line 1" value={CLIENT_LINE_1} />
              <br />
              <T slot="client-address-2" label="Client address line 2" value={CLIENT_LINE_2} />
            </p>
            <div
              className="mt-5 h-[3px] w-10"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          </div>
          <div className="flex flex-col justify-end space-y-3 pb-0.5 text-[12px]">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                <T slot="issued-label" label="Issued label" value="Issued" />
              </p>
              <p className="mt-1 tabular-nums">
                <T slot="issue-date" label="Issue date" value={layout.issueDate} />
              </p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                <T slot="due-label" label="Due label" value="Due" />
              </p>
              <p
                className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.03em] tabular-nums"
                style={{ color: accent }}
              >
                <T slot="due-date" label="Due date" value={layout.dueDate} />
              </p>
            </div>
            <p className="text-[11px] text-[#64748b]">
              <T slot="currency-code" label="Currency code" value={layout.currencyCode} />
            </p>
          </div>
        </S>

        <S slot="line-items" label="Line items" className="mt-8 flex-1">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">
            <T slot="services-heading" label="Services heading" value="Services" />
          </p>
          {layout.lineItems.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-baseline gap-3 border-t border-[#0b1220]/10 py-3"
            >
              <span
                className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums"
                style={{ color: accent }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-snug tracking-[-0.015em] break-words">
                  <T
                    label={`Item ${i + 1} description`}
                    value={item.description}
                  />
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-[#94a3b8]">
                  <T label={`Item ${i + 1} qty`} value={String(item.qty)} /> ×{" "}
                  <T label={`Item ${i + 1} rate`} value={money(item.rate)} />
                </p>
              </div>
              <span className="text-[14px] font-semibold tabular-nums">
                <T
                  label={`Item ${i + 1} amount`}
                  value={money(item.qty * item.rate)}
                />
              </span>
            </div>
          ))}
        </S>
        <Z zone="after-items" />

        <S
          slot="notes"
          label="Notes"
          className="mt-4 max-w-[36ch] pb-5 text-[11px] leading-5 text-[#64748b]"
        >
          {layout.sections.notes ? (
            <p>
              <T slot="notes-body" label="Notes body" value={notesBody(layout)} />
            </p>
          ) : null}
          {layout.sections.terms ? (
            <p className="mt-3">
              <T slot="payment-terms-body" label="Payment terms body" value={termsBody()} />
            </p>
          ) : null}
          <FamilyDocumentExtras layout={layout} money={money} />
          <p className="mt-3 text-[10px] tabular-nums text-[#94a3b8]">
            {layout.sections.taxes
              ? `Subtotal ${money(subtotal)}${
                  layout.sections.discount ? ` · Disc. ${money(discount)}` : ""
                } · Tax ${money(tax)}`
              : `Subtotal ${money(subtotal)}`}
          </p>
          <Z zone="after-notes" />
        </S>
      </div>

      <S
        slot="totals"
        label="Totals"
        className="relative z-[1] mt-auto flex items-end justify-between gap-6 text-white"
        style={{
          backgroundColor: tokens.strong,
          padding: `22px ${pad.right}px 26px ${pad.left + 18}px`,
        }}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/45">
            <T slot="amount-due-label" label="Amount due label" value="Amount due" />
          </p>
          <p className="mt-2 text-[11px] text-white/40">
            {layout.currencyCode} · payable by{" "}
            <T slot="due-date" label="Due date" value={layout.dueDate} />
          </p>
          <FamilyDiscountLine
            layout={layout}
            money={money}
            className="mt-2 text-[11px] text-white/55 tabular-nums"
          />
        </div>
        <div className="flex items-end gap-3">
          <span
            className="mb-2 inline-block size-2.5 shrink-0"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <p className="font-[family-name:var(--font-instrument-serif)] text-[44px] italic leading-none tracking-[-0.03em] tabular-nums">
            <T slot="amount-due" label="Amount due" value={money(total)} />
          </p>
        </div>
      </S>
      <Z zone="after-totals" />
      <Z zone="end" />
    </div>
  )
}

function EditorialFamily({
  layout,
  pad,
  pageH,
}: {
  layout: GeneratedLayout
  pad: Pad
  pageH: number
}) {
  const { subtotal, tax, total, money } = totalsOf(layout)
  const tokens = usePaint()
  const mast = Math.round(pageH * 0.22)

  return (
    <div
      className="relative flex min-h-full flex-col"
      style={{ minHeight: pageH, backgroundColor: tokens.page, color: tokens.text, fontFamily: tokens.bodyFont }}
    >
      <S
        slot="header"
        label="Header"
        className="relative overflow-hidden"
        style={{
          minHeight: mast,
          backgroundColor: tokens.primary,
          color: tokens.page,
          padding: `${pad.top + 4}px ${pad.right}px 18px ${pad.left}px`,
        }}
      >
        <p
          className="pointer-events-none absolute -right-1 bottom-[-18px] select-none font-[family-name:var(--font-newsreader)] text-[120px] italic leading-none text-white/[0.08]"
          aria-hidden
        >
          {invoiceSuffix(layout.documentNumber)}
        </p>
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <InvoiceBrandMark layout={layout} family="editorial" onDark />
            <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.14em] text-white/70">
              <T slot="document-number" label="Document number" value={layout.documentNumber} />
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-instrument-serif)] text-[52px] italic leading-[0.9] tracking-[-0.03em]">
              <T slot="document-type" label="Document type" value={layout.documentType} />
            </p>
            <p className="mt-3 font-[family-name:var(--font-newsreader)] text-[14px] tracking-[0.04em]">
              <T slot="business-name" label="Business name" value={layout.businessName} />
            </p>
          </div>
        </div>
      </S>

      <div
        className="flex flex-1 flex-col"
        style={{
          padding: `22px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
        }}
      >
        <S
          slot="billing-details"
          label="Billing details"
          className="grid grid-cols-[1.3fr_0.7fr] gap-8"
        >
          <div>
            <p className="font-[family-name:var(--font-geist-sans)] text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8a7a6b]">
              <T slot="prepared-for" label="Prepared for" value="Prepared for" />
            </p>
            <p className="mt-2 font-[family-name:var(--font-newsreader)] text-[26px] leading-tight break-words">
              <T slot="client-name" label="Client name" value={layout.clientName} />
            </p>
            <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-[11px] text-[#6b5e52]">
              <T slot="client-address-2" label="Client address line 2" value={CLIENT_LINE_2} />
            </p>
          </div>
          <div className="font-[family-name:var(--font-geist-sans)] text-[11px]">
            <div className="flex justify-between border-b border-[#1c1410]/15 py-1.5">
              <span className="text-[#8a7a6b]">
                <T slot="issued-label" label="Issued label" value="Issued" />
              </span>
              <T slot="issue-date" label="Issue date" value={layout.issueDate} />
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#8a7a6b]">
                <T slot="due-label" label="Due label" value="Due" />
              </span>
              <span className="font-semibold">
                <T slot="due-date" label="Due date" value={layout.dueDate} />
              </span>
            </div>
          </div>
        </S>

        <S slot="line-items" label="Line items" className="mt-8">
          {layout.lineItems.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[28px_1fr_88px] gap-3 border-t border-[#1c1410]/12 py-3"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[#8a7a6b]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-newsreader)] text-[16px] leading-snug break-words">
                  <T
                    label={`Item ${i + 1} description`}
                    value={item.description}
                  />
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-geist-sans)] text-[10px] text-[#8a7a6b]">
                  <T label={`Item ${i + 1} qty`} value={String(item.qty)} /> ×{" "}
                  <T label={`Item ${i + 1} rate`} value={money(item.rate)} />
                </p>
              </div>
              <p className="text-right font-[family-name:var(--font-newsreader)] text-[16px] tabular-nums">
                <T
                  label={`Item ${i + 1} amount`}
                  value={money(item.qty * item.rate)}
                />
              </p>
            </div>
          ))}
        </S>
        <Z zone="after-items" />

        <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-6 pt-8">
          <S
            slot="notes"
            label="Notes"
            className="max-w-[280px] font-[family-name:var(--font-newsreader)] text-[12px] italic leading-5 text-[#6b5e52]"
          >
            {layout.sections.notes ? (
              <T slot="notes-body" label="Notes body" value={notesBody(layout)} />
            ) : null}
            {layout.sections.terms ? (
              <p className="mt-3 not-italic font-[family-name:var(--font-geist-sans)] text-[10px]">
                <T slot="payment-terms-body" label="Payment terms body" value={termsBody()} />
              </p>
            ) : null}
            <FamilyDocumentExtras layout={layout} money={money} />
          </S>
          <S slot="totals" label="Totals" className="text-right">
            {layout.sections.taxes ? (
              <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-[#8a7a6b]">
                {money(subtotal)} + tax {money(tax)}
              </p>
            ) : null}
            <FamilyDiscountLine
              layout={layout}
              money={money}
              className="font-[family-name:var(--font-geist-sans)] text-[10px] text-[#8a7a6b]"
            />
            <p
              className="font-[family-name:var(--font-instrument-serif)] text-[42px] italic leading-none tabular-nums"
              style={{ color: tokens.primary }}
            >
              <T slot="amount-due" label="Amount due" value={money(total)} />
            </p>
          </S>
        </div>
        <Z zone="after-notes" />
        <Z zone="after-totals" />
        <Z zone="end" />
      </div>
    </div>
  )
}

function SwissFamily({
  layout,
  pad,
  pageH,
}: {
  layout: GeneratedLayout
  pad: Pad
  pageH: number
}) {
  const { subtotal, discount, tax, total, money } = totalsOf(layout)
  const tokens = usePaint()
  const red = tokens.primary

  return (
    <div
      className="relative min-h-full"
      style={{
        minHeight: pageH,
        backgroundColor: tokens.page,
        color: tokens.text,
        fontFamily: tokens.bodyFont,
      }}
    >
      <div className="pointer-events-none absolute left-3 top-3 size-3 border-l border-t border-[#0a0a0a]" />
      <div className="pointer-events-none absolute right-3 top-3 size-3 border-r border-t border-[#0a0a0a]" />
      <div className="pointer-events-none absolute bottom-3 left-3 size-3 border-b border-l border-[#0a0a0a]" />
      <div className="pointer-events-none absolute bottom-3 right-3 size-3 border-b border-r border-[#0a0a0a]" />

      <div
        style={{
          padding: `${pad.top + 8}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
        }}
      >
        <S slot="header" label="Header">
          <div className="flex items-end justify-between gap-4 border-b-4 border-[#0a0a0a] pb-3">
            <div className="flex min-w-0 items-end gap-3">
              <span
                className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium"
                style={{ color: red }}
              >
                01
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#525252]">
                  <T slot="identity-heading" label="Identity heading" value="Identity" />
                </p>
                <p className="text-[22px] font-black uppercase leading-none tracking-[-0.04em] break-words">
                  <T slot="business-name" label="Business name" value={layout.businessName} />
                </p>
              </div>
            </div>
            <InvoiceBrandMark layout={layout} family="swiss" size="sm" />
          </div>
          <div className="h-1.5 w-full" style={{ backgroundColor: red }} />
          <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em]">
            <T slot="document-type" label="Document type" value={layout.documentType} />{" "}
            <T slot="document-number" label="Document number" value={layout.documentNumber} />
          </p>
        </S>

        <S
          slot="billing-details"
          label="Billing details"
          className="mt-4 grid grid-cols-4 border-2 border-[#0a0a0a]"
        >
          {[
            ["02 Client", layout.clientName, "Client name", "client-name"],
            ["03 Issued", layout.issueDate, "Issue date", "issue-date"],
            ["04 Due", layout.dueDate, "Due date", "due-date"],
            ["05 Ccy", layout.currencyCode, "Currency code", "currency-code"],
          ].map(([k, v, label, slot], i) => (
            <div
              key={k}
              className={cn("px-2 py-2", i < 3 && "border-r-2 border-[#0a0a0a]")}
            >
              <p
                className="font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.14em]"
                style={{ color: red }}
              >
                <T slot={`${slot}-caption`} label={`${label} caption`} value={k} />
              </p>
              <p className="mt-1 text-[11px] font-bold leading-tight break-words">
                <T slot={slot} label={label} value={String(v)} />
              </p>
            </div>
          ))}
        </S>

        <S slot="line-items" label="Line items" className="mt-4">
          <p
            className="mb-1 font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.16em]"
            style={{ color: red }}
          >
            <T slot="items-heading" label="Items heading" value="06 Items" />
          </p>
          <div className="border-2 border-[#0a0a0a]">
            <div className="grid grid-cols-[1fr_36px_70px_78px] bg-[#0a0a0a] px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white">
              <span>
                <T slot="description-column" label="Description column" value="Description" />
              </span>
              <span>
                <T slot="qty-column" label="Qty column" value="Qty" />
              </span>
              <span className="text-right">
                <T slot="rate-column" label="Rate column" value="Rate" />
              </span>
              <span className="text-right">
                <T slot="sum-column" label="Sum column" value="Sum" />
              </span>
            </div>
            {layout.lineItems.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[1fr_36px_70px_78px] px-2 py-2 text-[11px]",
                  i % 2 === 1 && "bg-white/70"
                )}
              >
                <span className="min-w-0 font-semibold break-words">
                  <T
                    label={`Item ${i + 1} description`}
                    value={item.description}
                  />
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px]">
                  <T label={`Item ${i + 1} qty`} value={String(item.qty)} />
                </span>
                <span className="text-right font-[family-name:var(--font-geist-mono)] text-[10px]">
                  <T label={`Item ${i + 1} rate`} value={money(item.rate)} />
                </span>
                <span className="text-right font-[family-name:var(--font-geist-mono)] text-[10px] font-bold">
                  <T
                    label={`Item ${i + 1} amount`}
                    value={money(item.qty * item.rate)}
                  />
                </span>
              </div>
            ))}
          </div>
        </S>
        <Z zone="after-items" />

        <div className="mt-4 flex items-end justify-between gap-4">
          <S
            slot="notes"
            label="Notes"
            className="max-w-[240px] text-[10px] leading-4 text-[#404040]"
          >
            {layout.sections.notes ? (
              <T slot="notes-body" label="Notes body" value={notesBody(layout)} />
            ) : null}
            {layout.sections.terms ? (
              <p className="mt-2">
                <T slot="payment-terms-body" label="Payment terms body" value={termsBody()} />
              </p>
            ) : null}
            <FamilyDocumentExtras layout={layout} money={money} />
          </S>
          <S
            slot="totals"
            label="Totals"
            className="min-w-[200px] border-2 px-3 py-3 text-right"
            style={{ borderColor: red }}
          >
            <p
              className="font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.18em]"
              style={{ color: red }}
            >
              07 Settlement
            </p>
            {layout.sections.taxes ? (
              <p className="mt-1 text-[10px] text-[#525252]">
                {money(subtotal)}
                {layout.sections.discount ? ` − ${money(discount)}` : ""} +{" "}
                {money(tax)}
              </p>
            ) : null}
            <FamilyDiscountLine
              layout={layout}
              money={money}
              className="mt-1 text-[10px] text-[#525252]"
            />
            <p
              className="text-[30px] font-black leading-none tracking-[-0.05em] tabular-nums"
              style={{ color: red }}
            >
              <T slot="amount-due" label="Amount due" value={money(total)} />
            </p>
          </S>
        </div>
        <Z zone="after-notes" />
        <Z zone="after-totals" />
        <Z zone="end" />
      </div>
    </div>
  )
}

function AtelierFamily({
  layout,
  pad,
  pageH,
}: {
  layout: GeneratedLayout
  pad: Pad
  pageH: number
}) {
  const { subtotal, tax, total, money } = totalsOf(layout)
  const tokens = usePaint()
  const forest = tokens.primary

  return (
    <div
      className="relative min-h-full"
      style={{ minHeight: pageH, backgroundColor: tokens.page, color: tokens.text, fontFamily: tokens.bodyFont }}
    >
      <div
        className="h-2.5 w-full"
        style={{ backgroundColor: forest }}
        aria-hidden
      />
      <div
        style={{
          padding: `${pad.top + 10}px ${pad.right + 6}px ${pad.bottom}px ${pad.left + 6}px`,
        }}
      >
        <S slot="header" label="Header" className="flex items-start justify-between gap-6">
          <InvoiceBrandMark layout={layout} family="atelier" size="md" />
          <div className="min-w-0 flex-1 text-right">
            <p className="font-[family-name:var(--font-instrument-serif)] text-[36px] italic leading-[0.95] tracking-[-0.03em] break-words">
              <T slot="business-name" label="Business name" value={layout.businessName} />
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.38em] text-[#8b7355]">
              <T slot="document-type" label="Document type" value={layout.documentType} />
              <span className="mx-2">·</span>
              <T slot="document-number" label="Document number" value={layout.documentNumber} />
            </p>
          </div>
        </S>

        <div className="mt-8 grid grid-cols-[0.38fr_0.62fr] gap-0">
          <S
            slot="billing-details"
            label="Billing details"
            className="border-r border-[#2a2620]/20 pr-5"
          >
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#8b7355]">
              <T slot="prepared-for" label="Prepared for" value="For" />
            </p>
            <p className="mt-2 font-[family-name:var(--font-newsreader)] text-[18px] leading-snug break-words">
              <T slot="client-name" label="Client name" value={layout.clientName} />
            </p>
            <p className="mt-2 text-[11px] text-[#6b6458]">
              <T slot="client-address-1" label="Client address line 1" value={CLIENT_LINE_1} />
            </p>
            <div className="mt-6 space-y-2 text-[11px]">
              <p>
                <span className="text-[#8b7355]">
                  <T slot="issued-label" label="Issued label" value="Issued" />{" "}
                </span>
                <T slot="issue-date" label="Issue date" value={layout.issueDate} />
              </p>
              <p>
                <span className="text-[#8b7355]">
                  <T slot="due-label" label="Due label" value="Due" />{" "}
                </span>
                <T slot="due-date" label="Due date" value={layout.dueDate} />
              </p>
            </div>
          </S>
          <S slot="line-items" label="Line items" className="pl-5">
            {layout.lineItems.map((item, i) => (
              <div
                key={i}
                className="flex justify-between gap-3 border-b border-[#2a2620]/12 py-2.5 text-[13px]"
              >
                <span className="min-w-0 font-[family-name:var(--font-newsreader)] break-words">
                  <T
                    label={`Item ${i + 1} description`}
                    value={item.description}
                  />
                  <span className="ml-2 font-[family-name:var(--font-geist-sans)] text-[10px] text-[#8b7355]">
                    ×<T label={`Item ${i + 1} qty`} value={String(item.qty)} />
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <T
                    label={`Item ${i + 1} amount`}
                    value={money(item.qty * item.rate)}
                  />
                </span>
              </div>
            ))}
          </S>
        </div>
        <Z zone="after-items" />

        <S
          slot="totals"
          label="Totals"
          className="mt-10 border-y-2 py-5"
          style={{ borderColor: forest }}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <S
              slot="notes"
              label="Notes"
              className="max-w-[52%] text-[11px] leading-5 text-[#5c564c]"
            >
              {layout.sections.terms ? (
                <p>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#8b7355]">
                    Terms
                  </span>
                  <br />
                  <T slot="payment-terms-body" label="Payment terms body" value={termsBody()} />
                </p>
              ) : null}
              {layout.sections.notes ? (
                <p className="mt-3 font-[family-name:var(--font-newsreader)] italic">
                  <T slot="notes-body" label="Notes body" value={notesBody(layout)} />
                </p>
              ) : null}
              <FamilyDocumentExtras layout={layout} money={money} />
            </S>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.22em] text-[#8b7355]">
                Balance due
              </p>
              {layout.sections.taxes ? (
                <p className="mt-1 text-[10px] text-[#6b6458]">
                  {money(subtotal)} · tax {money(tax)}
                </p>
              ) : null}
              <FamilyDiscountLine
                layout={layout}
                money={money}
                className="mt-1 text-[10px] text-[#6b6458]"
              />
              <p
                className="mt-1 font-[family-name:var(--font-instrument-serif)] text-[40px] leading-none tabular-nums"
                style={{ color: forest }}
              >
                <T slot="amount-due" label="Amount due" value={money(total)} />
              </p>
            </div>
          </div>
        </S>
        <Z zone="after-notes" />
        <Z zone="after-totals" />
        <Z zone="end" />
      </div>
    </div>
  )
}

function StatementFamily({
  layout,
  pad,
  pageH,
}: {
  layout: GeneratedLayout
  pad: Pad
  pageH: number
}) {
  const { subtotal, discount, tax, total, money } = totalsOf(layout)
  const tokens = usePaint()
  const field = Math.round(pageH * 0.4)

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        minHeight: pageH,
        backgroundColor: tokens.page,
        color: tokens.text,
        fontFamily: tokens.bodyFont,
      }}
    >
      <S
        slot="header"
        label="Header"
        className="relative overflow-hidden text-white"
        style={{
          minHeight: field,
          backgroundColor: tokens.primary,
          padding: `${pad.top}px ${pad.right}px 20px ${pad.left}px`,
        }}
      >
        <p
          className="pointer-events-none absolute -right-4 -top-6 select-none text-[140px] font-black leading-none tracking-[-0.08em] text-white/[0.12]"
          aria-hidden
        >
          {invoiceSuffix(layout.documentNumber)}
        </p>
        <div className="relative flex h-full min-h-[200px] flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <InvoiceBrandMark layout={layout} family="statement" size="lg" />
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                <T slot="document-type" label="Document type" value={layout.documentType} />
              </p>
              <p className="mt-1 text-[12px] tabular-nums text-white/85">
                <T slot="document-number" label="Document number" value={layout.documentNumber} />
              </p>
            </div>
          </div>
          <div>
            <p className="text-[22px] font-semibold tracking-[-0.04em]">
              <T slot="business-name" label="Business name" value={layout.businessName} />
            </p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">
              <T slot="amount-due-label" label="Amount due label" value="Amount due" />
            </p>
            <p className="mt-1 text-[48px] font-black leading-none tracking-[-0.05em] tabular-nums">
              <T slot="amount-due" label="Amount due" value={money(total)} />
            </p>
          </div>
        </div>
      </S>

      <div
        className="flex flex-1 flex-col"
        style={{
          padding: `18px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
        }}
      >
        <S
          slot="billing-details"
          label="Billing details"
          className="flex items-end justify-between gap-4 border-b border-[#1c1917]/15 pb-3"
        >
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a8a29e]">
              Invoice to
            </p>
            <p className="mt-1 text-[18px] font-bold tracking-[-0.03em] break-words">
              <T slot="client-name" label="Client name" value={layout.clientName} />
            </p>
          </div>
          <p className="shrink-0 text-right text-[11px] text-[#78716c]">
            <T slot="due-label" label="Due label" value="Due" />{" "}
            <T slot="due-date" label="Due date" value={layout.dueDate} />
            <br />
            <T slot="issue-date" label="Issue date" value={layout.issueDate} />
          </p>
        </S>
        <S slot="line-items" label="Line items" className="mt-2">
          {layout.lineItems.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-3 border-b border-[#1c1917]/10 py-2.5 text-[13px]"
            >
              <span className="min-w-0 font-semibold break-words">
                <T
                  label={`Item ${i + 1} description`}
                  value={item.description}
                />
              </span>
              <span className="shrink-0 font-bold tabular-nums">
                <T
                  label={`Item ${i + 1} amount`}
                  value={money(item.qty * item.rate)}
                />
              </span>
            </div>
          ))}
        </S>
        <Z zone="after-items" />
        <S
          slot="notes"
          label="Notes"
          className="mt-auto pt-5 text-[10px] leading-4 text-[#78716c]"
        >
          {layout.sections.taxes ? (
            <p className="mb-2">
              {money(subtotal)}
              {layout.sections.discount ? ` − ${money(discount)}` : ""} + tax{" "}
              {money(tax)}
            </p>
          ) : null}
          <FamilyDiscountLine layout={layout} money={money} className="mb-2" />
          {layout.sections.notes ? (
            <T slot="notes-body" label="Notes body" value={notesBody(layout)} />
          ) : null}
          {layout.sections.terms ? (
            <p className="mt-2">
              <T slot="payment-terms-body" label="Payment terms body" value={termsBody()} />
            </p>
          ) : null}
          <FamilyDocumentExtras layout={layout} money={money} />
          <Z zone="after-notes" />
        </S>
        <Z zone="after-totals" />
        <Z zone="end" />
      </div>
    </div>
  )
}

function LedgerFamily({
  layout,
  pad,
  pageH,
}: {
  layout: GeneratedLayout
  pad: Pad
  pageH: number
}) {
  const { subtotal, discount, tax, total, money } = totalsOf(layout)
  const tokens = usePaint()
  const mint = tokens.primary

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        minHeight: pageH,
        backgroundColor: tokens.page,
        color: tokens.text,
        fontFamily: tokens.bodyFont,
      }}
    >
      <S
        slot="header"
        label="Header"
        className="flex items-start justify-between gap-4 border-b border-white/10"
        style={{
          padding: `${pad.top + 6}px ${pad.right}px 16px ${pad.left}px`,
        }}
      >
        <div className="min-w-0">
          <InvoiceBrandMark layout={layout} family="ledger" />
          <p className="mt-3 text-[22px] font-semibold tracking-[-0.04em] break-words">
            <T slot="business-name" label="Business name" value={layout.businessName} />
          </p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-white/45">
            <T slot="document-type" label="Document type" value={layout.documentType} />
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums"
            style={{ color: mint }}
          >
            <T slot="document-number" label="Document number" value={layout.documentNumber} />
          </p>
          <p className="mt-2 text-[10px] text-white/50">
            Due <T slot="due-date" label="Due date" value={layout.dueDate} />
          </p>
        </div>
      </S>

      <div
        className="flex flex-1 flex-col"
        style={{
          padding: `16px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
        }}
      >
        <S
          slot="billing-details"
          label="Billing details"
          className="grid grid-cols-3 gap-3 text-[11px]"
        >
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.16em] text-white/40">
              Counterparty
            </p>
            <p className="mt-1 font-medium break-words">
              <T slot="client-name" label="Client name" value={layout.clientName} />
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.16em] text-white/40">
              Issued
            </p>
            <p className="mt-1">
              <T slot="issue-date" label="Issue date" value={layout.issueDate} />
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.16em] text-white/40">
              Ccy
            </p>
            <p className="mt-1">
              <T slot="currency-code" label="Currency code" value={layout.currencyCode} />
            </p>
          </div>
        </S>

        <S slot="line-items" label="Line items" className="mt-5">
          {layout.lineItems.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] gap-3 border-t border-white/10 py-2.5 text-[12px]"
            >
              <span className="min-w-0 break-words">
                <T
                  label={`Item ${i + 1} description`}
                  value={item.description}
                />
                <span className="ml-2 font-[family-name:var(--font-geist-mono)] text-[10px] text-white/40">
                  <T label={`Item ${i + 1} qty`} value={String(item.qty)} /> ×{" "}
                  <T label={`Item ${i + 1} rate`} value={money(item.rate)} />
                </span>
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                <T
                  label={`Item ${i + 1} amount`}
                  value={money(item.qty * item.rate)}
                />
              </span>
            </div>
          ))}
        </S>
        <Z zone="after-items" />

        <S
          slot="totals"
          label="Totals"
          className="mt-auto border-t border-white/10 pt-4"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="text-[10px] leading-4 text-white/45">
              {layout.sections.notes ? (
                <T slot="notes-body" label="Notes body" value={notesBody(layout)} />
              ) : null}
              {layout.sections.terms ? (
                <p className="mt-2">
                  <T slot="payment-terms-body" label="Payment terms body" value={termsBody()} />
                </p>
              ) : null}
              <FamilyDocumentExtras layout={layout} money={money} onDark />
            </div>
            <div className="text-right">
              <p className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.16em] text-white/40">
                <T slot="amount-due-label" label="Amount due label" value="Amount due" />
              </p>
              {layout.sections.taxes ? (
                <p className="mt-1 text-[10px] text-white/40">
                  {money(subtotal)}
                  {layout.sections.discount ? ` − ${money(discount)}` : ""} +{" "}
                  {money(tax)}
                </p>
              ) : null}
              <p
                className="mt-1 text-[36px] font-semibold leading-none tracking-[-0.04em] tabular-nums"
                style={{ color: mint }}
              >
                <T slot="amount-due" label="Amount due" value={money(total)} />
              </p>
            </div>
          </div>
        </S>
        <Z zone="after-notes" />
        <Z zone="after-totals" />
        <Z zone="end" />
      </div>
    </div>
  )
}

export function InvoiceFamilyDocument({
  layout,
  pageProfile,
  customBoards,
}: {
  layout: GeneratedLayout
  pageProfile: DocumentPageProfile
  customBoards?: BrandBoard[]
}) {
  const family = normalizeLayoutStyle(layout.style)
  const pad = pageProfile.padding
  const pageH = pageProfile.heightPx
  const pageW = pageProfile.widthPx

  const body =
    family === "editorial" ? (
      <EditorialFamily layout={layout} pad={pad} pageH={pageH} />
    ) : family === "swiss" ? (
      <SwissFamily layout={layout} pad={pad} pageH={pageH} />
    ) : family === "atelier" ? (
      <AtelierFamily layout={layout} pad={pad} pageH={pageH} />
    ) : family === "statement" ? (
      <StatementFamily layout={layout} pad={pad} pageH={pageH} />
    ) : family === "ledger" ? (
      <LedgerFamily layout={layout} pad={pad} pageH={pageH} />
    ) : (
      <StudioFamily layout={layout} pad={pad} pageH={pageH} />
    )

  const tokens = resolveFamilyBrand(
    family,
    layout.brand ?? null,
    customBoards ?? [],
    layout.brandTheme
  )

  return (
    <BrandPaint.Provider value={tokens}>
      <div
        className="brand-board-surface overflow-hidden"
        style={{
          width: pageW,
          minHeight: pageH,
          ...brandCssVars(tokens),
          fontFamily: tokens.bodyFont,
        }}
      >
        {body}
      </div>
    </BrandPaint.Provider>
  )
}

export function paperFontForFamily(family: LayoutFamilyId): string {
  if (family === "editorial" || family === "atelier") {
    return "font-[family-name:var(--font-newsreader)]"
  }
  if (family === "ledger" || family === "swiss") {
    return "font-[family-name:var(--font-geist-sans)]"
  }
  return "font-[family-name:var(--font-geist-sans)]"
}
