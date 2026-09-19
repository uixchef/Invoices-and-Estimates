import type { AiAnswers, AiQuestion } from "@/components/ai/ai-questions"
import {
  DECIDE_VALUE,
  extractDecisionsFromPrompt,
  familyToVisualDirection,
  type DecisionDimension,
} from "@/lib/clarification"
import { matchDocumentAction } from "@/lib/document-actions"
import {
  hasVisualStyleIntent,
  resolveLayoutFamily,
} from "@/lib/layout-family"

export const USE_YOUR_JUDGMENT_LABEL = "Use your judgment"
export const CONTINUE_LABEL = "Continue"
export const UNDERSTANDING_LABEL = "Understanding your request"
export const APPROACH_LABEL = "Approach"
export const NEEDS_CLARIFICATION_LABEL = "Needs clarification"
export const CLARIFICATION_COMPOSER_PLACEHOLDER =
  "Or answer in your own words…"

export type ClarificationSurface = "global" | "inspector"

export function showsGlobalClarification(surface: ClarificationSurface): boolean {
  return surface === "global"
}

export function showsInspectorClarification(
  surface: ClarificationSurface,
  targetId: string | null,
  inspectingId: string | null
): boolean {
  return surface === "inspector" && targetId !== null && targetId === inspectingId
}

/** Answers always apply to the originating element, never the current inspect. */
export function scopedClarificationTarget(
  surface: ClarificationSurface,
  targetId: string | null
): string | null {
  return surface === "inspector" ? targetId : null
}

const JUDGMENT_PHRASE_RE =
  /\b(use your judgment|you decide|decide for me|your call|whatever you think|up to you)\b/i

export function isJudgmentPhrase(text: string): boolean {
  return JUDGMENT_PHRASE_RE.test(text.trim())
}

export function clarificationContinueEnabled(
  question: AiQuestion | undefined,
  answers: AiAnswers
): boolean {
  if (!question) {
    return false
  }
  if (!question.required) {
    return true
  }
  const value = answers[question.id]
  if (question.type === "multi-select") {
    return Array.isArray(value) && value.length > 0
  }
  return typeof value === "string" && value.trim().length > 0
}

export function interpretFreeformAnswer(
  question: AiQuestion,
  text: string
): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return DECIDE_VALUE
  }
  if (isJudgmentPhrase(trimmed)) {
    return DECIDE_VALUE
  }
  if (matchDocumentAction(trimmed)) {
    return trimmed
  }

  if ("options" in question && Array.isArray(question.options)) {
    const normalized = trimmed.toLowerCase()
    const matched = question.options.find((option) => {
      if (typeof option === "string") {
        return normalized === option.toLowerCase()
      }
      const label = option.label.toLowerCase()
      const id = option.id.toLowerCase()
      return (
        normalized === id ||
        normalized === label ||
        new RegExp(`\\b${escapeRegExp(label)}\\b`).test(normalized) ||
        new RegExp(`\\b${escapeRegExp(id)}\\b`).test(normalized)
      )
    })
    if (matched) {
      return typeof matched === "string" ? matched : matched.id
    }
  }

  if (question.id === "visualDirection") {
    if (/\b(not too corporate|clean|quiet|simple|unfussy)\b/i.test(trimmed)) {
      return "minimal"
    }
    if (hasVisualStyleIntent(trimmed)) {
      return familyToVisualDirection(resolveLayoutFamily(trimmed))
    }
  }

  const extracted = extractDecisionsFromPrompt(trimmed, {
    kind: "initial-generation",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: false,
  }).find((entry) => entry.dimension === (question.id as DecisionDimension))
  if (extracted) {
    return extracted.value
  }

  return trimmed
}

export function acknowledgementForAnswer(
  question: AiQuestion,
  value: string
): string {
  if (value === DECIDE_VALUE || isJudgmentPhrase(value)) {
    return "I'll use my judgment and keep the invoice practical and polished."
  }

  const optionLabel =
    "options" in question
      ? question.options.find((option) =>
          typeof option === "string" ? option === value : option.id === value
        )
      : undefined
  const optionText =
    optionLabel == null
      ? undefined
      : typeof optionLabel === "string"
        ? optionLabel
        : optionLabel.label

  if (question.id === "visualDirection") {
    const direction = (optionText ?? value).toLowerCase()
    return `Got it — I'll keep the direction ${direction}.`
  }
  if (question.id === "documentPurpose") {
    const purpose = (optionText ?? value).toLowerCase()
    return `Got it — I'll set this up for ${purpose}.`
  }
  if (question.id === "referenceIntent") {
    if (value === "structure") {
      return "Got it — I'll preserve the structure and simplify the visual style."
    }
    if (value === "visual") {
      return "Got it — I'll take the visual style from the reference."
    }
    if (value === "both") {
      return "Got it — I'll follow both the structure and the visual style."
    }
    if (value === "structure-refresh-style") {
      return "Got it — I'll preserve the structure and simplify the visual style."
    }
    return "Got it — I'll use the reference as a guide."
  }
  if (question.id === "discountType") {
    if (matchDocumentAction(value)) {
      return "Got it — I'll work from that."
    }
    const label = optionText ?? value.replace("percent-", "") + (value.startsWith("percent-") ? "%" : "")
    return `Got it — I'll add a ${label.toLowerCase()} discount.`
  }
  if (optionText) {
    return `Got it — I'll go with ${optionText.toLowerCase()}.`
  }
  return "Got it — I'll work from that."
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
