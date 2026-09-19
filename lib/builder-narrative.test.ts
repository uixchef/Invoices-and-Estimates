import assert from "node:assert/strict"
import test from "node:test"

import { CAPTURE_DETAILED_PROMPT, CAPTURE_SPARSE_PROMPT } from "./portfolio-capture/prompts"
import {
  buildCompletionSummary,
  buildEditSummary,
  buildReasoning,
  buildTodoLabels,
  buildWorkingNarrative,
  detectMutation,
  isReferenceOnlyPrompt,
  workingPhaseFor,
} from "./builder-narrative"
import type { GeneratedLayout } from "./layout-builder-types"

const banned = [
  "The user wants",
  "Analyse prompt",
  "Translate the request",
  "Key requirements",
  "native reconstruction",
  "native layout elements",
  "native primitives",
  "Combined all references",
  "Analyzed all designs",
  "Blended the layouts",
  "Analyzing your references",
]

function assertProductCopy(text: string) {
  for (const phrase of banned) {
    assert.equal(
      text.includes(phrase),
      false,
      `unexpected boilerplate: ${phrase}\n${text}`
    )
  }
}

function layout(partial: Partial<GeneratedLayout> = {}): GeneratedLayout {
  return {
    documentType: "Standard invoice",
    businessName: "Northwind Studio",
    clientName: "Atelier Mär",
    emphasis: null,
    style: "studio",
    accent: "#1a4cff",
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
    lineItems: [
      { description: "Brand identity", qty: 1, rate: 4800 },
      { description: "Campaign system", qty: 1, rate: 3200 },
    ],
    taxRate: 0.1,
    discountRate: 0.1,
    documentNumber: "INV-2026-0142",
    issueDate: "Sep 17, 2026",
    dueDate: "Oct 1, 2026",
    payment: {
      bankName: "First National",
      accountName: "Northwind Studio",
      accountNumber: "1",
      routingNumber: "2",
      payUrl: "https://pay.example",
      payLabel: "Pay online",
    },
    ...partial,
  }
}

test("simple prompts stay short and skip the studio plan", () => {
  const request = { prompt: CAPTURE_SPARSE_PROMPT, paperName: "A4" }
  const todos = buildTodoLabels(request)
  const interpret = buildWorkingNarrative({ ...request, phase: "interpret" })
  const decide = buildWorkingNarrative({ ...request, phase: "decide" })

  assert.equal(todos.length, 3)
  assert.match(interpret, /straightforward A4 invoice/)
  assert.doesNotMatch(decide, /stronger hierarchy for brand/)
  assertProductCopy(decide)
})

test("detailed studio generation interprets then decides with a few bullets", () => {
  const request = {
    prompt: CAPTURE_DETAILED_PROMPT,
    family: "studio",
    paperName: "A4",
  }
  const todos = buildTodoLabels(request)
  const interpret = buildWorkingNarrative({ ...request, phase: "interpret" })
  const decide = buildWorkingNarrative({ ...request, phase: "decide" })
  const complete = buildCompletionSummary(layout(), request)

  assert.deepEqual(todos, [
    "Define the invoice hierarchy",
    "Establish the brand direction",
    "Structure client and service information",
    "Calculate totals and payment details",
    "Finish print-safe spacing",
  ])
  assert.match(interpret, /premium invoice for a creative studio/)
  assert.match(decide, /brand and amount due more visual weight/)
  assert.doesNotMatch(
    buildWorkingNarrative({ ...request, phase: "implement" }),
    /finishing type, spacing and totals/i
  )
  assert.match(complete, /Studio/)
  assert.doesNotMatch(complete, /native/)
  const completeReference = buildCompletionSummary(layout({ style: "statement" }), {
    prompt: "Recreate this.",
    hasReference: true,
    paperName: "A4",
  })
  assert.match(completeReference, /The reconstruction is ready/)
  assert.doesNotMatch(completeReference, /native/)
  assertProductCopy(`${interpret}\n${decide}\n${complete}\n${completeReference}`)
})

test("reference-only reconstruction acknowledges the attached layout", () => {
  const request = {
    prompt: "Recreate this.",
    hasReference: true,
    family: "statement",
    paperName: "A4",
  }
  assert.equal(isReferenceOnlyPrompt(request.prompt), true)
  const todos = buildTodoLabels(request)
  const interpret = buildWorkingNarrative({ ...request, phase: "interpret" })
  const implement = buildWorkingNarrative({ ...request, phase: "implement" })

  assert.deepEqual(todos, [
    "Read the reference structure",
    "Map the major regions",
    "Rebuild editable content",
    "Match the visual hierarchy",
    "Validate the final document",
  ])
  assert.match(interpret, /two-part composition/)
  assert.match(implement, /editable elements/)
  assert.doesNotMatch(implement, /native/)
  assert.doesNotMatch(implement, /computer vision|detecting pixels|OCR/i)
  assertProductCopy(implement)
})

test("reference plus modifier distinguishes preserve from change", () => {
  const request = {
    prompt: "Use this structure but make it blue and more minimal.",
    hasReference: true,
    family: "statement",
    paperName: "A4",
  }
  const todos = buildTodoLabels(request)
  const interpret = buildWorkingNarrative({ ...request, phase: "interpret" })
  assert.equal(todos.length, 4)
  assert.match(interpret, /preserve the reference’s split composition/i)
  assert.match(interpret, /blue/)
  assert.match(interpret, /simplifying the styling/)
})

test("follow-up mutations stay short and do not reuse reconstruct copy", () => {
  const discount = {
    prompt: "Add a discount row",
    isFollowUp: true,
    hasReference: true,
    family: "statement",
  }
  assert.equal(detectMutation(discount.prompt), "discount")
  assert.deepEqual(buildTodoLabels(discount), [
    "Add the discount row",
    "Recalculate dependent totals",
  ])
  assert.equal(
    buildWorkingNarrative({ ...discount, phase: "interpret" }),
    "I'll add a discount and recalculate the dependent totals."
  )
  assert.doesNotMatch(
    buildWorkingNarrative({ ...discount, phase: "interpret" }),
    /10%/
  )
  const afterDiscount = layout({
    sections: { ...layout().sections, discount: true },
  })
  assert.equal(
    buildEditSummary(layout(), afterDiscount),
    "Discount added. Subtotal, tax and amount due are updated."
  )

  const branded = {
    prompt: "Switch to a bold, branded color scheme",
    isFollowUp: true,
  }
  assert.equal(detectMutation(branded.prompt), "boldBrand")
  assert.equal(
    buildWorkingNarrative({ ...branded, phase: "interpret" }),
    "I'll strengthen the current brand treatment."
  )
  assert.doesNotMatch(
    buildWorkingNarrative({ ...branded, phase: "interpret" }),
    /discount|pay online|payment details/i
  )
})

test("working phases grow from interpretation to implementation", () => {
  assert.equal(workingPhaseFor("reasoning", 0, 5, false), "interpret")
  assert.equal(workingPhaseFor("thinking", 0, 5, false), "interpret")
  assert.equal(workingPhaseFor("thinking", 1, 5, false), "decide")
  assert.equal(workingPhaseFor("thinking", 3, 5, false), "implement")
  assert.equal(workingPhaseFor("thinking", 0, 2, true), "interpret")
  assert.equal(workingPhaseFor("thinking", 1, 2, true), "implement")

  const request = {
    prompt: CAPTURE_DETAILED_PROMPT,
    family: "studio" as const,
    paperName: "A4",
  }
  const interpret = buildWorkingNarrative({ ...request, phase: "interpret" })
  const decide = buildWorkingNarrative({ ...request, phase: "decide" })
  const implement = buildWorkingNarrative({ ...request, phase: "implement" })
  assert.ok(decide.startsWith(interpret))
  assert.ok(implement.startsWith(decide))
  assert.ok(implement.length > decide.length)
})

test("buildReasoning(prompt) remains valid for prompt-only callers", () => {
  const text = buildReasoning("Create a clean one-page invoice")
  assert.match(text, /restrained|straightforward|looking for/i)
  assertProductCopy(text)
})
