/**
 * Attachment-system stills for the dashboard composer.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-attachment-system.ts
 */
import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "attachment-system")
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

async function fixturePaths() {
  const dir = join(ARTIFACTS, "fixtures")
  await mkdir(dir, { recursive: true })
  const paths: string[] = []
  for (let index = 1; index <= 9; index += 1) {
    const path = join(dir, `ref-${index}.png`)
    await copyFile(SOURCE, path)
    paths.push(path)
  }
  return paths
}

async function attach(page: Page, files: string[]) {
  const input = page.locator("[data-composer-file-input]")
  await input.setInputFiles(files)
  await pause(250)
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const files = await fixturePaths()
  const browser = await chromium.launch({ headless: true, slowMo: 20 })
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
  await pause(300)
  await shot("01-empty.png")

  await attach(page, [files[0]!])
  await shot("02-one-attachment.png")

  await attach(page, [files[1]!])
  const count = await page.locator("[data-attachment-count]").getAttribute("data-attachment-count")
  if (count !== "2") {
    throw new Error(`Expected 2 attachments after second picker, got ${count}`)
  }
  await shot("03-appended-second-batch.png")

  await attach(page, [files[2]!, files[3]!])
  await shot("04-four-attachments.png")

  await attach(page, [files[4]!])
  const overflowFive = await page
    .locator("[data-overflow-count]")
    .getAttribute("data-overflow-count")
  if (overflowFive !== "1") {
    throw new Error(`Expected overflow +1, got ${overflowFive}`)
  }
  await shot("05-overflow-five.png")

  await attach(page, [files[5]!, files[6]!, files[7]!])
  const overflowEight = await page
    .locator("[data-overflow-count]")
    .getAttribute("data-overflow-count")
  if (overflowEight !== "4") {
    throw new Error(`Expected overflow +4, got ${overflowEight}`)
  }
  const scroll = await page.locator(".prompt-bar__row").evaluate((node) => {
    return node.scrollWidth > node.clientWidth + 1
  })
  if (scroll) {
    throw new Error("Composer action row is horizontally scrolling")
  }
  await shot("06-overflow-eight.png")

  await page.locator("[data-attachment-overflow]").click()
  await page.getByText("8 attachments").waitFor()
  await shot("07-overflow-open.png")

  await page.getByRole("button", { name: "Remove reference image 6" }).click()
  await pause(200)
  const afterHidden = await page
    .locator("[data-overflow-count]")
    .getAttribute("data-overflow-count")
  if (afterHidden !== "3") {
    throw new Error(`Expected overflow +3 after hidden remove, got ${afterHidden}`)
  }
  await shot("08-after-hidden-remove.png")

  await page.keyboard.press("Escape")
  await page.getByRole("list", { name: "All attached files" }).waitFor({ state: "hidden" }).catch(() => {})
  await page
    .getByRole("list", { name: "Attached files" })
    .getByRole("button", { name: "Remove reference image 2" })
    .click()
  await pause(200)
  await shot("09-after-visible-remove.png")

  await attach(page, [files[8]!])
  await shot("10-add-after-remove.png")

  await page.setViewportSize({ width: 1024, height: 900 })
  await pause(250)
  const overflowVisible = await page.locator("[data-attachment-overflow]").isVisible()
  if (!overflowVisible) {
    throw new Error("Overflow tile must remain visible at narrow width")
  }
  const sendBox = await page.getByRole("button", { name: "Generate layout" }).boundingBox()
  const overflowBox = await page.locator("[data-attachment-overflow]").boundingBox()
  if (sendBox && overflowBox && sendBox.x < overflowBox.x + overflowBox.width - 4) {
    throw new Error("Send control overlaps the attachment overflow tile")
  }
  await shot("11-narrow-width.png")

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.fill(
    "#create-with-ai-prompt",
    "Keep the structure of the attached references, use a quieter type system, preserve the itemised services, and keep amount due dominant on the page."
  )
  await pause(250)
  await shot("12-multiline-prompt.png")

  await context.close()
  await browser.close()
  await cleanupIntermediateVideos(ARTIFACTS)
  console.log(`Attachment-system captures → ${ARTIFACTS}`)
  for (const still of stills) {
    console.log(`  ${still}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
