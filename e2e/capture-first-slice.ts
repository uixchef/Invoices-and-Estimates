/**
 * Portfolio capture stills + trimmed gen-ready live recording.
 *
 *   NEXT_PUBLIC_PORTFOLIO_CAPTURE=true npx tsx e2e/capture-first-slice.ts
 */
import { mkdir, rename } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium } from "playwright"

import { trimWebm } from "./trim-webm"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS_DIR = join(__dirname, "..", "artifacts", "portfolio-capture")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const SESSION_KEY = "invoice-builder-session-v1"
const SETTLE_MS = 1750

const STILL_STATES = [
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

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  await mkdir(ARTIFACTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  })

  const page = await context.newPage()
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)

  const stillPaths: string[] = []
  for (const state of STILL_STATES) {
    const url = `${BASE_URL}/invoices/layouts/builder?portfolioCapture=${state}`
    await page.goto(url, { waitUntil: "networkidle" })
    await page.waitForFunction(
      (expected) =>
        document.documentElement.dataset.portfolioCapture === expected &&
        document.documentElement.dataset.portfolioCaptureMode === "still" &&
        document.documentElement.dataset.portfolioCaptureReady === "1",
      state,
      { timeout: 20_000 }
    )
    await pause(800)
    const path = join(ARTIFACTS_DIR, `${state}-still.png`)
    await page.screenshot({ path, fullPage: true })
    stillPaths.push(path)
    console.log(`Wrote ${path}`)
  }

  const control = await context.newPage()
  await control.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)
  await control.goto(`${BASE_URL}/invoices/layouts/builder`, {
    waitUntil: "networkidle",
  })
  await pause(800)
  const captureAttr = await control.evaluate(
    () => document.documentElement.dataset.portfolioCapture ?? ""
  )
  if (captureAttr) {
    throw new Error(
      `Normal builder URL activated capture (${captureAttr}); query-less path must stay unchanged`
    )
  }
  const controlPath = join(ARTIFACTS_DIR, "builder-without-capture.png")
  await control.screenshot({ path: controlPath, fullPage: true })
  stillPaths.push(controlPath)
  await control.close()

  const recordedAt = Date.now()
  const liveContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: ARTIFACTS_DIR, size: { width: 1920, height: 1080 } },
  })
  const recorded = await liveContext.newPage()
  await recorded.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)
  await recorded.goto(
    `${BASE_URL}/invoices/layouts/builder?portfolioCapture=gen-ready&portfolioCaptureLive=1`,
    { waitUntil: "domcontentloaded" }
  )
  await recorded.waitForFunction(
    () =>
      document.documentElement.dataset.portfolioCapture === "gen-ready" &&
      document.documentElement.dataset.portfolioCaptureMode === "live" &&
      document.documentElement.dataset.portfolioCaptureReady === "1" &&
      document.documentElement.dataset.portfolioCaptureStatus === "reasoning",
    undefined,
    { timeout: 20_000 }
  )
  const trimStartMs = Date.now() - recordedAt
  await recorded.waitForFunction(
    () => document.documentElement.dataset.portfolioCaptureStatus === "ready",
    undefined,
    { timeout: 20_000 }
  )
  await pause(SETTLE_MS)
  const trimDurationMs = Date.now() - recordedAt - trimStartMs
  const liveVideo = recorded.video()
  await liveContext.close()

  const liveOut = join(ARTIFACTS_DIR, "gen-ready-live.webm")
  if (liveVideo) {
    const rawPath = await liveVideo.path()
    const rawCopy = join(ARTIFACTS_DIR, "gen-ready-live.raw.webm")
    await rename(rawPath, rawCopy)
    await trimWebm(browser, rawCopy, liveOut, trimStartMs, trimDurationMs)
    console.log(
      `Trimmed live clip start=${trimStartMs}ms duration=${trimDurationMs}ms → ${liveOut}`
    )
  }

  await cleanupIntermediateVideos(ARTIFACTS_DIR)

  await browser.close()

  const { spawn } = await import("node:child_process")
  spawn("open", ["-R", ...stillPaths], { stdio: "ignore", detached: true }).unref()
  console.log(`Opened ${stillPaths.length} stills in Finder`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
