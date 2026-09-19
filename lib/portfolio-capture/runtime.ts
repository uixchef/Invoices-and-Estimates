/**
 * Dev-only portfolio capture runtime.
 *
 * Activation requires BOTH:
 *   NEXT_PUBLIC_PORTFOLIO_CAPTURE=true
 *   ?portfolioCapture=<state>
 *
 * A query parameter alone must never change product behaviour.
 */

export const PRODUCT_BUILDER_SESSION_KEY = "invoice-builder-session-v1"

export const PORTFOLIO_CAPTURE_ENV = "NEXT_PUBLIC_PORTFOLIO_CAPTURE"

/** Canonical clock for capture documents (17 Sep 2026, 12:00 UTC). */
export const CAPTURE_CLOCK_MS = Date.UTC(2026, 8, 17, 12, 0, 0)

export const CAPTURE_LIVE_REASONING_MS = 1800
export const CAPTURE_LIVE_THINKING_MS = 2800

export const CAPTURE_STATE_IDS = [
  "blank",
  "clarify-required",
  "clarify-skipped",
  "gen-ready",
  "scoped-edit",
  "visual-edit",
  "preview-sample",
  "preview-invoice",
  "code-ejected",
] as const

export type CaptureStateId = (typeof CAPTURE_STATE_IDS)[number]

export type PortfolioCaptureRequest = {
  state: CaptureStateId
  live: boolean
}

type CaptureRuntime = {
  request: PortfolioCaptureRequest | null
  messageSeq: number
}

const runtime: CaptureRuntime = {
  request: null,
  messageSeq: 0,
}

export function isCaptureStateId(value: string | null): value is CaptureStateId {
  return (
    typeof value === "string" &&
    (CAPTURE_STATE_IDS as readonly string[]).includes(value)
  )
}

const CAPTURE_ENV_VALUE = process.env.NEXT_PUBLIC_PORTFOLIO_CAPTURE

export function isPortfolioCaptureEnvEnabled(
  env?: Record<string, string | undefined>
): boolean {
  const value =
    env === undefined
      ? CAPTURE_ENV_VALUE
      : env.NEXT_PUBLIC_PORTFOLIO_CAPTURE
  return value === "true"
}

export function parsePortfolioCaptureSearch(
  search: string,
  env?: Record<string, string | undefined>
): PortfolioCaptureRequest | null {
  if (!isPortfolioCaptureEnvEnabled(env)) {
    return null
  }

  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  const state = params.get("portfolioCapture")
  if (!isCaptureStateId(state)) {
    return null
  }

  const liveRaw = params.get("portfolioCaptureLive")
  const live = liveRaw === "1" || liveRaw === "true"

  return { state, live }
}

export function readPortfolioCaptureRequest(
  env?: Record<string, string | undefined>
): PortfolioCaptureRequest | null {
  if (typeof window === "undefined") {
    return null
  }
  return parsePortfolioCaptureSearch(window.location.search, env)
}

export function activatePortfolioCapture(request: PortfolioCaptureRequest) {
  const same =
    runtime.request?.state === request.state &&
    runtime.request?.live === request.live
  runtime.request = request
  if (!same) {
    runtime.messageSeq = 0
  }
}

export function deactivatePortfolioCapture() {
  runtime.request = null
  runtime.messageSeq = 0
}

export function isPortfolioCaptureActive(): boolean {
  return runtime.request !== null
}

export function isPortfolioCaptureLive(): boolean {
  return runtime.request?.live === true
}

export function isPortfolioCaptureStill(): boolean {
  return runtime.request !== null && runtime.request.live === false
}

export function getActivePortfolioCapture(): PortfolioCaptureRequest | null {
  return runtime.request
}

export function shouldPersistBuilderSession(): boolean {
  return !isPortfolioCaptureActive()
}

export function shouldSkipSimulatedTimers(): boolean {
  return isPortfolioCaptureStill()
}

export function shouldFreezeCaptureMotion(): boolean {
  return isPortfolioCaptureStill()
}

export function getReasoningDelayMs(defaultMs: number): number {
  if (!isPortfolioCaptureActive()) {
    return defaultMs
  }
  if (isPortfolioCaptureStill()) {
    return defaultMs
  }
  return CAPTURE_LIVE_REASONING_MS
}

export function getThinkingDelayMs(defaultMs: number): number {
  if (!isPortfolioCaptureActive()) {
    return defaultMs
  }
  if (isPortfolioCaptureStill()) {
    return defaultMs
  }
  return CAPTURE_LIVE_THINKING_MS
}

export function getBuilderNow(): Date {
  if (isPortfolioCaptureActive()) {
    return new Date(CAPTURE_CLOCK_MS)
  }
  return new Date()
}

export function nextCaptureMessageId(): string {
  runtime.messageSeq += 1
  return `capture-msg-${runtime.messageSeq}`
}

export function captureMessageId(index: number): string {
  runtime.messageSeq = Math.max(runtime.messageSeq, index)
  return `capture-msg-${index}`
}

export function primeCaptureMessageCounter(lastUsed: number) {
  runtime.messageSeq = lastUsed
}

export function syncCaptureDom(
  request: PortfolioCaptureRequest | null,
  extras?: {
    status?: string
    applied?: boolean
    ready?: boolean
  }
) {
  if (typeof document === "undefined") {
    return
  }
  const root = document.documentElement
  if (!request) {
    delete root.dataset.portfolioCapture
    delete root.dataset.portfolioCaptureMode
    delete root.dataset.portfolioCaptureStatus
    delete root.dataset.portfolioCaptureApplied
    delete root.dataset.portfolioCaptureReady
    return
  }
  root.dataset.portfolioCapture = request.state
  root.dataset.portfolioCaptureMode = request.live ? "live" : "still"
  if (extras?.status) {
    root.dataset.portfolioCaptureStatus = extras.status
  } else {
    delete root.dataset.portfolioCaptureStatus
  }
  if (extras?.applied) {
    root.dataset.portfolioCaptureApplied = "1"
  } else {
    delete root.dataset.portfolioCaptureApplied
  }
  if (extras?.ready) {
    root.dataset.portfolioCaptureReady = "1"
  } else {
    delete root.dataset.portfolioCaptureReady
  }
}

/**
 * True once capture has applied its fixture and the builder is in the intended
 * phase. Live generation waits for reasoning (not the pre-apply idle canvas).
 */
export function isIntendedCaptureMounted(input: {
  applied: boolean
  live: boolean
  status: string
  stillStatus: string
  liveKickoff: "none" | "initial-generation" | "scoped-follow-up"
}): boolean {
  if (!input.applied) {
    return false
  }
  if (!input.live || input.liveKickoff === "none") {
    return input.status === input.stillStatus
  }
  return (
    input.status === "reasoning" ||
    input.status === "asking" ||
    input.status === "thinking" ||
    input.status === "ready"
  )
}
