/**
 * Full-size family stills + dashboard first viewport.
 *
 *   NEXT_PUBLIC_PORTFOLIO_CAPTURE=true npx tsx e2e/capture-layout-families.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

import { LAYOUT_FAMILY_IDS } from "../lib/layout-family"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS_DIR = join(__dirname, "..", "artifacts", "layout-families")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  await mkdir(ARTIFACTS_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await page.waitForFunction(
    () =>
      document.querySelectorAll("article [aria-busy='true']").length === 0 &&
      document.querySelectorAll("article").length > 0,
    undefined,
    { timeout: 12_000 }
  )
  await pause(400)
  const dashboardPath = join(ARTIFACTS_DIR, "dashboard-first-viewport.png")
  await page.screenshot({ path: dashboardPath })
  console.log(`Wrote ${dashboardPath}`)

  await page.goto(`${BASE_URL}/family-review`, { waitUntil: "networkidle" })
  await pause(800)

  const stillPaths = [dashboardPath]
  for (const family of LAYOUT_FAMILY_IDS) {
    const node = page.locator(`[data-family="${family}"]`)
    await node.scrollIntoViewIfNeeded()
    const path = join(ARTIFACTS_DIR, `family-${family}.png`)
    await node.screenshot({ path })
    stillPaths.push(path)
    console.log(`Wrote ${path}`)
  }

  const overlay = page.locator('[data-family="overlay-eur"]')
  await overlay.scrollIntoViewIfNeeded()
  const overlayPath = join(ARTIFACTS_DIR, "family-overlay-eur.png")
  await overlay.screenshot({ path: overlayPath })
  stillPaths.push(overlayPath)

  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await page.waitForFunction(
    () =>
      document.querySelectorAll("article [aria-busy='true']").length === 0 &&
      document.querySelectorAll("article").length >= 6,
    undefined,
    { timeout: 12_000 }
  )
  await pause(500)
  for (let i = 0; i < 6; i++) {
    const path = join(ARTIFACTS_DIR, `thumb-draft-${i + 1}.png`)
    await page.locator("article").nth(i).screenshot({ path })
    stillPaths.push(path)
  }

  await page.goto(
    `${BASE_URL}/invoices/layouts/builder?portfolioCapture=clarify-skipped`,
    { waitUntil: "networkidle" }
  )
  await page.waitForFunction(
    () => document.documentElement.dataset.portfolioCaptureReady === "1",
    undefined,
    { timeout: 20_000 }
  )
  await pause(600)
  const carouselPath = join(ARTIFACTS_DIR, "generation-carousel.png")
  await page.screenshot({ path: carouselPath })
  stillPaths.push(carouselPath)

  const fieldExplore = join(ARTIFACTS_DIR, "field-exploration.png")
  await page.screenshot({ path: fieldExplore })
  stillPaths.push(fieldExplore)

  const proposalNames = [
    "studio",
    "editorial",
    "statement",
    "swiss",
    "atelier",
  ] as const
  for (let i = 0; i < proposalNames.length; i++) {
    await page
      .locator('[data-generation-carousel] button[aria-label^="Show"]')
      .nth(i)
      .click()
    await pause(400)
    const path = join(ARTIFACTS_DIR, `carousel-${proposalNames[i]}.png`)
    await page.screenshot({ path })
    stillPaths.push(path)
  }

  const otherDirection = join(ARTIFACTS_DIR, "field-other-direction.png")
  await page
    .locator('[data-generation-carousel] button[aria-label="Show Editorial masthead"]')
    .click()
  await pause(500)
  await page.screenshot({ path: otherDirection })
  stillPaths.push(otherDirection)

  const livePage = await context.newPage()
  await livePage.addInitScript(() => {
    sessionStorage.removeItem("invoice-builder-session-v1")
  })
  await livePage.goto(
    `${BASE_URL}/invoices/layouts/builder?portfolioCapture=gen-ready&portfolioCaptureLive=1`,
    { waitUntil: "domcontentloaded" }
  )
  await livePage.waitForFunction(
    () =>
      document.documentElement.dataset.portfolioCaptureStatus === "reasoning" &&
      Boolean(
        document.querySelector(
          '[data-generation-carousel] [role="img"]'
        )
      ),
    undefined,
    { timeout: 20_000 }
  )
  await pause(120)
  const fieldReasoning = join(ARTIFACTS_DIR, "field-reasoning.png")
  await livePage.screenshot({ path: fieldReasoning })
  stillPaths.push(fieldReasoning)

  await livePage.waitForFunction(
    () =>
      document.documentElement.dataset.portfolioCaptureStatus === "thinking",
    undefined,
    { timeout: 20_000 }
  )
  await pause(250)
  const fieldThinkingLive = join(ARTIFACTS_DIR, "field-thinking-live.png")
  await livePage.screenshot({ path: fieldThinkingLive })
  stillPaths.push(fieldThinkingLive)

  await livePage.waitForFunction(
    () => document.documentElement.dataset.portfolioCaptureStatus === "ready",
    undefined,
    { timeout: 20_000 }
  )
  await pause(400)
  const fieldResolved = join(ARTIFACTS_DIR, "field-resolved.png")
  await livePage.screenshot({ path: fieldResolved })
  stillPaths.push(fieldResolved)
  await livePage.close()

  await browser.close()

  const { spawn } = await import("node:child_process")
  spawn("open", ["-R", ...stillPaths], { stdio: "ignore", detached: true }).unref()
  spawn("open", [ARTIFACTS_DIR], { stdio: "ignore", detached: true }).unref()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
