/** Sparse enough that the clarification planner asks a first-round question. */
export const CAPTURE_SPARSE_PROMPT = "Make an invoice"

/**
 * Detailed enough to skip clarification. Resolves through the normal family
 * scorer (premium + studio + branded header → brand family, blue accent).
 */
export const CAPTURE_DETAILED_PROMPT =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."

export const CAPTURE_SCOPED_LAYER = "Business name"
export const CAPTURE_SCOPED_EDIT = "make the font bold"

export const CAPTURE_SAMPLE_SOURCE_ID = "sample-detailed"
export const CAPTURE_INVOICE_SOURCE_ID = "inv-ABC97802786"

export function captureScopedUserText(): string {
  return `${CAPTURE_SCOPED_LAYER}: ${CAPTURE_SCOPED_EDIT}`
}
