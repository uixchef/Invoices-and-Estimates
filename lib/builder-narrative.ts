import type { GeneratedLayout, BuilderReceivedAnswer } from "@/lib/layout-builder-types"
import { normalizeLayoutStyle, resolveInitialVisualStyle, type LayoutFamilyId } from "@/lib/layout-family"
import { REFERENCE_RECREATE_PROMPT } from "@/lib/composer-copy"
import {
  documentActionUnderstanding,
  matchDocumentAction,
} from "@/lib/document-actions"
import {
  hasBoldBrandedAccent,
  isBoldBrandedColorSchemePrompt,
} from "@/lib/layout-prompt-edit"

export type NarrativePhase = "interpret" | "decide" | "implement"

export type NarrativeMutation =
  | "discount"
  | "onlinePayment"
  | "paymentDetails"
  | "boldBrand"
  | "lineItem"
  | "minimal"
  | "other"

export type NarrativeRequest = {
  prompt: string
  phase?: NarrativePhase
  hasReference?: boolean
  isFollowUp?: boolean
  paperName?: string
  family?: LayoutFamilyId | string
  receivedAnswers?: BuilderReceivedAnswer[] | null
}

export function detectMutation(prompt: string): NarrativeMutation | null {
  const text = prompt.toLowerCase()
  if (!text.trim()) {
    return null
  }
  if (isBoldBrandedColorSchemePrompt(prompt) || isBoldBrandedColorSchemePrompt(text)) {
    return "boldBrand"
  }
  if (/\bdiscount\b/.test(text)) {
    return "discount"
  }
  if (/\bpay online\b|\bpayment button\b|\bpay now\b/.test(text)) {
    return "onlinePayment"
  }
  if (/\bbank\b|\bpayment details\b/.test(text)) {
    return "paymentDetails"
  }
  if (/\banother line item\b|\badd (an? )?line item\b/.test(text)) {
    return "lineItem"
  }
  if (/\bminimal\b|\bclean\b/.test(text) && /\bmake it\b/.test(text)) {
    return "minimal"
  }
  return null
}

export function isReferenceOnlyPrompt(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return true
  }
  return (
    trimmed === REFERENCE_RECREATE_PROMPT ||
    /^recreate this\.?$/i.test(trimmed) ||
    /^generate a layout from \d+ reference images?\.?$/i.test(trimmed)
  )
}

function paperOf(request: NarrativeRequest): string {
  return request.paperName?.trim() || "A4"
}

function familyDisplay(family: LayoutFamilyId): string {
  if (family === "swiss") {
    return "Swiss grid"
  }
  return family.charAt(0).toUpperCase() + family.slice(1)
}

function familyOf(request: NarrativeRequest): LayoutFamilyId {
  if (request.family) {
    return normalizeLayoutStyle(request.family)
  }
  return resolveInitialVisualStyle(request.prompt, undefined)
}

function namedColor(prompt: string): string | null {
  const text = prompt.toLowerCase()
  const colors = [
    "blue",
    "cobalt",
    "navy",
    "indigo",
    "purple",
    "green",
    "red",
    "orange",
    "teal",
    "black",
  ]
  return colors.find((color) => new RegExp(`\\b${color}\\b`).test(text)) ?? null
}

function wantsMinimal(prompt: string): boolean {
  return /\b(minimal|minimalist|clean|simple|restrained)\b/i.test(prompt)
}

function wantsPremium(prompt: string): boolean {
  return /\b(premium|polished|confident|strong typography|brand(?:ed|ing)?)\b/i.test(
    prompt
  )
}

function isStudioAudience(prompt: string): boolean {
  return /\b(creative studio|studio|agency|consulting)\b/i.test(prompt)
}

function wordCount(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length
}

function joinBlocks(blocks: Array<string | null | undefined>): string {
  return blocks
    .map((block) => block?.trim())
    .filter((block): block is string => Boolean(block))
    .join("\n\n")
}

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n")
}

export function buildTodoLabels(request: NarrativeRequest): string[] {
  const mutation = request.isFollowUp ? detectMutation(request.prompt) : null

  if (mutation === "discount") {
    return ["Add the discount row", "Recalculate dependent totals"]
  }
  if (mutation === "onlinePayment") {
    return ["Place the payment action", "Keep it editable in the layout"]
  }
  if (mutation === "paymentDetails") {
    return ["Add structured payment details", "Keep them editable on the page"]
  }
  if (mutation === "boldBrand") {
    return ["Shift the accent", "Keep this layout"]
  }
  if (mutation === "lineItem") {
    return ["Add the extra line item", "Recalculate the totals"]
  }
  if (mutation === "minimal") {
    return ["Simplify the visual system", "Preserve the document structure"]
  }
  if (request.isFollowUp) {
    return ["Apply the edit", "Keep the rest of the document stable"]
  }

  if (request.hasReference && !isReferenceOnlyPrompt(request.prompt)) {
    return [
      "Read the reference structure",
      "Keep the composition, change the styling",
      "Rebuild editable content",
      "Apply the requested direction",
    ]
  }

  if (request.hasReference) {
    return [
      "Read the reference structure",
      "Map the major regions",
      "Rebuild editable content",
      "Match the visual hierarchy",
      "Validate the final document",
    ]
  }

  const family = familyOf(request)
  if (wantsPremium(request.prompt) || isStudioAudience(request.prompt)) {
    return [
      "Define the invoice hierarchy",
      "Establish the brand direction",
      "Structure client and service information",
      "Calculate totals and payment details",
      "Finish print-safe spacing",
    ]
  }

  if (wordCount(request.prompt) < 12) {
    return [
      "Set up the invoice structure",
      "Place billing and line items",
      "Balance totals and spacing",
    ]
  }

  if (family === "studio") {
    return [
      "Define the invoice hierarchy",
      "Establish the brand direction",
      "Structure client and service information",
      "Calculate totals and payment details",
      "Finish print-safe spacing",
    ]
  }

  return [
    "Lock the document structure",
    "Set typography and hierarchy",
    "Build services and totals",
    "Finish print-safe spacing",
  ]
}

function interpretGenerate(request: NarrativeRequest): string {
  const prompt = request.prompt.trim()
  const family = familyOf(request)
  const color = namedColor(prompt)
  const paper = paperOf(request)

  if (!prompt) {
    return `I’ll put together a practical ${paper} invoice with a clear billing structure.`
  }

  if (isStudioAudience(prompt) && (wantsPremium(prompt) || color === "blue")) {
    return `You’re looking for a premium invoice for a creative studio, with a confident ${color ?? "blue"} identity and strong information hierarchy.`
  }

  if (wantsMinimal(prompt) && !request.hasReference) {
    return `You’re looking for a restrained ${paper} invoice — clear structure, quiet styling, nothing extra in the way.`
  }

  if (wantsPremium(prompt)) {
    return `You’re looking for a polished ${familyDisplay(family)} invoice with a stronger brand presence and a clear amount due.`
  }

  if (wordCount(prompt) < 10) {
    return `I’ll build a straightforward ${paper} invoice from that brief.`
  }

  const clipped = prompt.replace(/\s+/g, " ")
  const sought = clipped
    .replace(
      /^(create|design|build|generate|make|help me (?:set up|create)|i need|can you (?:put together|create)|put together)\s+/i,
      ""
    )
    .replace(/^me\s+/i, "")
  const gist = sought.length > 88 ? `${sought.slice(0, 85).trim()}…` : sought
  const closed = /[.!?]$/.test(gist) ? gist : `${gist}.`
  return `You’re looking for ${closed}`
}

function interpretReconstruct(request: NarrativeRequest): string {
  const family = familyOf(request)
  const color = namedColor(request.prompt)
  const minimal = wantsMinimal(request.prompt)
  const onlyReference = isReferenceOnlyPrompt(request.prompt)

  if (!onlyReference && (color || minimal)) {
    const change = [
      minimal ? "simplifying the styling" : null,
      color ? `shifting the accent toward ${color}` : null,
    ]
      .filter(Boolean)
      .join(" and ")
    return `I’ll preserve the reference’s split composition and information hierarchy, while ${change}.`
  }

  if (family === "statement") {
    return "I’m reading the reference as a two-part composition: a dominant colour field and a narrow information column."
  }

  if (family === "swiss") {
    return "I’m reading the reference as a tight indexed layout — hard rules, dense type, a single accent."
  }

  return "I’m reading the attached layout and mapping its regions onto an editable invoice, rather than flattening it into an image."
}

function interpretEdit(request: NarrativeRequest): string {
  const actionId = matchDocumentAction(request.prompt)
  if (actionId) {
    return documentActionUnderstanding(actionId)
  }
  switch (detectMutation(request.prompt)) {
    case "discount":
      return documentActionUnderstanding("add-discount-row")
    case "onlinePayment":
      return documentActionUnderstanding("add-pay-online")
    case "paymentDetails":
      return documentActionUnderstanding("add-payment-details")
    case "boldBrand":
      return documentActionUnderstanding("switch-bold-brand")
    case "lineItem":
      return "Adding another line item and recalculating subtotal, tax, discount, and amount due."
    case "minimal":
      return "Simplifying the visual system while keeping the current document structure."
    default:
      return "I’ll apply that edit on the current document, without rebuilding the whole layout."
  }
}

function decideGenerate(request: NarrativeRequest): string {
  const family = familyOf(request)
  const paper = paperOf(request)
  const detailedStudio =
    isStudioAudience(request.prompt) || wantsPremium(request.prompt)

  if (detailedStudio || (family === "studio" && wordCount(request.prompt) >= 12)) {
    return "I’ll keep the document practical for invoicing while giving the brand and amount due more visual weight."
  }

  if (wordCount(request.prompt) < 12) {
    return `I’ll stay conventional on structure so the ${paper} page stays easy to scan and fill in.`
  }

  return `I’ll compose this as a ${familyDisplay(family)} ${paper} invoice and keep totals honest to the line items.`
}

function decideReconstruct(request: NarrativeRequest): string {
  const onlyReference = isReferenceOnlyPrompt(request.prompt)
  if (!onlyReference && (namedColor(request.prompt) || wantsMinimal(request.prompt))) {
    return "I’ll keep the reference’s split and hierarchy, and only change the visual direction you asked for."
  }

  return joinBlocks([
    "I’ll treat the reference as a composition to preserve, then rebuild it as an editable invoice rather than a flattened image.",
    bullets([
      "Keep the colour field and information column in proportion",
      "Recreate the visual character without flattening the reference into an image",
    ]),
  ])
}

function implementGenerate(request: NarrativeRequest): string {
  if (wordCount(request.prompt) < 12) {
    return "I’m keeping the page quiet and easy to scan."
  }
  if (
    isStudioAudience(request.prompt) ||
    wantsPremium(request.prompt) ||
    familyOf(request) === "studio"
  ) {
    return "The direction is locked. I’m settling the page so identity and amount due stay the first things you read."
  }
  return "I’m settling the page so the hierarchy stays clear and easy to work with."
}

function implementReconstruct(request: NarrativeRequest): string {
  if (!isReferenceOnlyPrompt(request.prompt)) {
    return "The composition is locked. I’m rebuilding the structure as editable elements and applying the visual change you asked for."
  }
  return "The composition is locked. I’m rebuilding the structure as editable elements so every block can still be changed."
}

function implementEdit(request: NarrativeRequest): string {
  switch (detectMutation(request.prompt)) {
    case "discount":
      return "Keeping the rest of the invoice intact while the totals catch up."
    case "onlinePayment":
      return "Keeping the action inside the existing hierarchy so it doesn’t compete with amount due."
    case "paymentDetails":
      return "Keeping the details on the page as fields you can still edit."
    case "boldBrand":
      return "Keeping this layout and only shifting the accent."
    case "lineItem":
      return "Keeping the table structure and letting the totals follow."
    default:
      return "Keeping the rest of the document stable."
  }
}

/**
 * User-facing working copy for the active turn. Later phases append to earlier
 * ones so the streaming panel can grow instead of restarting.
 */
export function buildWorkingNarrative(request: NarrativeRequest): string {
  const phase = request.phase ?? "implement"

  if (request.isFollowUp) {
    const interpret = interpretEdit(request)
    if (phase === "interpret" || phase === "decide") {
      return interpret
    }
    const extra = implementEdit(request)
    return extra === interpret ? interpret : joinBlocks([interpret, extra])
  }

  if (request.hasReference) {
    const interpret = interpretReconstruct(request)
    if (phase === "interpret") {
      return interpret
    }
    const decide = decideReconstruct(request)
    if (phase === "decide") {
      return joinBlocks([interpret, decide])
    }
    return joinBlocks([interpret, decide, implementReconstruct(request)])
  }

  const interpret = interpretGenerate(request)
  if (phase === "interpret") {
    return interpret
  }
  const decide = decideGenerate(request)
  if (phase === "decide") {
    return joinBlocks([interpret, decide])
  }
  return joinBlocks([interpret, decide, implementGenerate(request)])
}

export function workingPhaseFor(
  status: "reasoning" | "thinking" | "asking" | "ready" | "idle" | "error",
  completedTodos: number,
  todoTotal: number,
  isFollowUp: boolean
): NarrativePhase {
  if (status === "reasoning" || status === "asking") {
    return "interpret"
  }
  if (status !== "thinking") {
    return "implement"
  }
  if (isFollowUp || todoTotal <= 2) {
    return completedTodos === 0 ? "interpret" : "implement"
  }
  if (completedTodos <= 0) {
    return "interpret"
  }
  if (completedTodos < Math.max(2, Math.ceil(todoTotal / 2))) {
    return "decide"
  }
  return "implement"
}

/**
 * Lightweight markdown narrative shown while the turn is in progress.
 * `buildReasoning(prompt)` stays valid for callers that only have the text.
 */
export function buildReasoning(
  prompt: string,
  request: Partial<NarrativeRequest> = {}
): string {
  return buildWorkingNarrative({
    prompt,
    phase: request.phase ?? "interpret",
    hasReference: request.hasReference,
    isFollowUp: request.isFollowUp,
    paperName: request.paperName,
    family: request.family,
    receivedAnswers: request.receivedAnswers,
  })
}

export function buildPostReasoning(
  prompt: string,
  receivedAnswers: BuilderReceivedAnswer[],
  extra: Partial<NarrativeRequest> = {}
): string {
  const answerBits = receivedAnswers.flatMap((item) => item.values)
  const recap =
    answerBits.length > 0
      ? `You confirmed ${answerBits.slice(0, 3).join(", ")}.`
      : "Thanks — that’s enough to lock the direction."

  return joinBlocks([
    recap,
    buildWorkingNarrative({
      prompt,
      phase: extra.phase ?? "decide",
      hasReference: extra.hasReference,
      isFollowUp: extra.isFollowUp,
      paperName: extra.paperName,
      family: extra.family,
      receivedAnswers,
    }),
  ])
}

export function buildCompletionSummary(
  layout: GeneratedLayout,
  request: Partial<NarrativeRequest> = {}
): string {
  const family = normalizeLayoutStyle(layout.style)
  const paper = request.paperName?.trim() || "A4"
  const docLabel = layout.documentType.toLowerCase()
  const hasReference = Boolean(request.hasReference)

  if (hasReference && request.prompt && !isReferenceOnlyPrompt(request.prompt)) {
    const color = namedColor(request.prompt)
    const change = [
      wantsMinimal(request.prompt) ? "quieter styling" : null,
      color ? `a ${color} accent` : null,
    ]
      .filter(Boolean)
      .join(" and ")
    return joinBlocks([
      `The reconstruction is ready. I preserved the reference’s split composition and hierarchy${change ? `, with ${change}` : ""}.`,
      bullets([
        `${paper} page with the original hierarchy preserved`,
        "Itemised services and recalculated totals",
        "Everything on the page stays editable",
      ]),
    ])
  }

  if (hasReference) {
    return joinBlocks([
      "The reconstruction is ready. I preserved the reference’s split composition and hierarchy.",
      bullets([
        `${paper} composition with the original hierarchy preserved`,
        `Itemised services for **${layout.businessName}**`,
        "Payment, notes and terms stay editable",
      ]),
    ])
  }

  if (family === "studio" || wantsPremium(request.prompt ?? "")) {
    return joinBlocks([
      `Your **${familyDisplay(family)}** ${docLabel} is ready. I kept the billing structure conventional, but gave the identity and amount due much stronger visual weight.`,
      bullets([
        `${paper} composition with a strong brand header`,
        "Itemised services and recalculated totals",
        "Editable payment and notes sections",
      ]),
    ])
  }

  if (family === "swiss" || wantsMinimal(request.prompt ?? "")) {
    return joinBlocks([
      `Your **${familyDisplay(family)}** ${docLabel} is ready — compact, indexed, and easy to scan.`,
      bullets([
        `${paper} grid with a single accent`,
        `${layout.lineItems.length} line items with live totals`,
      ]),
    ])
  }

  return joinBlocks([
    `Your **${familyDisplay(family)}** ${docLabel} for **${layout.businessName}** is ready.`,
    bullets([
      `${paper} composition with a clear bill-to and services table`,
      "Totals that stay in sync with the line items",
    ]),
  ])
}

export function buildEditSummary(
  before: GeneratedLayout,
  after: GeneratedLayout
): string {
  if (!before.sections.discount && after.sections.discount) {
    return "Discount added. Subtotal, tax and amount due are updated."
  }
  if (!before.sections.onlinePayment && after.sections.onlinePayment) {
    return "Pay online is ready and remains editable with the rest of the document."
  }
  if (!before.sections.paymentDetails && after.sections.paymentDetails) {
    return "Bank and payment details are on the document as structured, editable fields."
  }
  if (before.accent !== after.accent && before.style === after.style) {
    return `Accent updated to a bolder branded palette. This **${familyDisplay(normalizeLayoutStyle(after.style))}** composition is unchanged.`
  }
  if (before.style !== after.style) {
    return `Updated the layout to **${familyDisplay(normalizeLayoutStyle(after.style))}**.`
  }
  if (after.lineItems.length > before.lineItems.length) {
    return "Line item added. Subtotal, tax, discount and amount due are recalculated."
  }
  if (after.lineItems.length < before.lineItems.length) {
    return "Line item removed. Totals are recalculated."
  }
  if (!before.sections.taxes && after.sections.taxes) {
    return "Tax line added to the totals."
  }
  if (!before.sections.notes && after.sections.notes) {
    return "Notes section added."
  }
  if (!before.sections.terms && after.sections.terms) {
    return "Payment terms added."
  }
  if (!before.sections.logo && after.sections.logo) {
    return "Logo added to the header."
  }
  if (before.currencyCode !== after.currencyCode) {
    return `Currency switched to **${after.currencyCode}**.`
  }
  return "Updated the document to match your request."
}

export function buildRecommendations(layout: GeneratedLayout): string[] {
  const recs: string[] = []

  if (!layout.sections.discount) {
    recs.push("Add a discount row")
  }
  if (!layout.sections.onlinePayment) {
    recs.push("Add a 'Pay online' button")
  }
  if (!layout.sections.paymentDetails) {
    recs.push("Add bank and payment details")
  }
  if (!hasBoldBrandedAccent(layout)) {
    recs.push("Switch to a bold, branded color scheme")
  }
  if (layout.lineItems.length < 6) {
    recs.push("Add another line item")
  }
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
  if (normalizeLayoutStyle(layout.style) !== "swiss") {
    recs.push("Make it minimal and clean")
  }

  return recs.slice(0, 4)
}
