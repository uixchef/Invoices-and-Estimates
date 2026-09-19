export type ConversationScrollMetrics = {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}

/** Distance from the true bottom that still counts as "at latest". */
export const CONVERSATION_NEAR_BOTTOM_PX = 72

export function distanceFromBottom(metrics: ConversationScrollMetrics): number {
  return metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop
}

export function isNearBottom(
  metrics: ConversationScrollMetrics,
  thresholdPx = CONVERSATION_NEAR_BOTTOM_PX
): boolean {
  if (metrics.scrollHeight <= metrics.clientHeight) {
    return true
  }
  return distanceFromBottom(metrics) <= thresholdPx
}

export function latestScrollTop(metrics: ConversationScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight)
}

export type ConversationScrollDecision = {
  stickToLatest: boolean
  alignToLatest: boolean
}

/** Reopening / first paint of a transcript with history jumps to latest. */
export function conversationOnEntry(hasHistory: boolean): ConversationScrollDecision {
  if (!hasHistory) {
    return { stickToLatest: true, alignToLatest: false }
  }
  return { stickToLatest: true, alignToLatest: true }
}

/** Panel tools replace the transcript; returning is a fresh entry. */
export function conversationOnPanelReentry(
  hasHistory: boolean
): ConversationScrollDecision {
  return conversationOnEntry(hasHistory)
}

export function conversationOnUserScroll(
  metrics: ConversationScrollMetrics
): ConversationScrollDecision {
  const stickToLatest = isNearBottom(metrics)
  return { stickToLatest, alignToLatest: false }
}

export function conversationOnSubmit(): ConversationScrollDecision {
  return { stickToLatest: true, alignToLatest: true }
}

export function conversationOnContentChange(
  stickToLatest: boolean
): ConversationScrollDecision {
  return { stickToLatest, alignToLatest: stickToLatest }
}

/** Clarification rounds must not treat the transcript as a new conversation. */
export function conversationOnClarificationChange(
  stickToLatest: boolean
): ConversationScrollDecision {
  return { stickToLatest, alignToLatest: stickToLatest }
}

export function applyConversationScroll(
  metrics: ConversationScrollMetrics,
  decision: ConversationScrollDecision
): number | null {
  if (!decision.alignToLatest) {
    return null
  }
  return latestScrollTop(metrics)
}
