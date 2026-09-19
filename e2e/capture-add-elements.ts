/**
 * Add elements — pointer drag proof.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-add-elements.ts
 */
import { mkdir, readdir, rename } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "add-elements")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const SESSION_KEY = "invoice-builder-session-v1"
const STUDIO =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."
const SWISS =
  "Create a clean minimal swiss grid invoice with compact type, a technical layout, and itemised services."

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function openBlankBuilder(page: Page) {
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)
  await page.goto(`${BASE_URL}/invoices/layouts/builder`, {
    waitUntil: "networkidle",
  })
  await page.waitForSelector("#builder-welcome-prompt, #builder-composer", {
    timeout: 20_000,
  })
  await pause(250)
}

async function openInvoiceAI(page: Page) {
  if (await page.locator("#builder-composer").isVisible().catch(() => false)) {
    return
  }
  await page.getByRole("button", { name: "Layouts AI", exact: true }).click()
  await page.locator("#builder-composer").waitFor({ timeout: 8_000 })
}

async function sendPrompt(page: Page, text: string) {
  const welcome = page.locator("#builder-welcome-prompt")
  if (await welcome.isVisible().catch(() => false)) {
    await welcome.fill(text)
    await welcome.press("Enter")
    return
  }
  await page.locator("#builder-composer").fill(text)
  await page.locator("#builder-composer").press("Enter")
}

async function skipQuestionsIfPresent(page: Page) {
  const skip = page.getByRole("button", {
    name: /^(Use your judgment|Skip|Continue with assumptions)$/,
  })
  try {
    await skip.waitFor({ state: "visible", timeout: 4_000 })
    await skip.click()
  } catch {
    // Detailed prompts skip clarification entirely.
  }
}

async function waitForTurnSettled(page: Page) {
  const thinking = page.getByText("Thinking...", { exact: false }).first()
  await thinking.waitFor({ state: "visible", timeout: 12_000 }).catch(() => {})
  await page.waitForFunction(
    () => !document.body.innerText.includes("Thinking..."),
    undefined,
    { timeout: 40_000 }
  )
  await pause(400)
}

async function waitForGeneratedInvoice(page: Page) {
  await waitForTurnSettled(page)
  await page
    .getByText(/Bill to|Amount due|Invoice number|INVOICE TO|Services|ITEMS/i)
    .first()
    .waitFor({ timeout: 25_000 })
  await pause(200)
}

async function ensureAddElements(page: Page) {
  const heading = page.getByRole("button", { name: /Add Heading/ })
  if (await heading.isVisible().catch(() => false)) {
    return
  }
  await page.getByRole("button", { name: "Add elements" }).click()
  await heading.waitFor({ timeout: 8_000 })
}

async function startPaletteDrag(page: Page, name: RegExp) {
  await ensureAddElements(page)
  const tile = page.getByRole("button", { name })
  await tile.scrollIntoViewIfNeeded()
  await tile.waitFor({ state: "visible", timeout: 8_000 })
  const from = await tile.boundingBox()
  if (!from) {
    throw new Error(`Missing tile ${name}`)
  }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 16, from.y + from.height / 2 + 8, {
    steps: 6,
  })
  await page.locator("[data-drag-ghost]").waitFor({ timeout: 8_000 })
}

async function moveOverPaper(page: Page, yRatio: number) {
  const paper = page.locator("[data-document-paper]").first()
  await paper.waitFor({ timeout: 8_000 })
  const box = await paper.boundingBox()
  if (!box) {
    throw new Error("Missing document paper")
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * yRatio, {
    steps: 14,
  })
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true, slowMo: 20 })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    recordVideo: { dir: ARTIFACTS, size: { width: 1440, height: 1100 } },
  })
  const page = await context.newPage()
  const stills: string[] = []
  const shot = async (name: string) => {
    const path = join(ARTIFACTS, name)
    await page.screenshot({ path })
    stills.push(path)
  }

  await openBlankBuilder(page)
  await page.getByRole("button", { name: "Insert elements" }).click()
  await page.getByRole("button", { name: /Add Heading/ }).waitFor()
  await page.locator("[data-document-paper]").first().waitFor({ timeout: 8_000 })
  await shot("01-panel-open.png")

  await startPaletteDrag(page, /Add Heading/)
  await moveOverPaper(page, 0.28)
  await pause(160)
  await shot("02-dragging.png")
  await moveOverPaper(page, 0.55)
  await pause(160)
  await shot("03-drop-indicator.png")
  await page.mouse.up()
  await page.getByRole("dialog", { name: /Edit Heading/ }).waitFor({ timeout: 10_000 })
  await pause(250)
  await shot("04-heading-selected-inspector.png")

  await page.getByLabel("Content for Heading").fill("Studio invoice title")
  await pause(200)
  await shot("09-document-after-content.png")

  await startPaletteDrag(page, /Add Paragraph/)
  await moveOverPaper(page, 0.72)
  await page.mouse.up()
  await pause(250)

  await startPaletteDrag(page, /Add Quote/)
  await moveOverPaper(page, 0.42)
  await pause(120)
  await page.mouse.up()
  await pause(300)
  await shot("05-quote-dropped.png")

  const move = page.getByRole("button", { name: /Drag to move Quote/ })
  await page.getByText("Add a quote or callout here.").first().hover()
  await move.waitFor({ timeout: 8_000 })
  const handle = await move.boundingBox()
  const title = await page.getByText("Studio invoice title").first().boundingBox()
  if (handle && title) {
    await page.mouse.move(handle.x + 8, handle.y + 8)
    await page.mouse.down()
    await page.mouse.move(handle.x + 20, handle.y - 12, { steps: 5 })
    await page.locator("[data-drag-ghost]").waitFor({ timeout: 8_000 })
    await page.mouse.move(title.x + 80, title.y - 10, { steps: 14 })
    await pause(140)
    await shot("04b-reorder-preview.png")
    await page.mouse.up()
    await pause(250)
  }
  await shot("04c-reordered.png")

  await page.getByRole("button", { name: "Undo" }).click({ force: true })
  await pause(200)
  await shot("10-undo.png")
  await page.getByRole("button", { name: "Redo" }).click({ force: true })
  await pause(200)
  await shot("10-redo.png")
  await ensureAddElements(page)

  await startPaletteDrag(page, /Add Image/)
  await moveOverPaper(page, 0.82)
  await page.mouse.up()
  await pause(300)
  const demo = page.getByRole("button", { name: "Demo 1" })
  if (await demo.count()) {
    await demo.click({ force: true })
    await pause(250)
  }
  await shot("09-image-source.png")

  await startPaletteDrag(page, /Add 2-column layout/)
  await moveOverPaper(page, 0.9)
  await page.mouse.up()
  await pause(300)
  await startPaletteDrag(page, /Add Button/)
  const column = page.getByText("Column 1").first()
  if (await column.count()) {
    const box = await column.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + 12, { steps: 12 })
      await pause(120)
    }
  }
  await page.mouse.up()
  await pause(300)
  await shot("10-columns-structure.png")

  await startPaletteDrag(page, /Add Divider/)
  await moveOverPaper(page, 0.2)
  await page.keyboard.press("Escape")
  await pause(200)
  await shot("11-drag-cancel.png")

  await openBlankBuilder(page)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await page.getByRole("button", { name: "Add elements" }).click()
  await page.getByRole("button", { name: /Add Heading/ }).waitFor()
  await startPaletteDrag(page, /Add Heading/)
  await moveOverPaper(page, 0.35)
  await pause(140)
  await shot("06-generated-studio-drag.png")
  await page.mouse.up()
  await pause(300)
  await shot("06b-generated-studio-drop.png")

  await ensureAddElements(page)
  await page.getByRole("button", { name: /Add Table/ }).click({ force: true })
  await pause(400)
  await shot("08-table-singleton.png")

  await openInvoiceAI(page)
  await sendPrompt(page, "Add a heading called Payment terms below the line items.")
  await waitForTurnSettled(page)
  await page.getByText("Payment terms").first().waitFor({ timeout: 10_000 })
  await page.getByText("Payment terms").first().click()
  await page.getByRole("dialog", { name: /Edit Heading/ }).waitFor({ timeout: 10_000 })
  await shot("07-ai-heading-inspector.png")
  const content = page.getByLabel(/Content for Heading/)
  if (await content.count()) {
    await content.fill("Payment terms — net 14")
    await pause(200)
  }
  await shot("07b-ai-heading-edited.png")

  await page.getByRole("button", { name: "Add elements" }).click()
  await startPaletteDrag(page, /Add Button/)
  await moveOverPaper(page, 0.78)
  await page.mouse.up()
  await pause(250)
  await openInvoiceAI(page)
  await sendPrompt(page, "Button: change to Pay online")
  await waitForTurnSettled(page)
  await shot("07c-ai-edit-manual-button.png")

  await openBlankBuilder(page)
  await sendPrompt(page, SWISS)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await page.getByRole("button", { name: "Add elements" }).click()
  await startPaletteDrag(page, /Add Paragraph/)
  await moveOverPaper(page, 0.4)
  await pause(140)
  await shot("06c-generated-swiss-drag.png")
  await page.mouse.up()
  await pause(250)
  await shot("06d-generated-swiss-drop.png")

  await context.close()
  await browser.close()

  const files = await readdir(ARTIFACTS)
  const newest = files
    .filter((file) => file.endsWith(".webm") && file !== "walkthrough.webm")
    .sort()
    .at(-1)
  if (newest) {
    await rename(join(ARTIFACTS, newest), join(ARTIFACTS, "walkthrough.webm")).catch(
      async () => {
        const { copyFile } = await import("node:fs/promises")
        await copyFile(join(ARTIFACTS, newest), join(ARTIFACTS, "walkthrough.webm"))
      }
    )
  }

  await cleanupIntermediateVideos(ARTIFACTS)

  const { spawn } = await import("node:child_process")
  spawn("open", ["-R", ...stills], { stdio: "ignore", detached: true }).unref()
  spawn("open", [ARTIFACTS], { stdio: "ignore", detached: true }).unref()
  console.log(`Wrote ${stills.length} stills to ${ARTIFACTS}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
