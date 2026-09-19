import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { PORTFOLIO_HERO_PROMPT } from "./layout-family"
import {
  applyAnswersToDecisions,
  clarificationSequenceState,
  clarificationStepperStates,
  CLARIFICATION_BUDGET,
  DECIDE_VALUE,
  planClarification,
} from "./clarification"
import {
  acknowledgementForAnswer,
  APPROACH_LABEL,
  clarificationContinueEnabled,
  CONTINUE_LABEL,
  interpretFreeformAnswer,
  isJudgmentPhrase,
  NEEDS_CLARIFICATION_LABEL,
  scopedClarificationTarget,
  showsGlobalClarification,
  showsInspectorClarification,
  UNDERSTANDING_LABEL,
  USE_YOUR_JUDGMENT_LABEL,
} from "./clarification-copy"
import {
  composerLeftControlsOrder,
  COMPOSER_LEFT_CONTROL_ORDER,
} from "./composer-action-order"
import {
  REFERENCE_RECREATE_PROMPT,
  resolveComposerPlaceholder,
  resolveGenerationPrompt,
} from "./composer-copy"
import type { AiQuestion } from "@/components/ai/ai-questions"

const visualQuestion: AiQuestion = {
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

test("Skip no longer exists in question UI copy", () => {
  assert.equal(USE_YOUR_JUDGMENT_LABEL, "Use your judgment")
  assert.notEqual(USE_YOUR_JUDGMENT_LABEL.toLowerCase(), "skip")
  assert.doesNotMatch(USE_YOUR_JUDGMENT_LABEL, /skip/i)
  assert.doesNotMatch(CONTINUE_LABEL, /skip/i)
})

test("Continue stays disabled until an explicit answer exists", () => {
  assert.equal(clarificationContinueEnabled(visualQuestion, {}), false)
  assert.equal(
    clarificationContinueEnabled(visualQuestion, { visualDirection: "professional" }),
    true
  )
  assert.equal(CONTINUE_LABEL, "Continue")
})

test("Use your judgment path is a dedicated inference phrase", () => {
  assert.equal(isJudgmentPhrase("use your judgment"), true)
  assert.equal(interpretFreeformAnswer(visualQuestion, "you decide"), DECIDE_VALUE)
  assert.match(
    acknowledgementForAnswer(visualQuestion, DECIDE_VALUE),
    /use my judgment/i
  )
})

test("freeform composer answer is routed into existing clarification decisions", () => {
  assert.equal(
    interpretFreeformAnswer(visualQuestion, "Professional"),
    "professional"
  )
  assert.equal(
    interpretFreeformAnswer(
      visualQuestion,
      "Clean, premium and not too corporate."
    ),
    "minimal"
  )
  const resolved = interpretFreeformAnswer(
    visualQuestion,
    "I want it editorial and magazine-like"
  )
  assert.equal(resolved, "editorial")
})

test("acknowledgement is derived from the resolved decision", () => {
  assert.equal(
    acknowledgementForAnswer(visualQuestion, "professional"),
    "Got it — I'll keep the direction professional."
  )
  const referenceQuestion: AiQuestion = {
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
  assert.match(
    acknowledgementForAnswer(referenceQuestion, "structure"),
    /preserve the structure/i
  )
  const discountQuestion: AiQuestion = {
    id: "discountType",
    type: "single-select",
    prompt: "What discount should I add?",
    required: true,
    options: [
      { id: "percent-10", label: "10%" },
      { id: "percent-15", label: "15%" },
      { id: "percent-20", label: "20%" },
    ],
  }
  const discountAck = acknowledgementForAnswer(discountQuestion, "percent-10")
  assert.match(discountAck, /10%/)
  assert.doesNotMatch(discountAck, /pay online|payment details|brand/i)
  assert.doesNotMatch(
    acknowledgementForAnswer(discountQuestion, "Add a 'Pay online' button"),
    /I'll add add/i
  )
})

test("no fake Thought for Ns UI copy", () => {
  assert.equal(UNDERSTANDING_LABEL, "Understanding your request")
  assert.equal(APPROACH_LABEL, "Approach")
  assert.equal(NEEDS_CLARIFICATION_LABEL, "Needs clarification")
  assert.doesNotMatch(UNDERSTANDING_LABEL, /thought for/i)
  assert.doesNotMatch(APPROACH_LABEL, /\d+s/)
})

test("active clarification card docks onto the composer, not the transcript", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..")
  const panel = readFileSync(
    join(root, "components/invoices/builder/invoice-ai-panel.tsx"),
    "utf8"
  )
  const questions = readFileSync(
    join(root, "components/ai/ai-questions.tsx"),
    "utf8"
  )

  const composerFn = panel.slice(
    panel.indexOf("function AiComposer()"),
    panel.indexOf("function groupTurns")
  )
  const invoicePanel = panel.slice(panel.indexOf("export function InvoiceAiPanel"))

  assert.match(composerFn, /docked/)
  assert.match(composerFn, /<AiQuestions/)
  assert.match(composerFn, /isAsking && !scopedQuestionInOverlay/)
  assert.doesNotMatch(invoicePanel, /<AiQuestions/)
  assert.match(questions, /rounded-t-lg border-b-0/)
  assert.match(questions, /max-h-\[min\(420px,50vh\)\]/)
})

test("attachment order is attach, then measurement, then assets", () => {
  assert.deepEqual(COMPOSER_LEFT_CONTROL_ORDER, [
    "attach",
    "measurement",
    "assets",
  ])
  assert.deepEqual(composerLeftControlsOrder(), [
    "attach",
    "measurement",
    "assets",
  ])
})

test("reference-aware placeholder and blank Recreate this remain", () => {
  assert.equal(resolveComposerPlaceholder(false), null)
  assert.match(resolveComposerPlaceholder(true) ?? "", /preserve or change/)
  assert.equal(resolveGenerationPrompt("", true), REFERENCE_RECREATE_PROMPT)
})

test("clarification engine budgets remain unchanged", () => {
  assert.equal(CLARIFICATION_BUDGET, 4)
  const detailed = planClarification({
    prompt: PORTFOLIO_HERO_PROMPT,
    kind: "initial-generation",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: false,
    resolved: [],
    askedCount: 0,
    round: 0,
  })
  assert.equal(detailed.questions.length, 0)
  const vague = planClarification({
    prompt: "Create a premium invoice.",
    kind: "initial-generation",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: false,
    resolved: [],
    askedCount: 0,
    round: 0,
  })
  assert.ok(vague.questions.length <= 2)
  const first = vague.questions[0]
  assert.equal(first?.id, "visualDirection")
  assert.ok(first && "options" in first)
  if (first && "options" in first) {
    assert.ok(
      !first.options.some((option) =>
        typeof option === "string" ? option === DECIDE_VALUE : option.id === DECIDE_VALUE
      )
    )
  }
})

test("Use your judgment CTA is a single non-wrapping label", () => {
  assert.equal(USE_YOUR_JUDGMENT_LABEL, "Use your judgment")
  assert.equal(USE_YOUR_JUDGMENT_LABEL.includes("\n"), false)
  const questions = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "components/ai/ai-questions.tsx"),
    "utf8"
  )
  assert.match(questions, /whitespace-nowrap[\s\S]*\{USE_YOUR_JUDGMENT_LABEL\}/)
})

test("two known questions report 1 of 2 then 2 of 2", () => {
  const first = planClarification({
    prompt: "Create something premium.",
    kind: "initial-generation",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: false,
    resolved: [],
    askedCount: 0,
    round: 0,
  })
  assert.equal(first.questions.length, 1)
  assert.ok(first.askableCount >= 2)
  const opening = clarificationSequenceState({
    askedCount: 0,
    askableCount: first.askableCount,
    activeIndex: 0,
  })
  assert.equal(opening.current, 1)
  assert.equal(opening.total, first.askableCount)

  const resolved = applyAnswersToDecisions(
    [],
    first.questions,
    { [first.questions[0]!.id]: "services" },
    "Create something premium."
  )
  const second = planClarification({
    prompt: "Create something premium.",
    kind: "initial-generation",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: false,
    resolved,
    askedCount: first.questions.length,
    round: 1,
  })
  assert.equal(second.questions.length, 1)
  const follow = clarificationSequenceState({
    askedCount: first.questions.length,
    askableCount: second.askableCount,
    activeIndex: 0,
  })
  assert.equal(follow.current, 2)
  assert.equal(follow.total, 2)
})

test("three-question sequence walks 1/3 then 2/3 then 3/3", () => {
  const first = clarificationSequenceState({
    askedCount: 0,
    askableCount: 3,
    activeIndex: 0,
  })
  assert.deepEqual(first, { current: 1, total: 3 })
  const second = clarificationSequenceState({
    askedCount: 1,
    askableCount: 2,
    activeIndex: 0,
  })
  assert.deepEqual(second, { current: 2, total: 3 })
  const third = clarificationSequenceState({
    askedCount: 1,
    askableCount: 2,
    activeIndex: 1,
  })
  assert.deepEqual(third, { current: 3, total: 3 })
})

test("historical stepper marks completed, current, and upcoming steps", () => {
  assert.deepEqual(clarificationStepperStates(1, 3), [
    "current",
    "upcoming",
    "upcoming",
  ])
  assert.deepEqual(clarificationStepperStates(2, 3), [
    "completed",
    "current",
    "upcoming",
  ])
  assert.deepEqual(clarificationStepperStates(3, 3), [
    "completed",
    "completed",
    "current",
  ])
})

test("global origin renders globally and inspector origin stays contextual", () => {
  assert.equal(showsGlobalClarification("global"), true)
  assert.equal(showsGlobalClarification("inspector"), false)
  assert.equal(
    showsInspectorClarification("inspector", "placed-billing", "placed-billing"),
    true
  )
  assert.equal(
    showsInspectorClarification("inspector", "placed-billing", "Totals"),
    false
  )
  assert.equal(
    showsInspectorClarification("global", "placed-billing", "placed-billing"),
    false
  )
})

test("property clarification preserves selected element id if inspect changes", () => {
  assert.equal(
    scopedClarificationTarget("inspector", "placed-billing"),
    "placed-billing"
  )
  assert.equal(scopedClarificationTarget("global", "placed-billing"), null)
})

test("typed and judgment answers still route through existing decisions", () => {
  assert.equal(
    interpretFreeformAnswer(visualQuestion, "Clean, premium and not too corporate."),
    "minimal"
  )
  assert.equal(interpretFreeformAnswer(visualQuestion, "use your judgment"), DECIDE_VALUE)
})

test("scoped edit resumes after clarification without leaking to global", () => {
  const scoped = planClarification({
    prompt: "Make this feel more premium.",
    kind: "selected-element-edit",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: true,
    resolved: [],
    askedCount: 0,
    round: 0,
  })
  assert.equal(scoped.questions.length, 1)
  assert.ok(scoped.askableCount >= 1)
  assert.equal(showsGlobalClarification("inspector"), false)
  const next = planClarification({
    prompt: "Make this feel more premium.",
    kind: "selected-element-edit",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: true,
    resolved: applyAnswersToDecisions(
      [],
      scoped.questions,
      { visualDirection: "professional" },
      "Make this feel more premium."
    ),
    askedCount: 1,
    round: 1,
  })
  assert.equal(next.questions.length, 0)
})

test("document-action clarification still asks discount only after the action", () => {
  const discount = planClarification({
    prompt: "Add a discount row",
    kind: "document-edit",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: true,
    resolved: [],
    askedCount: 0,
    round: 0,
  })
  assert.deepEqual(
    discount.questions.map((question) => question.id),
    ["discountType"]
  )
  assert.equal(showsGlobalClarification("global"), true)
})
