import { resolveFamilyBrand, type ResolvedFamilyBrand } from "@/lib/brand-boards"
import { findPayOnlineButton, findPaymentDetailsRoot } from "@/lib/document-actions"
import { demoPaymentDetails } from "@/lib/demo-payment"
import { invoiceTotals } from "@/lib/invoice-totals"
import type { DocumentPageProfile } from "@/lib/mediums-data"
import { normalizeLayoutStyle, type LayoutFamilyId } from "@/lib/layout-family"
import type {
  BuilderLayerStyle,
  GeneratedLayout,
  PlacedElement,
} from "@/lib/layout-builder-types"
import { PAGE_LAYER_LABEL } from "@/lib/layout-builder-types"
import { isHiddenLayer, withCopySuffix } from "@/lib/native-instance-id"
import { columnCountForKind } from "@/lib/placed-elements"

export type SerializeInvoiceInput = {
  layout: GeneratedLayout
  layerText?: Record<string, string>
  layerStyles?: Record<string, BuilderLayerStyle>
  hiddenLayers?: string[]
  layerDuplicates?: Record<string, number>
  placedElements?: PlacedElement[]
  brandTokens?: ResolvedFamilyBrand
  pageProfile: DocumentPageProfile
}

export type SerializedInvoice = {
  html: string
  ranges: Record<string, [number, number]>
  family: LayoutFamilyId
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function cssFont(value: string): string {
  return value.replace(/var\(--font-[^)]+\),\s*/g, "")
}

function money(layout: GeneratedLayout, amount: number): string {
  return `${layout.currencySymbol}${amount.toFixed(2)}`
}

function styleAttr(style: BuilderLayerStyle | undefined): string {
  if (!style) {
    return ""
  }
  const parts: string[] = []
  if (style.color) parts.push(`color:${style.color}`)
  if (style.backgroundColor) parts.push(`background:${style.backgroundColor}`)
  if (style.fontFamily) parts.push(`font-family:${cssFont(style.fontFamily)}`)
  if (style.fontSize) parts.push(`font-size:${style.fontSize}px`)
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight}`)
  if (style.bold) parts.push("font-weight:700")
  if (style.fontStyle === "italic") parts.push("font-style:italic")
  if (style.underline) parts.push("text-decoration:underline")
  if (style.textAlign) parts.push(`text-align:${style.textAlign}`)
  if (style.letterSpacing) parts.push(`letter-spacing:${style.letterSpacing}px`)
  if (style.lineHeight) parts.push(`line-height:${style.lineHeight}`)
  if (style.paddingTop) parts.push(`padding-top:${style.paddingTop}px`)
  if (style.paddingRight) parts.push(`padding-right:${style.paddingRight}px`)
  if (style.paddingBottom) parts.push(`padding-bottom:${style.paddingBottom}px`)
  if (style.paddingLeft) parts.push(`padding-left:${style.paddingLeft}px`)
  if (style.marginTop) parts.push(`margin-top:${style.marginTop}px`)
  if (style.width) parts.push(`width:${style.width}px`)
  if (style.height) parts.push(`height:${style.height}px`)
  if (style.borderColor && (style.borderTopWidth || style.borderBottomWidth)) {
    parts.push(`border-color:${style.borderColor}`)
  }
  if (style.borderTopWidth) {
    parts.push(`border-top:${style.borderTopWidth}px ${style.borderStyle ?? "solid"} ${style.borderColor ?? "currentColor"}`)
  }
  const radius = style.radiusTopLeft
  if (radius) parts.push(`border-radius:${radius}px`)
  return parts.length ? ` style="${parts.join(";")}"` : ""
}

function portableImageSrc(src: string | undefined): {
  src: string
  portable: boolean
} {
  const value = src?.trim() ?? ""
  if (!value || value.startsWith("blob:")) {
    return { src: "", portable: false }
  }
  return { src: value, portable: true }
}

export function serializeInvoiceDocument(
  input: SerializeInvoiceInput
): SerializedInvoice {
  const layout = input.layout
  const family = normalizeLayoutStyle(layout.style)
  const tokens =
    input.brandTokens ??
    resolveFamilyBrand(family, layout.brand ?? null, [], layout.brandTheme)
  const layerText = input.layerText ?? {}
  const layerStyles = input.layerStyles ?? {}
  const hidden = input.hiddenLayers ?? []
  const duplicates = input.layerDuplicates ?? {}
  const placed = (input.placedElements ?? layout.blocks ?? []).filter(
    (element) => !isHiddenLayer(hidden, element.id)
  )
  const totals = invoiceTotals(layout)
  const payment = layout.payment ?? demoPaymentDetails(layout)
  const page = input.pageProfile
  const pageStyle = layerStyles[PAGE_LAYER_LABEL]

  const lines: string[] = []
  const ranges: Record<string, [number, number]> = {}

  const add = (text: string) => {
    lines.push(text)
  }
  const text = (label: string, fallback: string) =>
    escapeHtml(layerText[label] ?? fallback)
  const hiddenLabel = (label: string) => isHiddenLayer(hidden, label)

  const tag = (label: string, html: string) => {
    const index = lines.length
    lines.push(html)
    ranges[label] = [index, index]
  }

  const block = (label: string, fn: () => void) => {
    const start = lines.length
    fn()
    ranges[label] = [start, lines.length - 1]
  }

  const copies = (label: string, render: (id: string) => void) => {
    render(label)
    const extra = duplicates[label] ?? 0
    for (let index = 0; index < extra; index += 1) {
      render(withCopySuffix(label, index + 1))
    }
  }

  const zoneBlocks = (zone: PlacedElement["zone"]) =>
    placed.filter((element) => !element.parentId && element.zone === zone)

  const childrenOf = (parentId: string, slot?: number) =>
    placed.filter(
      (element) =>
        element.parentId === parentId &&
        (slot === undefined || (element.slot ?? 0) === slot)
    )

  const renderPlaced = (element: PlacedElement, indent: string): void => {
    const kind = element.kind
    const content = escapeHtml(layerText[element.id] ?? element.content)
    const extra = styleAttr(layerStyles[element.id])
    if (kind === "heading") {
      add(`${indent}<h2 class="placed-heading"${extra}>${content}</h2>`)
      return
    }
    if (kind === "paragraph") {
      add(`${indent}<p class="placed-paragraph"${extra}>${content}</p>`)
      return
    }
    if (kind === "list") {
      add(`${indent}<ul class="placed-list"${extra}>`)
      for (const item of content.split("\n").filter(Boolean)) {
        add(`${indent}  <li>${item}</li>`)
      }
      add(`${indent}</ul>`)
      return
    }
    if (kind === "quote") {
      add(`${indent}<blockquote class="placed-quote"${extra}>${content}</blockquote>`)
      return
    }
    if (kind === "divider") {
      add(`${indent}<hr class="placed-divider"${extra} />`)
      return
    }
    if (kind === "spacer") {
      add(`${indent}<div class="placed-spacer" style="height:${layerStyles[element.id]?.height ?? 24}px"></div>`)
      return
    }
    if (kind === "button") {
      const href = element.href ?? "#"
      add(
        `${indent}<a class="placed-button"${extra} href="${escapeHtml(href)}">${content}</a>`
      )
      return
    }
    if (kind === "image") {
      const raw = layerStyles[element.id]?.backgroundImage
      const image = portableImageSrc(raw)
      const alt = escapeHtml(layerStyles[element.id]?.imageAlt ?? element.label)
      if (!image.portable) {
        add(`${indent}<!-- image source is session-local and was omitted -->`)
        add(`${indent}<div class="placed-image-placeholder" role="img" aria-label="${alt}"></div>`)
        return
      }
      add(
        `${indent}<img class="placed-image" src="${escapeHtml(image.src)}" alt="${alt}"${extra} />`
      )
      return
    }
    if (kind === "table" || element.bindToLineItems) {
      add(`${indent}<table class="placed-table"${extra}><tbody>`)
      for (const item of layout.lineItems) {
        add(
          `${indent}  <tr><td>${escapeHtml(item.description)}</td><td class="num">${item.qty}</td><td class="num">${money(layout, item.rate)}</td></tr>`
        )
      }
      add(`${indent}</tbody></table>`)
      return
    }
    const columns = columnCountForKind(kind)
    if (kind === "container" || columns) {
      const count = columns ?? 1
      const layoutStyle = columns
        ? `display:grid;grid-template-columns:repeat(${count},minmax(0,1fr));gap:16px`
        : ""
      const merged = extra
        ? layoutStyle
          ? extra.replace(/ style="/, ` style="${layoutStyle};`)
          : extra
        : layoutStyle
          ? ` style="${layoutStyle}"`
          : ""
      add(
        `${indent}<div class="${kind === "container" ? "placed-container" : "placed-columns"}"${merged}>`
      )
      if (columns) {
        for (let slot = 0; slot < count; slot += 1) {
          add(`${indent}  <div class="placed-column">`)
          for (const child of childrenOf(element.id, slot)) {
            renderPlaced(child, `${indent}    `)
          }
          add(`${indent}  </div>`)
        }
      } else {
        for (const child of childrenOf(element.id)) {
          renderPlaced(child, `${indent}  `)
        }
      }
      add(`${indent}</div>`)
    }
  }

  const renderZone = (zone: PlacedElement["zone"]) => {
    for (const element of zoneBlocks(zone)) {
      renderPlaced(element, "      ")
    }
  }

  const notes =
    layerText.Notes ??
    (layout.sections.notes
      ? "Payment is due within 14 days of issue. Thank you for your business."
      : "")
  const terms = layerText.Terms ?? "Net 14. Late invoices may accrue a service fee."

  add(`<!doctype html>`)
  add(`<html lang="en">`)
  add(`  <head>`)
  add(`    <meta charset="utf-8" />`)
  add(
    `    <title>${escapeHtml(layout.documentType)} · ${escapeHtml(layout.businessName)}</title>`
  )
  add(`    <style>`)
  add(`      :root {`)
  add(`        --bb-page: ${tokens.page};`)
  add(`        --bb-text: ${tokens.text};`)
  add(`        --bb-muted: ${tokens.muted};`)
  add(`        --bb-primary: ${tokens.primary};`)
  add(`        --bb-accent: ${tokens.accent};`)
  add(`        --bb-strong: ${tokens.strong};`)
  add(`        --bb-border: ${tokens.border};`)
  add(`      }`)
  add(
    `      * { box-sizing: border-box; }`
  )
  add(
    `      body { margin: 0; background: #f3f4f6; color: var(--bb-text); font-family: ${cssFont(tokens.bodyFont)}; }`
  )
  add(
    `      h1, h2, .masthead { font-family: ${cssFont(tokens.headingFont)}; }`
  )
  add(
    `      .invoice { width: ${page.widthPx}px; min-height: ${page.heightPx}px; margin: 0 auto; background: ${pageStyle?.backgroundColor ?? tokens.page}; color: var(--bb-text); position: relative; overflow: hidden; }`
  )
  add(`      .muted { color: var(--bb-muted); }`)
  add(`      table { width: 100%; border-collapse: collapse; }`)
  add(`      th, td { padding: 8px 0; text-align: left; }`)
  add(`      .num { text-align: right; font-variant-numeric: tabular-nums; }`)
  add(`      .total { color: var(--bb-primary); font-weight: 700; }`)
  add(
    `      .pay-online { display: inline-flex; align-items: center; background: var(--bb-primary); color: #fff; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none; }`
  )
  add(`      .studio-rail { position: absolute; inset: 0 auto 0 0; width: 14px; background: var(--bb-primary); }
      .editorial-rule { height: 8px; background: var(--bb-primary); }
      .atelier-mark { height: 2px; background: var(--bb-strong); }`)
  add(`      .statement-field { background: var(--bb-primary); color: #fff; }`)
  add(`      .swiss-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11px; }`)
  add(`      .ledger-shell { background: #0b1220; color: #e2e8f0; }`)
  add(`      @media print { body { background: #fff; } .invoice { page-break-after: always; } }`)
  add(`    </style>`)
  add(`  </head>`)
  add(`  <body>`)
  add(
    `    <article class="invoice invoice-${family}" data-family="${family}">`
  )

  if (pageStyle?.watermarkType === "text" && pageStyle.watermarkText) {
    add(
      `      <div class="watermark" aria-hidden="true">${escapeHtml(pageStyle.watermarkText)}</div>`
    )
  }

  const pad = page.padding

  if (family === "statement") {
    block("Header", () => {
      add(`      <header class="statement-field" style="padding:${pad.top}px ${pad.right}px 24px ${pad.left}px;min-height:${Math.round(page.heightPx * 0.4)}px">`)
      if (!hiddenLabel("Business name")) {
        copies("Business name", (id) =>
          tag(id, `        <p class="masthead"${styleAttr(layerStyles[id])}>${text(id, layout.businessName)}</p>`)
        )
      }
      tag("Document type", `        <p>${text("Document type", layout.documentType)}</p>`)
      tag("Document number", `        <p>${text("Document number", layout.documentNumber)}</p>`)
      tag("Amount due label", `        <p>${text("Amount due label", "Amount due")}</p>`)
      tag("Amount due", `        <p class="statement-amount">${text("Amount due", money(layout, totals.total))}</p>`)
      add(`      </header>`)
    })
  } else if (family === "swiss") {
    block("Header", () => {
      add(`      <header style="padding:${pad.top}px ${pad.right}px 16px ${pad.left}px">`)
      add(`        <div class="swiss-meta">`)
      tag("Document type", `          <p>${text("Document type", layout.documentType)}</p>`)
      tag("Document number", `          <p>${text("Document number", layout.documentNumber)}</p>`)
      tag("Issue date", `          <p>${text("Issue date", layout.issueDate)}</p>`)
      tag("Due date", `          <p>${text("Due date", layout.dueDate)}</p>`)
      add(`        </div>`)
      if (!hiddenLabel("Business name")) {
        copies("Business name", (id) =>
          tag(id, `        <h1${styleAttr(layerStyles[id])}>${text(id, layout.businessName)}</h1>`)
        )
      }
      add(`      </header>`)
    })
  } else if (family === "ledger") {
    add(`      <div class="ledger-shell" style="padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px;min-height:${page.heightPx}px">`)
    block("Header", () => {
      add(`      <header>`)
      if (!hiddenLabel("Business name")) {
        copies("Business name", (id) =>
          tag(id, `        <h1${styleAttr(layerStyles[id])}>${text(id, layout.businessName)}</h1>`)
        )
      }
      tag("Document type", `        <p>${text("Document type", layout.documentType)}</p>`)
      add(`      </header>`)
    })
  } else {
    if (family === "studio") {
      add(`      <div class="studio-rail" aria-hidden="true"></div>`)
    }
    if (family === "editorial") {
      add(`      <div class="editorial-rule" aria-hidden="true"></div>`)
    }
    if (family === "atelier") {
      add(`      <div class="atelier-mark" aria-hidden="true"></div>`)
    }
    block("Header", () => {
      add(
        `      <header style="padding:${pad.top}px ${pad.right}px 16px ${family === "studio" ? pad.left + 18 : pad.left}px">`
      )
      if (!hiddenLabel("Business name")) {
        copies("Business name", (id) =>
          tag(
            id,
            `        <h1 class="masthead"${styleAttr(layerStyles[id])}>${text(id, layout.businessName)}</h1>`
          )
        )
      }
      if (!hiddenLabel("Document type")) {
        tag(
          "Document type",
          `        <p>${text("Document type", layout.documentType)}</p>`
        )
      }
      tag(
        "Document number",
        `        <p class="muted">${text("Document number", layout.documentNumber)}</p>`
      )
      add(`      </header>`)
    })
  }

  if (!hiddenLabel("Billing details")) {
    block("Billing details", () => {
      add(`      <section class="billing">`)
      tag("Bill to label", `        <p class="muted">${text("Bill to label", family === "studio" ? "Invoice to" : "Bill to")}</p>`)
      copies("Client name", (id) =>
        tag(id, `        <p${styleAttr(layerStyles[id])}>${text(id, layout.clientName)}</p>`)
      )
      tag("Issue date", `        <p>${text("Issued label", "Issued")} ${text("Issue date", layout.issueDate)}</p>`)
      tag("Due date", `        <p>${text("Due label", "Due")} ${text("Due date", layout.dueDate)}</p>`)
      add(`      </section>`)
    })
  }
  renderZone("after-billing")

  if (layout.sections.items && !hiddenLabel("Items table")) {
    add(`      <table class="line-items">`)
    add(`        <thead><tr>`)
    tag("Description header", `          <th>${text("Description header", "Description")}</th>`)
    tag("Qty header", `          <th class="num">${text("Qty header", "Qty")}</th>`)
    tag("Rate header", `          <th class="num">${text("Rate header", "Rate")}</th>`)
    tag("Amount header", `          <th class="num">${text("Amount header", "Amount")}</th>`)
    add(`        </tr></thead>`)
    add(`        <tbody>`)
    layout.lineItems.forEach((item, index) => {
      const label = `Item ${index + 1}`
      block(label, () => {
        add(`          <tr>`)
        tag(
          `${label} description`,
          `            <td>${text(`${label} description`, item.description)}</td>`
        )
        add(`            <td class="num">${item.qty}</td>`)
        add(`            <td class="num">${money(layout, item.rate)}</td>`)
        add(`            <td class="num">${money(layout, item.qty * item.rate)}</td>`)
        add(`          </tr>`)
      })
    })
    add(`        </tbody>`)
    add(`      </table>`)
  }
  renderZone("after-items")

  if (!hiddenLabel("Totals")) {
    block("Totals", () => {
      add(`      <section class="totals">`)
      tag("Subtotal label", `        <p>${text("Subtotal label", "Subtotal")} <span class="num">${money(layout, totals.subtotal)}</span></p>`)
      if (layout.sections.discount) {
        tag(
          "Discount label",
          `        <p>${text("Discount label", "Discount")} <span class="num">−${money(layout, totals.discount)}</span></p>`
        )
      }
      if (layout.sections.taxes) {
        tag("Tax label", `        <p>${text("Tax label", "Tax")} <span class="num">${money(layout, totals.tax)}</span></p>`)
      }
      if (family !== "statement") {
        tag(
          "Amount due",
          `        <p class="total">${text("Amount due label", "Amount due")} <span>${text("Amount due", money(layout, totals.total))}</span></p>`
        )
      }
      add(`      </section>`)
    })
  }
  renderZone("after-totals")

  if (layout.sections.notes && notes && !hiddenLabel("Notes")) {
    block("Notes", () => {
      add(`      <section class="notes">`)
      tag("Notes", `        <p>${text("Notes", notes)}</p>`)
      add(`      </section>`)
    })
  }
  renderZone("after-notes")

  if (layout.sections.terms && !hiddenLabel("Terms")) {
    block("Terms", () => {
      add(`      <section class="terms">`)
      tag("Terms", `        <p class="muted">${text("Terms", terms)}</p>`)
      add(`      </section>`)
    })
  }

  const hasPlacedPay = findPayOnlineButton(placed)
  const hasPlacedPayment = findPaymentDetailsRoot(placed)
  if (layout.sections.onlinePayment && !hasPlacedPay) {
    tag(
      "Pay online button",
      `      <p><a class="pay-online" href="${escapeHtml(payment.payUrl)}">${text("Pay online button", payment.payLabel)}</a></p>`
    )
    tag(
      "Online payment link",
      `      <p class="muted">${text("Online payment link", payment.payUrl)}</p>`
    )
  }
  if (layout.sections.paymentDetails && !hasPlacedPayment) {
    block("Payment details", () => {
      add(`      <section class="payment-details">`)
      tag("Payment details heading", `        <h2>${text("Payment details heading", "Payment details")}</h2>`)
      tag("Payment bank name", `        <p>${text("Payment bank name", payment.bankName)}</p>`)
      tag("Payment account name", `        <p>${text("Payment account name", payment.accountName)}</p>`)
      tag(
        "Payment account number",
        `        <p>${text("Payment account number", `Account ${payment.accountNumber}`)}</p>`
      )
      tag(
        "Payment routing number",
        `        <p>${text("Payment routing number", `Routing ${payment.routingNumber}`)}</p>`
      )
      add(`      </section>`)
    })
  }
  renderZone("end")

  if (family === "ledger") {
    add(`      </div>`)
  }
  add(`    </article>`)
  add(`  </body>`)
  add(`</html>`)

  return { html: lines.join("\n"), ranges, family }
}

export function serializedHtmlContainsEditorChrome(html: string): boolean {
  return (
    html.includes("data-el=") ||
    html.includes("VisualEditSelector") ||
    html.includes("builder-") ||
    html.includes("Describe your edit")
  )
}
