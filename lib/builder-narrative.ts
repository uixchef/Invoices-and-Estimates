import type { GeneratedLayout, BuilderReceivedAnswer } from "@/lib/layout-builder-types"

/**
 * Lightweight markdown narrative the assistant "thinks" before generating. Kept
 * here so the live stream (panel) and the persisted turn snapshot (context) read
 * from a single source of truth. Stands in for streamed model reasoning.
 */
export function buildReasoning(prompt: string): string {
  const focus = prompt.trim().replace(/\s+/g, " ")

  return [
    focus
      ? `The user wants me to create ${focus.charAt(0).toLowerCase()}${focus.slice(1)}.`
      : "The user wants me to generate an invoice layout.",
    "",
    "Key requirements:",
    "- Translate the request into a structured invoice layout",
    "- Apply the selected medium's dimensions, spacing, and safe areas",
    "- Keep the sections clear: header, line items, totals, and notes",
    "",
    "I'll map this to the canvas using brand-safe defaults, then keep everything print-ready and editable.",
  ].join("\n")
}

/**
 * Reasoning shown after the user answers clarifying questions — the "next
 * thought" that follows the Received answers recap.
 */
export function buildPostReasoning(
  prompt: string,
  receivedAnswers: BuilderReceivedAnswer[]
): string {
  const focus = prompt.trim().replace(/\s+/g, " ")

  const answerLines = receivedAnswers.flatMap((item) =>
    item.values.map((value) => `- ${item.prompt}: ${value}`)
  )

  return [
    focus
      ? `Now that I have the user's clarifications, I'll finalize ${focus.charAt(0).toLowerCase()}${focus.slice(1)}.`
      : "Now that I have the user's clarifications, I'll finalize the invoice layout.",
    "",
    "Confirmed preferences:",
    ...answerLines,
    "",
    "Next I'll apply these to the canvas — structure sections, set typography and spacing for the medium, and keep totals and notes aligned with what they asked for.",
  ].join("\n")
}

const STYLE_LABEL: Record<GeneratedLayout["style"], string> = {
  minimal: "minimal",
  modern: "modern",
  classic: "classic",
  bold: "bold",
}

/**
 * The assistant's closing response once a layout settles — a Cursor-style recap
 * of what was built plus an invitation to refine. Derived from the resolved
 * layout so the summary always matches what's on the canvas.
 */
export function buildCompletionSummary(layout: GeneratedLayout): string {
  const itemCount = layout.lineItems.length
  const itemLabel = itemCount === 1 ? "line item" : "line items"
  const docLabel = layout.documentType.toLowerCase()

  const builtLines: string[] = []
  builtLines.push(
    layout.sections.logo
      ? "- Header with logo, business details, and document number"
      : "- Header with business details and document number"
  )
  builtLines.push(`- Bill-to block with issue and due dates`)
  builtLines.push(`- Itemised table with ${itemCount} ${itemLabel}`)
  if (layout.sections.taxes) {
    builtLines.push(
      `- Totals with tax at ${Math.round(layout.taxRate * 100)}% in ${layout.currencyCode}`
    )
  } else {
    builtLines.push(`- Totals summary in ${layout.currencyCode}`)
  }
  if (layout.sections.notes) {
    builtLines.push("- Notes section")
  }
  if (layout.sections.terms) {
    builtLines.push("- Payment terms")
  }

  const emphasisLine = layout.emphasis
    ? `I leaned the design toward **${layout.emphasis}**, as you asked.`
    : null

  return [
    `I've built a **${STYLE_LABEL[layout.style]} ${docLabel}** for **${layout.businessName}**.`,
    ...(emphasisLine ? ["", emphasisLine] : []),
    "",
    "What I set up:",
    ...builtLines,
    "",
    "It's print-ready and fully editable. Tell me what to change — colours, spacing, sections, or copy — and I'll update the layout.",
  ].join("\n")
}

/**
 * Next-step suggestions surfaced as clickable badges beneath the answer. Leads
 * with the sections the layout is missing (so a click meaningfully extends the
 * document), then rounds out with common refinements. Capped at four so the
 * badge stack stays scannable.
 */
export function buildRecommendations(layout: GeneratedLayout): string[] {
  const recs: string[] = []

  if (!layout.sections.logo) {
    recs.push("Add a logo to the header")
  }
  if (!layout.sections.taxes) {
    recs.push("Add a tax line to the totals")
  }
  if (!layout.sections.notes) {
    recs.push("Add a notes or thank-you message")
  }
  if (!layout.sections.terms) {
    recs.push("Include payment terms")
  }
  if (!layout.sections.discount) {
    recs.push("Add a discount row")
  }
  if (!layout.sections.onlinePayment) {
    recs.push("Add a 'Pay online' button")
  }
  if (!layout.sections.paymentDetails) {
    recs.push("Add bank and payment details")
  }

  // Generic enhancements backfill so there are always a few suggestions, even
  // when the layout already has every section.
  recs.push(
    "Switch to a bold, branded color scheme",
    "Add another line item",
    "Make it minimal and clean"
  )

  return recs.slice(0, 4)
}
