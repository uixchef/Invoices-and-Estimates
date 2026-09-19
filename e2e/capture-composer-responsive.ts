/**
 * Responsive composer heading + attachment capacity stills.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-composer-responsive.ts
 */
import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "composer-responsive")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001"
const SOURCE = join(
  __dirname,
  "..",
  "public",
  "demo",
  "saffron-invoice-reference.png"
)

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fixtures(count: number) {
  const dir = join(ARTIFACTS, "fixtures")
  await mkdir(dir, { recursive: true })
  const paths: string[] = []
  for (let index = 1; index <= count; index += 1) {
    const path = join(dir, `ref-${index}.png`)
    await copyFile(SOURCE, path)
    paths.push(path)
  }
  return paths
}

async function attach(page: Page, files: string[]) {
  await page.locator("[data-composer-file-input]").setInputFiles(files)
  await pause(200)
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const files = await fixtures(21)
  const browser = await chromium.launch({ headless: true, slowMo: 15 })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: ARTIFACTS, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  const stills: string[] = []
  const shot = async (name: string) => {
    const path = join(ARTIFACTS, name)
    await page.screenshot({ path })
    stills.push(path)
  }

  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await page.waitForSelector("#create-with-ai-prompt")
  await pause(2800)
  await shot("01-heading-wide.png")

  await page.setViewportSize({ width: 1100, height: 900 })
  await pause(400)
  await shot("02-heading-medium-natural-wrap.png")

  await page.setViewportSize({ width: 900, height: 900 })
  await pause(400)
  await shot("03-heading-narrow-real-wrap.png")

  await page.setViewportSize({ width: 1440, height: 900 })
  await pause(300)
  await attach(page, [files[0]!])
  await shot("04-attachments-1.png")

  await attach(page, [files[1]!, files[2]!])
  const overflowThree = await page
    .locator("[data-overflow-count]")
    .getAttribute("data-overflow-count")
  if (overflowThree && overflowThree !== "0") {
    throw new Error(`Expected 3 attachments to fit at 1440, overflow ${overflowThree}`)
  }
  await shot("05-attachments-all-fit.png")

  await attach(page, files.slice(3, 8))
  await page.setViewportSize({ width: 1280, height: 900 })
  await pause(300)
  await shot("06-attachments-medium-overflow.png")

  await page.setViewportSize({ width: 1024, height: 900 })
  await pause(300)
  const overflowNarrow = await page.locator("[data-overflow-count]").getAttribute("data-overflow-count")
  if (!overflowNarrow || Number(overflowNarrow) < 1) {
    throw new Error("Expected overflow at 1024 with 8 attachments")
  }
  const sendBox = await page.getByRole("button", { name: "Generate layout" }).boundingBox()
  const overflowBox = await page.locator("[data-attachment-overflow]").boundingBox()
  if (sendBox && overflowBox && sendBox.x < overflowBox.x + overflowBox.width - 2) {
    throw new Error("Send overlaps overflow at 1024")
  }
  await shot("07-attachments-narrow-overflow.png")

  await page.locator("[data-attachment-overflow]").click()
  await page.getByText(/attachments$/).waitFor()
  await shot("08-overflow-open.png")

  await page.getByRole("list", { name: "All attached files" }).getByRole("button", { name: /Remove reference image 6/ }).click()
  await pause(250)
  await shot("09-remove-hidden-reflow.png")

  await page.keyboard.press("Escape")
  await attach(page, [files[8]!])
  await shot("10-add-after-remove.png")

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.fill(
    "#create-with-ai-prompt",
    "Keep the structure of the attached references, use a quieter type system, preserve the itemised services, and keep amount due dominant on the page."
  )
  await pause(250)
  await shot("11-multiline-responsive.png")

  await page.fill("#create-with-ai-prompt", "")
  const current = Number(
    await page.locator("[data-attachment-count]").getAttribute("data-attachment-count")
  )
  const remaining = Math.max(0, 20 - current)
  if (remaining > 0) {
    await attach(page, files.slice(9, 9 + remaining))
  }
  await attach(page, [files[20]!])
  await page.getByText("Up to 20 attachments can be added.").waitFor({ timeout: 5000 })
  await shot("12-cap-feedback.png")

  await context.close()
  await browser.close()
  await cleanupIntermediateVideos(ARTIFACTS)
  console.log(`Composer responsive captures → ${ARTIFACTS}`)
  for (const still of stills) {
    console.log(`  ${still}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
