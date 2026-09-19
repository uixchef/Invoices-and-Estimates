import assert from "node:assert/strict"
import test from "node:test"

import { PORTFOLIO_HERO_PROMPT } from "./layout-family"
import {
  answersToDecisions,
  applyAnswersToDecisions,
  applyClarificationLayoutEffects,
  CLARIFICATION_BUDGET,
  DECIDE_VALUE,
  decisionsToAnswers,
  extractDecisionsFromPrompt,
  inferClarificationKind,
  planClarification,
  resolvedForScopedClarification,
  visualDirectionToFamily,
  type ClarificationInput,
  type ResolvedDecision,
} from "./clarification"
import type { GeneratedLayout } from "./layout-builder-types"
import { FAMILY_ACCENT } from "./layout-family"
import { demoPaymentDetails } from "./demo-payment"

const BASE_CONTEXT = {
  hasReference: false,
  hasBrandBoard: false,
  paperKnown: true,
  documentTypeKnown: true,
  generatedOnce: false,
  askedCount: 0,
  round: 0,
} as const

function input(
  prompt: string,
  overrides: Partial<ClarificationInput> = {}
): ClarificationInput {
  return {
    prompt,
    kind: "initial-generation",
    resolved: [],
    ...BASE_CONTEXT,
    ...overrides,
  }
}

function ids(plan: { questions: { id: string }[] }): string[] {
  return plan.questions.map((question) => question.id)
}

function layoutStub(): GeneratedLayout {
  const documentNumber = "INV-2026-0142"
  const businessName = "Harbor"
  return {
    documentType: "Standard invoice",
    businessName,
    clientName: "Atelier",
    emphasis: null,
    style: "studio",
    accent: FAMILY_ACCENT.studio,
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Design", qty: 1, rate: 1000 }],
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber,
    issueDate: "Sep 18, 2026",
    dueDate: "Oct 2, 2026",
    payment: demoPaymentDetails({ businessName, documentNumber }),
  }
}

test("1. detailed initial prompt asks zero questions", () => {
  const plan = planClarification(input(PORTFOLIO_HERO_PROMPT))
  assert.deepEqual(ids(plan), [])
  assert.equal(plan.canProceed, true)
})

test("2. vague initial prompt asks no more than 2 in first round", () => {
  const plan = planClarification(input("Create a premium invoice."))
  assert.ok(plan.questions.length >= 1)
  assert.ok(plan.questions.length <= 2)
  assert.ok(plan.questions.every((question) => question.id !== "paperSize"))
})

test("3. first answer can eliminate a planned second question", () => {
  const first = planClarification(input("Create something premium."))
  assert.deepEqual(ids(first), ["documentPurpose"])

  const resolved = applyAnswersToDecisions(
    first.inferred,
    first.questions,
    { documentPurpose: "Consulting, keep it minimal and swiss" },
    "Create something premium."
  )
  const second = planClarification(
    input("Create something premium.", {
      resolved,
      askedCount: 1,
      round: 1,
    })
  )
  assert.equal(second.questions.length, 0)
  assert.ok(resolved.some((entry) => entry.dimension === "visualDirection"))
})

test("4. a second round occurs only when unresolved high-value ambiguity remains", () => {
  const first = planClarification(input("Create something premium."))
  const resolved = applyAnswersToDecisions(
    [],
    first.questions,
    { documentPurpose: "services" },
    "Create something premium."
  )
  const second = planClarification(
    input("Create something premium.", {
      resolved,
      askedCount: first.questions.length,
      round: 1,
    })
  )
  assert.deepEqual(ids(second), ["visualDirection"])
})

test("5. total clarification budget is respected", () => {
  const plan = planClarification(
    input("Create a premium invoice.", {
      askedCount: CLARIFICATION_BUDGET,
      round: 3,
      resolved: [],
    })
  )
  assert.equal(plan.questions.length, 0)
})

test("6. Decide for me resolves the dimension", () => {
  const first = planClarification(input("Create a premium invoice."))
  assert.ok(ids(first).includes("visualDirection"))
  const resolved = applyAnswersToDecisions(
    [],
    first.questions,
    { visualDirection: DECIDE_VALUE },
    "Create a premium invoice."
  )
  assert.ok(
    resolved.some(
      (entry) =>
        entry.dimension === "visualDirection" &&
        entry.source === "merchant-answer"
    )
  )
  const again = planClarification(
    input("Create a premium invoice.", {
      resolved,
      askedCount: 1,
      round: 1,
    })
  )
  assert.ok(!ids(again).includes("visualDirection"))
  assert.equal(again.questions.length, 0)
})

test("7. same dimension is never asked twice", () => {
  const resolved: ResolvedDecision[] = [
    {
      dimension: "visualDirection",
      value: "editorial",
      source: "merchant-answer",
    },
  ]
  const plan = planClarification(
    input("Create a premium invoice.", { resolved })
  )
  assert.ok(!ids(plan).includes("visualDirection"))
})

test("8. reference + explicit keep structure, change style asks no redundant preservation question", () => {
  const plan = planClarification(
    input("Keep this structure but make it blue and more minimal.", {
      kind: "reference-reconstruction",
      hasReference: true,
    })
  )
  assert.equal(plan.questions.length, 0)
})

test("9. reference with no instruction can ask a reference-specific clarification", () => {
  const plan = planClarification(
    input("", {
      kind: "reference-reconstruction",
      hasReference: true,
    })
  )
  assert.deepEqual(ids(plan), ["referenceIntent"])
})

test("10. element-scoped edit asks no more than one question", () => {
  const plan = planClarification(
    input("make it nicer", {
      kind: "selected-element-edit",
      generatedOnce: true,
    })
  )
  assert.ok(plan.questions.length <= 1)
  assert.equal(plan.questions.length, 1)
  assert.equal(plan.questions[0]?.id, "visualDirection")
  const concrete = planClarification(
    input("make the font bold", {
      kind: "selected-element-edit",
      generatedOnce: true,
    })
  )
  assert.equal(concrete.questions.length, 0)
})

test("scoped follow-up still asks when the document already has a visual direction", () => {
  const inherited: ResolvedDecision[] = [
    {
      dimension: "visualDirection",
      value: "professional",
      source: "merchant-answer",
    },
  ]
  const blocked = planClarification(
    input("Make this feel more premium.", {
      kind: "selected-element-edit",
      generatedOnce: true,
      resolved: inherited,
    })
  )
  assert.equal(blocked.questions.length, 0)
  const scoped = planClarification(
    input("Make this feel more premium.", {
      kind: "selected-element-edit",
      generatedOnce: true,
      resolved: resolvedForScopedClarification(inherited),
    })
  )
  assert.equal(scoped.questions.length, 1)
  assert.equal(scoped.questions[0]?.id, "visualDirection")
})

test("11. existing Brand Board prevents unnecessary brand questions", () => {
  const plan = planClarification(
    input("Update the colours", {
      kind: "brand-edit",
      generatedOnce: true,
      hasBrandBoard: true,
    })
  )
  assert.ok(!ids(plan).includes("brandPreference"))
  assert.equal(plan.questions.length, 0)
})

test("12. existing A4 state prevents paper-size question", () => {
  const plan = planClarification(input("Make an invoice"))
  assert.ok(!ids(plan).includes("paperSize"))
  const extracted = extractDecisionsFromPrompt("Make an invoice", {
    kind: "initial-generation",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: false,
  })
  assert.ok(extracted.some((entry) => entry.dimension === "paperSize"))
})

test("13. answers actually alter generated/edit state", () => {
  const editorial = applyClarificationLayoutEffects(layoutStub(), {
    visualDirection: "editorial",
  })
  assert.equal(editorial.style, "editorial")

  const discount = applyClarificationLayoutEffects(layoutStub(), {
    discountType: "percent-20",
  })
  assert.equal(discount.sections.discount, true)
  assert.equal(discount.discountRate, 0.2)

  const products = applyClarificationLayoutEffects(layoutStub(), {
    documentPurpose: "products",
  })
  assert.equal(products.emphasis, "products")
  assert.match(products.lineItems[0].description, /kit|pack|Shipping/i)
  assert.equal(visualDirectionToFamily("minimal"), "swiss")
})

test("14. follow-up edit preserves previous clarification decisions", () => {
  const resolved: ResolvedDecision[] = [
    {
      dimension: "visualDirection",
      value: "editorial",
      source: "merchant-answer",
    },
  ]
  const plan = planClarification(
    input("Add payment terms", {
      kind: "document-edit",
      generatedOnce: true,
      resolved,
    })
  )
  assert.equal(plan.questions.length, 0)
  const answers = decisionsToAnswers(resolved)
  assert.equal(answers.style, "editorial")
  assert.deepEqual(answersToDecisions(answers)[0]?.dimension, "visualDirection")
})

test("15. contradictory later instruction replaces older resolved preference", () => {
  const prior: ResolvedDecision[] = [
    {
      dimension: "visualDirection",
      value: "minimal",
      source: "merchant-answer",
    },
  ]
  const extracted = extractDecisionsFromPrompt(
    "Make it visually loud with large expressive typography",
    {
      kind: "document-edit",
      hasReference: false,
      hasBrandBoard: false,
      paperKnown: true,
      documentTypeKnown: true,
      generatedOnce: true,
    }
  )
  const merged = [...prior.filter((entry) => entry.dimension !== "visualDirection"), ...extracted.filter((entry) => entry.dimension === "visualDirection")]
  const visual = merged.find((entry) => entry.dimension === "visualDirection")
  assert.equal(visual?.source, "prompt")
  assert.equal(visualDirectionToFamily(visual?.value ?? ""), "statement")

  const plan = planClarification(
    input("Make it visually loud with large expressive typography", {
      kind: "document-edit",
      generatedOnce: true,
      resolved: prior,
    })
  )
  assert.equal(plan.questions.length, 0)
})

test("style-only follow-up prompts do not re-score family", () => {
  const extracted = extractDecisionsFromPrompt(
    "Switch to a bold, branded color scheme",
    {
      kind: "document-edit",
      hasReference: false,
      hasBrandBoard: false,
      paperKnown: true,
      documentTypeKnown: true,
      generatedOnce: true,
    }
  )
  assert.equal(
    extracted.some((entry) => entry.dimension === "visualDirection"),
    false
  )
  const statement = applyClarificationLayoutEffects(layoutStub(), {
    visualDirection: "bold",
    ...decisionsToAnswers(extracted),
  })
  assert.equal(statement.style, "statement")
})

test("discount clarification belongs to the discount action", () => {
  const plan = planClarification(
    input("Add a discount row", {
      kind: "document-edit",
      generatedOnce: true,
    })
  )
  assert.deepEqual(ids(plan), ["discountType"])
  assert.equal(
    plan.resolved.some((entry) => entry.dimension === "discountType"),
    false
  )
  const unanswered = applyClarificationLayoutEffects(layoutStub(), {})
  assert.equal(unanswered.sections.discount, false)

  const priorDiscount: ResolvedDecision[] = [
    {
      dimension: "discountType",
      value: "percent-15",
      source: "merchant-answer",
    },
  ]
  const payPlan = planClarification(
    input("Add a 'Pay online' button", {
      kind: "add-element",
      generatedOnce: true,
      resolved: priorDiscount,
    })
  )
  assert.equal(ids(payPlan).includes("discountType"), false)
  const extractedPay = extractDecisionsFromPrompt("Add a 'Pay online' button", {
    kind: "add-element",
    hasReference: false,
    hasBrandBoard: false,
    paperKnown: true,
    documentTypeKnown: true,
    generatedOnce: true,
  })
  assert.equal(
    extractedPay.some((entry) => entry.dimension === "discountType"),
    false
  )
})

test("infer kind covers reference, add element, and scoped edit", () => {
  assert.equal(
    inferClarificationKind({
      hasGeneratedOnce: false,
      hasReference: true,
      isScopedElement: false,
      prompt: "",
    }),
    "reference-reconstruction"
  )
  assert.equal(
    inferClarificationKind({
      hasGeneratedOnce: true,
      hasReference: false,
      isScopedElement: false,
      prompt: "Add a heading called Payment terms below the line items.",
    }),
    "add-element"
  )
  assert.equal(
    inferClarificationKind({
      hasGeneratedOnce: true,
      hasReference: false,
      isScopedElement: true,
      prompt: "make it nicer",
    }),
    "selected-element-edit"
  )
})
