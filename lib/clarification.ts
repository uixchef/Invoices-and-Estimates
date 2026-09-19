import type { AiQuestion, AiAnswers } from "@/components/ai/ai-questions"
import type { GeneratedLayout } from "@/lib/layout-builder-types"
import { matchDocumentAction } from "@/lib/document-actions"
import {
  hasVisualStyleIntent,
  resolveLayoutFamily,
  type LayoutFamilyId,
} from "@/lib/layout-family"

export const CLARIFICATION_BUDGET = 4
export const DECIDE_VALUE = "decide"
export const CONTINUE_WITH_ASSUMPTIONS = "__continue_with_assumptions__"

export type ClarificationKind =
  | "initial-generation"
  | "reference-reconstruction"
  | "document-edit"
  | "selected-element-edit"
  | "add-element"
  | "brand-edit"

export type DecisionDimension =
  | "visualDirection"
  | "documentPurpose"
  | "referenceIntent"
  | "discountType"
  | "sourceIntent"
  | "visualConflict"
  | "brandPreference"
  | "paperSize"

export type DecisionSource =
  | "prompt"
  | "existing-document"
  | "reference"
  | "merchant-answer"
  | "inferred-default"

export type Consequence = "blocking" | "important" | "optional"

export type ResolvedDecision = {
  dimension: DecisionDimension
  value: string
  source: DecisionSource
}

export type ClarificationCandidate = {
  dimension: DecisionDimension
  consequence: Consequence
  confidence: number
  question: AiQuestion
  reason: string
}

export type ClarificationPlan = {
  questions: AiQuestion[]
  /** Askable candidates this pass, including the questions being shown now. */
  askableCount: number
  unresolvedOptional: DecisionDimension[]
  canProceed: boolean
  inferred: ResolvedDecision[]
  resolved: ResolvedDecision[]
}

export type ClarificationInput = {
  prompt: string
  kind: ClarificationKind
  hasReference: boolean
  hasBrandBoard: boolean
  paperKnown: boolean
  documentTypeKnown: boolean
  generatedOnce: boolean
  resolved: ResolvedDecision[]
  askedCount: number
  round: number
}

const IMPACT: Record<Consequence, number> = {
  blocking: 1,
  important: 0.6,
  optional: 0.15,
}

const ASK_THRESHOLD = 0.34

const STRONG_VISUAL_RE =
  /\b(studio|agency|creative|luxury|luxurious|atelier|swiss|grid|editorial|magazine|statement|expressive|dramatic|ledger|fintech|typographic|brand(?:ed|ing)|colour block|color block)\b/i

const WEAK_VISUAL_RE =
  /\b(premium|modern|professional|elegant|refined|sophisticated|clean|simple|classic|minimal|minimalist)\b/i

const PURPOSE_RE: { value: string; pattern: RegExp }[] = [
  {
    value: "services",
    pattern:
      /\b(service|services|consult|consulting|studio|agency|freelance|design studio)\b/i,
  },
  {
    value: "products",
    pattern: /\b(product|products|shop|store|retail|goods|merchandise)\b/i,
  },
  {
    value: "subscription",
    pattern: /\b(subscription|retainer|saas|membership|recurring)\b/i,
  },
]

const EXPLICIT_REFERENCE_INTENT_RE =
  /\b(recreate this exactly|match this (exactly|closely)|very closely|use it as inspiration|keep (this |the )?structure|preserve (the )?structure|same structure|refresh the style)\b/i

const LIKE_EXISTING_RE =
  /\b(like my (existing )?invoice|existing invoice|same as my invoice|match my invoice)\b/i

const DISCOUNT_RATE_RE = /\b(\d{1,2})\s*%|\b(10|15|20)\s*percent\b/i

const VISUAL_EDIT_RE =
  /\b(warmer|cooler|minimal|minimalist|bold|hierarchy|spacing|padding|font|typograph|colour|color|modern|clean|quiet|loud|subtle|expressive)\b/i

const STRUCTURAL_EDIT_RE =
  /\b(add|remove|hide|discount|terms|tax|button|payment|section|line item|logo|notes?)\b/i

const CONFLICT_RE =
  /\b(bold|loud|expressive|dramatic).{0,40}\b(subtle|minimal|quiet|soft)\b|\b(subtle|minimal|quiet|soft).{0,40}\b(bold|loud|expressive|dramatic)\b/i

const ADD_ELEMENT_RE =
  /^(add|insert)\b/i

const ADD_ELEMENT_KIND_RE =
  /\b(heading|paragraph|button|image|cta|block|element|text)\b/i

const BRAND_EDIT_RE =
  /\b(brand board|brand identity|colour scheme|color scheme|brand colours|brand colors)\b/i

function isBareReferencePrompt(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return true
  }
  return (
    /^recreate this\.?$/i.test(trimmed) ||
    /^generate a layout from \d+ reference images?\.?$/i.test(trimmed)
  )
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function hasDimension(
  resolved: ResolvedDecision[],
  dimension: DecisionDimension
): boolean {
  return resolved.some((entry) => entry.dimension === dimension)
}

function decisionValue(
  resolved: ResolvedDecision[],
  dimension: DecisionDimension
): string | undefined {
  return [...resolved].reverse().find((entry) => entry.dimension === dimension)
    ?.value
}

function upsertDecision(
  resolved: ResolvedDecision[],
  next: ResolvedDecision
): ResolvedDecision[] {
  const without = resolved.filter((entry) => entry.dimension !== next.dimension)
  return [...without, next]
}

function clarificationValue(candidate: ClarificationCandidate): number {
  return IMPACT[candidate.consequence] * (1 - candidate.confidence)
}

export function inferClarificationKind(input: {
  hasGeneratedOnce: boolean
  hasReference: boolean
  isScopedElement: boolean
  prompt: string
}): ClarificationKind {
  const prompt = input.prompt.trim()
  if (input.isScopedElement) {
    return "selected-element-edit"
  }
  if (!input.hasGeneratedOnce && input.hasReference) {
    return "reference-reconstruction"
  }
  if (!input.hasGeneratedOnce) {
    return "initial-generation"
  }
  if (ADD_ELEMENT_RE.test(prompt) && ADD_ELEMENT_KIND_RE.test(prompt)) {
    return "add-element"
  }
  if (BRAND_EDIT_RE.test(prompt)) {
    return "brand-edit"
  }
  return "document-edit"
}

export function visualDirectionToFamily(value: string): LayoutFamilyId {
  const raw = value.trim().toLowerCase()
  if (raw === "professional" || raw === "studio") return "studio"
  if (raw === "minimal" || raw === "swiss") return "swiss"
  if (raw === "editorial") return "editorial"
  if (raw === "bold" || raw === "statement") return "statement"
  if (raw === "atelier" || raw === "premium") return "atelier"
  if (raw === "ledger") return "ledger"
  return resolveLayoutFamily(value)
}

export function familyToVisualDirection(family: LayoutFamilyId): string {
  if (family === "swiss") return "minimal"
  if (family === "editorial") return "editorial"
  if (family === "statement") return "bold"
  if (family === "atelier") return "editorial"
  if (family === "ledger") return "professional"
  return "professional"
}

function visualConfidence(prompt: string): number {
  if (
    STRONG_VISUAL_RE.test(prompt) ||
    (wordCount(prompt) >= 12 && hasVisualStyleIntent(prompt))
  ) {
    return 0.92
  }
  if (hasVisualStyleIntent(prompt) || WEAK_VISUAL_RE.test(prompt)) {
    return 0.38
  }
  return 0.18
}

function purposeFromPrompt(prompt: string): string | null {
  for (const entry of PURPOSE_RE) {
    if (entry.pattern.test(prompt)) {
      return entry.value
    }
  }
  return null
}

function discountFromPrompt(prompt: string): string | null {
  const match = prompt.match(DISCOUNT_RATE_RE)
  if (match) {
    const n = Number.parseInt(match[1] || match[2] || "", 10)
    if (Number.isFinite(n)) {
      return `percent-${n}`
    }
  }
  if (/\bfixed\b/.test(prompt) && /\bdiscount\b/.test(prompt)) {
    return "fixed"
  }
  return null
}

function referenceIntentFromPrompt(prompt: string): string | null {
  const text = prompt.trim()
  if (!text || isBareReferencePrompt(text)) {
    return null
  }
  if (/\brecreate this exactly|match this exactly|very closely\b/i.test(text)) {
    return "closely"
  }
  if (
    /\bkeep (this |the )?structure\b/i.test(text) &&
    /\b(minimal|style|blue|colour|color|refresh)\b/i.test(text)
  ) {
    return "structure-refresh-style"
  }
  if (/\bkeep (this |the )?structure|preserve (the )?structure\b/i.test(text)) {
    return "structure"
  }
  if (/\binspiration|loosely\b/i.test(text)) {
    return "inspiration"
  }
  if (EXPLICIT_REFERENCE_INTENT_RE.test(text)) {
    return "structure-refresh-style"
  }
  return null
}

export function extractDecisionsFromPrompt(
  prompt: string,
  context: Pick<
    ClarificationInput,
    | "kind"
    | "hasReference"
    | "hasBrandBoard"
    | "paperKnown"
    | "documentTypeKnown"
    | "generatedOnce"
  >
): ResolvedDecision[] {
  const resolved: ResolvedDecision[] = []
  const text = prompt.trim()

  if (context.paperKnown) {
    resolved.push({
      dimension: "paperSize",
      value: "known",
      source: "existing-document",
    })
  }
  if (context.hasBrandBoard) {
    resolved.push({
      dimension: "brandPreference",
      value: "current-board",
      source: "existing-document",
    })
  }

  const actionId = matchDocumentAction(text)

  const purpose = purposeFromPrompt(text)
  if (purpose && !actionId) {
    resolved.push({
      dimension: "documentPurpose",
      value: purpose,
      source: "prompt",
    })
  }

  const visualConf = visualConfidence(text)
  if (visualConf >= 0.85 && !actionId) {
    resolved.push({
      dimension: "visualDirection",
      value: familyToVisualDirection(resolveLayoutFamily(text)),
      source: "prompt",
    })
  }

  const referenceIntent = referenceIntentFromPrompt(text)
  if (referenceIntent) {
    resolved.push({
      dimension: "referenceIntent",
      value: referenceIntent,
      source: "prompt",
    })
  }

  const discount = discountFromPrompt(text)
  if (discount && (!actionId || actionId === "add-discount-row")) {
    resolved.push({
      dimension: "discountType",
      value: discount,
      source: "prompt",
    })
  }

  if (CONFLICT_RE.test(text)) {
    // Leave visualConflict unresolved so a confirmation can fire.
  } else if (
    context.generatedOnce &&
    hasVisualStyleIntent(text) &&
    !actionId &&
    !CONFLICT_RE.test(text)
  ) {
    resolved.push({
      dimension: "visualConflict",
      value: "latest-wins",
      source: "prompt",
    })
  }

  return resolved
}

function mergeResolved(
  base: ResolvedDecision[],
  incoming: ResolvedDecision[]
): ResolvedDecision[] {
  let next = [...base]
  for (const entry of incoming) {
    next = upsertDecision(next, entry)
  }
  return next
}

function questionVisual(): AiQuestion {
  return {
    id: "visualDirection",
    type: "single-select",
    prompt: "What should it feel like?",
    required: true,
    options: [
      { id: "professional", label: "Professional" },
      { id: "minimal", label: "Minimal" },
      { id: "editorial", label: "Editorial" },
      { id: "bold", label: "Bold" },
    ],
  }
}

function questionPurpose(): AiQuestion {
  return {
    id: "documentPurpose",
    type: "single-select",
    prompt: "What are you creating this invoice for?",
    required: true,
    options: [
      { id: "services", label: "Services" },
      { id: "products", label: "Products" },
      { id: "subscription", label: "Subscription" },
    ],
    allowOther: true,
  }
}

function questionReference(): AiQuestion {
  return {
    id: "referenceIntent",
    type: "single-select",
    prompt: "What matters most from this reference?",
    required: true,
    options: [
      { id: "structure", label: "Structure" },
      { id: "visual", label: "Visual style" },
      { id: "both", label: "Both" },
    ],
  }
}

function questionDiscount(): AiQuestion {
  return {
    id: "discountType",
    type: "single-select",
    prompt: "What discount should I add?",
    required: true,
    options: [
      { id: "percent-10", label: "10%" },
      { id: "percent-15", label: "15%" },
      { id: "percent-20", label: "20%" },
    ],
    allowOther: true,
  }
}

function questionConflict(): AiQuestion {
  return {
    id: "visualConflict",
    type: "single-select",
    prompt: "Those directions conflict. Which should I lean toward?",
    required: true,
    options: [
      { id: "bold", label: "Bolder and louder" },
      { id: "subtle", label: "Quiet and subtle" },
    ],
  }
}

function questionSource(): AiQuestion {
  return {
    id: "sourceIntent",
    type: "single-select",
    prompt: "I don't have that invoice yet. Continue with a new layout?",
    required: true,
    options: [
      { id: "new-layout", label: "Start a new layout" },
    ],
  }
}

function collectCandidates(input: ClarificationInput): ClarificationCandidate[] {
  const { prompt, kind, resolved } = input
  const text = prompt.trim()
  const candidates: ClarificationCandidate[] = []

  if (kind === "add-element") {
    return candidates
  }

  if (kind === "selected-element-edit") {
    if (CONFLICT_RE.test(text) && !hasDimension(resolved, "visualConflict")) {
      candidates.push({
        dimension: "visualConflict",
        consequence: "blocking",
        confidence: 0.2,
        question: questionConflict(),
        reason: "Element edit conflicts with itself",
      })
    }
    if (VISUAL_EDIT_RE.test(text) || STRUCTURAL_EDIT_RE.test(text)) {
      return candidates
    }
    if (!hasDimension(resolved, "visualDirection") && visualConfidence(text) < 0.5) {
      candidates.push({
        dimension: "visualDirection",
        consequence: "important",
        confidence: visualConfidence(text),
        question: questionVisual(),
        reason: "Scoped edit is still visually underspecified",
      })
    }
    return candidates
  }

  if (kind === "brand-edit") {
    if (!input.hasBrandBoard && !hasDimension(resolved, "brandPreference")) {
      candidates.push({
        dimension: "brandPreference",
        consequence: "optional",
        confidence: 0.7,
        question: questionVisual(),
        reason: "No board, but colour can be inferred",
      })
    }
    return candidates
  }

  if (
    LIKE_EXISTING_RE.test(text) &&
    !input.hasReference &&
    !hasDimension(resolved, "sourceIntent")
  ) {
    candidates.push({
      dimension: "sourceIntent",
      consequence: "blocking",
      confidence: 0.15,
      question: questionSource(),
      reason: "Asked to match an invoice that is not attached",
    })
  }

  if (kind === "reference-reconstruction") {
    if (!hasDimension(resolved, "referenceIntent")) {
      candidates.push({
        dimension: "referenceIntent",
        consequence: "blocking",
        confidence: 0.2,
        question: questionReference(),
        reason: "Reference attached without a fidelity instruction",
      })
    }
    return candidates
  }

  if (kind === "document-edit") {
    if (CONFLICT_RE.test(text) && !hasDimension(resolved, "visualConflict")) {
      candidates.push({
        dimension: "visualConflict",
        consequence: "blocking",
        confidence: 0.2,
        question: questionConflict(),
        reason: "Latest instruction conflicts with itself",
      })
    }

    if (
      /\bdiscount\b/i.test(text) &&
      !discountFromPrompt(text) &&
      !hasDimension(resolved, "discountType")
    ) {
      candidates.push({
        dimension: "discountType",
        consequence: "blocking",
        confidence: 0.2,
        question: questionDiscount(),
        reason: "Discount type changes structure",
      })
    }

    if (VISUAL_EDIT_RE.test(text) || STRUCTURAL_EDIT_RE.test(text)) {
      return candidates
    }

    if (!hasDimension(resolved, "visualDirection") && visualConfidence(text) < 0.5) {
      candidates.push({
        dimension: "visualDirection",
        consequence: "important",
        confidence: visualConfidence(text),
        question: questionVisual(),
        reason: "Follow-up still visually underspecified",
      })
    }
    return candidates
  }

  if (kind === "initial-generation") {
    if (
      CONFLICT_RE.test(text) &&
      !hasDimension(resolved, "visualConflict")
    ) {
      candidates.push({
        dimension: "visualConflict",
        consequence: "blocking",
        confidence: 0.2,
        question: questionConflict(),
        reason: "Prompt asks for opposing directions",
      })
    }

    if (!hasDimension(resolved, "visualDirection")) {
      const confidence = visualConfidence(text)
      candidates.push({
        dimension: "visualDirection",
        consequence: "important",
        confidence,
        question: questionVisual(),
        reason: "Visual direction would change the family",
      })
    }

    if (!hasDimension(resolved, "documentPurpose")) {
      const namedDocument = /\b(invoice|estimate|receipt|credit note)\b/i.test(
        text
      )
      const underspecified = /\b(something|anything)\b/i.test(text)
      if (underspecified || !namedDocument) {
        candidates.push({
          dimension: "documentPurpose",
          consequence: "important",
          confidence: 0.22,
          question: questionPurpose(),
          reason: "Business type changes content structure",
        })
      }
    }
  }

  return candidates
}

function rank(candidates: ClarificationCandidate[]): ClarificationCandidate[] {
  return [...candidates].sort((a, b) => {
    const byValue = clarificationValue(b) - clarificationValue(a)
    if (Math.abs(byValue) > 0.01) {
      return byValue
    }
    const order: DecisionDimension[] = [
      "sourceIntent",
      "referenceIntent",
      "visualConflict",
      "discountType",
      "documentPurpose",
      "visualDirection",
      "brandPreference",
      "paperSize",
    ]
    return order.indexOf(a.dimension) - order.indexOf(b.dimension)
  })
}

function pickRound(
  input: ClarificationInput,
  askable: ClarificationCandidate[]
): ClarificationCandidate[] {
  const remainingBudget = Math.max(0, CLARIFICATION_BUDGET - input.askedCount)
  if (remainingBudget === 0 || askable.length === 0) {
    return []
  }

  if (input.kind === "selected-element-edit") {
    return askable.slice(0, Math.min(1, remainingBudget))
  }

  const blocking = askable.filter((entry) => entry.consequence === "blocking")
  let max = 1
  if (input.kind === "document-edit") {
    max = 2
  } else if (input.round === 0) {
    max = blocking.length >= 2 ? Math.min(3, blocking.length) : 1
    if (
      input.kind === "initial-generation" &&
      askable.length >= 2 &&
      blocking.length === 0
    ) {
      max = 1
    }
  } else {
    max = 2
  }

  const preferred = rank(askable)
  if (input.kind === "initial-generation" && input.round === 0) {
    const underspecified = /\b(something|anything)\b/i.test(input.prompt)
    const weakVisual =
      visualConfidence(input.prompt) < 0.5 && WEAK_VISUAL_RE.test(input.prompt)
    const ordered = [...preferred].sort((a, b) => {
      if (underspecified) {
        if (a.dimension === "documentPurpose") return -1
        if (b.dimension === "documentPurpose") return 1
      } else if (weakVisual) {
        if (a.dimension === "visualDirection") return -1
        if (b.dimension === "visualDirection") return 1
      }
      return 0
    })
    return ordered.slice(0, Math.min(max, remainingBudget))
  }

  return preferred.slice(0, Math.min(max, remainingBudget))
}

export function planClarification(input: ClarificationInput): ClarificationPlan {
  const extracted = extractDecisionsFromPrompt(input.prompt, input)
  const resolved = mergeResolved(input.resolved, extracted)
  const candidates = collectCandidates({ ...input, resolved })
  const askable = candidates.filter(
    (candidate) =>
      candidate.consequence !== "optional" &&
      clarificationValue(candidate) >= ASK_THRESHOLD &&
      !hasDimension(resolved, candidate.dimension)
  )
  const optional = candidates
    .filter((candidate) => candidate.consequence === "optional")
    .map((candidate) => candidate.dimension)

  const questions = pickRound(input, askable).map((entry) => entry.question)
  return {
    questions,
    askableCount: askable.length,
    unresolvedOptional: optional,
    canProceed: questions.length === 0,
    inferred: resolved.filter((entry) => entry.source !== "merchant-answer"),
    resolved,
  }
}

/** 1-based sequence for the active clarification plan, not the rendered array. */
export function clarificationSequenceState(input: {
  askedCount: number
  askableCount: number
  activeIndex?: number
}): { current: number; total: number } {
  const total = Math.max(0, input.askedCount + input.askableCount)
  if (total === 0) {
    return { current: 0, total: 0 }
  }
  const current = Math.min(
    total,
    Math.max(1, input.askedCount + (input.activeIndex ?? 0) + 1)
  )
  return { current, total }
}

export function clarificationStepperStates(
  current: number,
  total: number
): Array<"completed" | "current" | "upcoming"> {
  return Array.from({ length: Math.max(0, total) }, (_, index) => {
    if (index < current - 1) {
      return "completed"
    }
    if (index === current - 1) {
      return "current"
    }
    return "upcoming"
  })
}

function inferDecideValue(
  dimension: DecisionDimension,
  prompt: string
): string {
  if (dimension === "visualDirection") {
    return familyToVisualDirection(resolveLayoutFamily(prompt))
  }
  if (dimension === "documentPurpose") {
    return purposeFromPrompt(prompt) ?? "services"
  }
  if (dimension === "referenceIntent") {
    return referenceIntentFromPrompt(prompt) ?? "both"
  }
  if (dimension === "discountType") {
    return discountFromPrompt(prompt) ?? "percent-10"
  }
  if (dimension === "visualConflict") {
    return "subtle"
  }
  if (dimension === "sourceIntent") {
    return "new-layout"
  }
  return "inferred"
}

export function applyAnswersToDecisions(
  resolved: ResolvedDecision[],
  questions: AiQuestion[],
  answers: AiAnswers,
  prompt: string
): ResolvedDecision[] {
  let next = [...resolved]
  for (const question of questions) {
    const raw = answers[question.id]
    if (raw == null) {
      continue
    }
    const value = Array.isArray(raw) ? raw.join(",") : raw.trim()
    if (!value) {
      continue
    }
    const dimension = question.id as DecisionDimension
    const decided =
      value === DECIDE_VALUE || value === CONTINUE_WITH_ASSUMPTIONS
        ? inferDecideValue(dimension, prompt)
        : value
    next = upsertDecision(next, {
      dimension,
      value: decided,
      source: "merchant-answer",
    })
    if (
      value !== DECIDE_VALUE &&
      wordCount(value) >= 3 &&
      !matchDocumentAction(value)
    ) {
      next = mergeResolved(
        next,
        extractDecisionsFromPrompt(value, {
          kind: "initial-generation",
          hasReference: false,
          hasBrandBoard: false,
          paperKnown: true,
          documentTypeKnown: true,
          generatedOnce: false,
        })
      )
    }
  }
  return next
}

export function decisionsToAnswers(
  resolved: ResolvedDecision[]
): AiAnswers {
  const answers: AiAnswers = {}
  for (const entry of resolved) {
    answers[entry.dimension] = entry.value
    if (entry.dimension === "visualDirection") {
      answers.style = visualDirectionToFamily(entry.value)
    }
    if (entry.dimension === "documentPurpose") {
      answers.focus = entry.value
    }
    if (entry.dimension === "discountType") {
      const rate = discountRateFromValue(entry.value)
      if (rate != null) {
        answers.discountRate = String(rate)
      }
    }
  }
  return answers
}

export function answersToDecisions(answers: AiAnswers | null): ResolvedDecision[] {
  if (!answers) {
    return []
  }
  const resolved: ResolvedDecision[] = []
  const visual =
    typeof answers.visualDirection === "string"
      ? answers.visualDirection
      : typeof answers.style === "string"
        ? String(answers.style)
        : null
  if (visual) {
    resolved.push({
      dimension: "visualDirection",
      value: visual,
      source: "merchant-answer",
    })
  }
  const purpose =
    typeof answers.documentPurpose === "string"
      ? answers.documentPurpose
      : typeof answers.focus === "string"
        ? answers.focus
        : null
  if (purpose) {
    resolved.push({
      dimension: "documentPurpose",
      value: purpose,
      source: "merchant-answer",
    })
  }
  for (const dimension of [
    "referenceIntent",
    "discountType",
    "sourceIntent",
    "visualConflict",
    "brandPreference",
    "paperSize",
  ] as DecisionDimension[]) {
    const value = answers[dimension]
    if (typeof value === "string" && value.trim()) {
      resolved.push({
        dimension,
        value,
        source: "merchant-answer",
      })
    }
  }
  return resolved
}

export function discountRateFromValue(value: string): number | null {
  const match = value.match(/percent-(\d+)/i) || value.match(/^(\d{1,2})%?$/)
  if (match) {
    const n = Number.parseInt(match[1], 10)
    if (Number.isFinite(n)) {
      return Math.min(Math.max(n, 1), 90) / 100
    }
  }
  if (value === "fixed") {
    return 0.1
  }
  if (value === DECIDE_VALUE) {
    return 0.1
  }
  return null
}

const PRODUCT_ITEMS = [
  { description: "Starter kit", qty: 2, rate: 180 },
  { description: "Refill pack", qty: 4, rate: 48 },
  { description: "Shipping", qty: 1, rate: 24 },
]

const SUBSCRIPTION_ITEMS = [
  { description: "Monthly platform", qty: 1, rate: 220 },
  { description: "Seat add-on", qty: 3, rate: 18 },
  { description: "Onboarding", qty: 1, rate: 90 },
]

export function applyClarificationLayoutEffects(
  layout: GeneratedLayout,
  answers: AiAnswers | null
): GeneratedLayout {
  if (!answers) {
    return layout
  }
  const next: GeneratedLayout = {
    ...layout,
    sections: { ...layout.sections },
    lineItems: [...layout.lineItems],
  }

  const visual =
    typeof answers.visualDirection === "string"
      ? answers.visualDirection
      : typeof answers.style === "string"
        ? answers.style
        : null
  if (visual && visual !== DECIDE_VALUE) {
    next.style = visualDirectionToFamily(visual)
  }

  const purpose =
    typeof answers.documentPurpose === "string"
      ? answers.documentPurpose
      : typeof answers.focus === "string"
        ? answers.focus
        : null
  if (purpose) {
    next.emphasis = purpose
    if (purpose === "products") {
      next.lineItems = PRODUCT_ITEMS.slice(0, next.lineItems.length || 3)
    } else if (purpose === "subscription") {
      next.lineItems = SUBSCRIPTION_ITEMS.slice(0, next.lineItems.length || 3)
    }
  }

  if (typeof answers.discountType === "string") {
    const rate = discountRateFromValue(answers.discountType)
    if (rate != null) {
      next.sections.discount = true
      next.discountRate = rate
    }
  }

  if (typeof answers.referenceIntent === "string") {
    next.emphasis = next.emphasis
      ? `${next.emphasis} · ${answers.referenceIntent}`
      : String(answers.referenceIntent)
  }

  return next
}

export function resolvedForScopedClarification(
  resolved: ResolvedDecision[]
): ResolvedDecision[] {
  return resolved.filter(
    (entry) =>
      entry.dimension !== "visualDirection" &&
      entry.dimension !== "visualConflict"
  )
}

export function questionsOrNull(plan: ClarificationPlan): AiQuestion[] | null {
  return plan.questions.length > 0 ? plan.questions : null
}

export function assumptionNote(resolved: ResolvedDecision[]): string | null {
  const purpose = decisionValue(resolved, "documentPurpose")
  const visual = decisionValue(resolved, "visualDirection")
  if (!purpose && !visual) {
    return null
  }
  const bits: string[] = []
  if (purpose === "services") {
    bits.push("a clean service layout")
  } else if (purpose === "products") {
    bits.push("a product invoice structure")
  } else if (purpose === "subscription") {
    bits.push("a subscription billing structure")
  }
  if (visual === "minimal") {
    bits.push("kept the billing structure compact")
  } else if (visual === "editorial") {
    bits.push("leaned editorial")
  } else if (visual === "bold") {
    bits.push("used a bolder close")
  }
  if (bits.length === 0) {
    return null
  }
  return `I used ${bits.join(" and ")}.`
}
