/**
 * Dashboard composer + image-reference reconstruction captures.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-composer-and-reference.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "composer-reference")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const REFERENCE = join(
  __dirname,
  "..",
  "public",
  "demo",
  "saffron-invoice-reference.png"
)
const SESSION_KEY = "invoice-builder-session-v1"

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)

  const stills: string[] = []

  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await page.waitForSelector("#create-with-ai-prompt")
  await pause(400)
  const empty = join(ARTIFACTS, "composer-empty.png")
  await page.screenshot({ path: empty })
  stills.push(empty)
  const hero = join(ARTIFACTS, "hero-gradient.png")
  await page.screenshot({ path: hero })
  stills.push(hero)

  await page.click("#create-with-ai-prompt")
  await pause(200)
  const focused = join(ARTIFACTS, "composer-focused.png")
  await page.screenshot({ path: focused })
  stills.push(focused)

  await page.fill("#create-with-ai-prompt", "Recreate this")
  await pause(200)
  const oneLine = join(ARTIFACTS, "composer-one-line.png")
  await page.screenshot({ path: oneLine })
  stills.push(oneLine)

  const long =
    "Use this structure but make it blue and more minimal, keep the itemised services and a clear amount due, and retain the original hierarchy of the reference."
  await page.fill("#create-with-ai-prompt", long)
  await pause(250)
  const expanded = join(ARTIFACTS, "composer-expanded.png")
  await page.screenshot({ path: expanded })
  stills.push(expanded)
  const multiline = join(ARTIFACTS, "composer-multiline.png")
  await page.screenshot({ path: multiline })
  stills.push(multiline)

  await page.fill("#create-with-ai-prompt", "")
  const fileInput = page.locator('input[type="file"][accept*="image"]')
  await fileInput.setInputFiles(REFERENCE)
  await pause(400)
  const referenceAware = join(ARTIFACTS, "composer-reference-aware.png")
  await page.screenshot({ path: referenceAware })
  stills.push(referenceAware)
  const attached = join(ARTIFACTS, "composer-attachment.png")
  await page.screenshot({ path: attached })
  stills.push(attached)

  await page.getByLabel("Generate layout").click()
  await page.waitForURL("**/invoices/layouts/builder", { timeout: 20_000 })
  await page.waitForSelector("[data-generation-reconstruct]", { timeout: 20_000 })
  await pause(500)
  const reconstructing = join(ARTIFACTS, "reference-reconstructing.png")
  await page.screenshot({ path: reconstructing })
  stills.push(reconstructing)

  await page.waitForFunction(
    () =>
      document.querySelector("[data-generation-reconstruct]") === null &&
      document.body.innerText.includes("Saffron"),
    undefined,
    { timeout: 30_000 }
  )
  await pause(600)
  const result = join(ARTIFACTS, "reference-result.png")
  await page.screenshot({ path: result })
  stills.push(result)

  await page.getByRole("button", { name: "Reference" }).click()
  await pause(350)
  const compare = join(ARTIFACTS, "reference-compare.png")
  await page.screenshot({ path: compare })
  stills.push(compare)

  await page.getByRole("button", { name: "Result" }).click()
  await pause(200)
  await page.getByText("Saffron", { exact: true }).first().click()
  await pause(400)
  const selected = join(ARTIFACTS, "reference-selected-layer.png")
  await page.screenshot({ path: selected })
  stills.push(selected)

  await browser.close()

  const { spawn } = await import("node:child_process")
  spawn("open", ["-R", ...stills], { stdio: "ignore", detached: true }).unref()
  spawn("open", [ARTIFACTS], { stdio: "ignore", detached: true }).unref()
  console.log(`Wrote ${stills.length} stills to ${ARTIFACTS}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
