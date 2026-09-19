/**
 * Saved items polish — anchored naming, search, deep duplicate, replace.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx tsx e2e/capture-saved-items-polish.ts
 */
import { mkdir, readdir, rename } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "saved-items-polish")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const SESSION_KEY = "invoice-builder-session-v1"
const SAVED_KEY = "layouts-ai-saved-items-v1"
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

async function enterEdit(page: Page) {
  const edit = page.locator("[data-visual-edit-toggle]").first()
  if (await edit.isVisible().catch(() => false)) {
    const pressed = await edit.getAttribute("aria-pressed")
    if (pressed !== "true") {
      await edit.click()
    }
  }
  await pause(200)
}

async function openSavedItems(page: Page) {
  if (await page.locator("[data-saved-items]").isVisible().catch(() => false)) {
    return
  }
  await page.getByRole("button", { name: "Saved items" }).click()
  try {
    await page.locator("[data-saved-items]").waitFor({ timeout: 4_000 })
  } catch {
    await page.getByRole("button", { name: "Add elements", exact: true }).click()
    await pause(200)
    await page.getByRole("button", { name: "Saved items" }).click()
    await page.locator("[data-saved-items]").waitFor({ timeout: 8_000 })
  }
}

async function startSavedDrag(page: Page, name: string) {
  await openSavedItems(page)
  const tile = page.getByRole("button", { name: new RegExp(`Add ${name}`) })
  await tile.scrollIntoViewIfNeeded()
  const from = await tile.boundingBox()
  if (!from) {
    throw new Error(`Missing saved item ${name}`)
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

async function selectNativeBilling(page: Page) {
  const billing = page.locator("[data-layer='Billing details']").first()
  await billing.waitFor({ timeout: 12_000 })
  await billing.scrollIntoViewIfNeeded()
  await billing.dispatchEvent("click")
  await pause(200)
  const box = await billing.boundingBox()
  if (box) {
    await page.mouse.move(box.x + 24, box.y + 8)
  }
  await pause(150)
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true, slowMo: 18 })
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
  await page.evaluate((key) => localStorage.removeItem(key), SAVED_KEY)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await enterEdit(page)
  await selectNativeBilling(page)
  await shot("01-save-action.png")

  await page.getByRole("button", { name: "Save item" }).first().click({ force: true })
  await page.locator("[data-save-item-name]").waitFor({ timeout: 8_000 })
  await page.locator("#saved-item-name").fill("Billing details")
  await shot("02-anchored-name-popover.png")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await page.getByText(/Saved “Billing details”/).waitFor({ timeout: 8_000 })

  await openSavedItems(page)
  await page.getByText("Billing details").first().waitFor({ timeout: 8_000 })
  await shot("03-saved-library-row.png")

  await page.getByLabel("Search elements").fill("billing")
  await pause(200)
  await shot("04-search-result.png")

  await openBlankBuilder(page)
  await sendPrompt(page, SWISS)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await page.getByRole("button", { name: "Brand boards" }).click()
  await page.getByRole("button", { name: /Folio editorial/ }).first().click()
  const apply = page.getByRole("button", { name: "Apply", exact: true })
  if (await apply.isVisible().catch(() => false)) {
    await apply.click()
    await pause(300)
  }

  await startSavedDrag(page, "Billing details")
  await moveOverPaper(page, 0.42)
  await pause(160)
  await shot("05-cross-layout-insert.png")
  await page.mouse.up()
  await pause(400)
  await shot("06-brand-inheritance.png")

  await openSavedItems(page)
  await page.getByRole("button", { name: /Add Billing details/ }).click()
  await pause(400)
  await shot("07-second-instance-clean-label.png")

  const placedBilling = page
    .locator("[data-document-paper] [data-layer]")
    .filter({ hasText: "Bill to" })
    .filter({ hasText: "456 Client" })
    .last()
  await placedBilling.scrollIntoViewIfNeeded()
  await placedBilling.click({ force: true })
  await pause(200)
  const rootBox = await placedBilling.boundingBox()
  if (rootBox) {
    await page.mouse.move(rootBox.x + 28, rootBox.y + 12)
  }
  await pause(150)
  await page.getByRole("button", { name: /Duplicate / }).last().click({ force: true })
  await pause(400)
  await shot("08-deep-duplicate.png")

  await page
    .locator("[data-document-paper] [data-layer]")
    .filter({ hasText: "San Francisco" })
    .last()
    .click({ force: true })
  await pause(200)

  const contentField = page.getByLabel(/Content for /)
  if (await contentField.count()) {
    await contentField.last().fill("Edited duplicate client")
    await pause(250)
  }
  await shot("09-edit-duplicate-original-unchanged.png")

  if (!(await page.getByLabel("Search elements").isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Add elements", exact: true }).click()
  }
  await page.getByLabel("Search elements").waitFor({ timeout: 8_000 })
  const twoCol = page.getByRole("button", { name: /Add 2-column layout/ })
  await twoCol.click()
  await pause(400)
  await openSavedItems(page)
  await page.getByRole("button", { name: /Billing details options/ }).click()
  await shot("10-replace-selected.png")
  await page.getByRole("menuitem", { name: /Replace selected/ }).click()
  await pause(400)

  await page.getByRole("button", { name: "Undo" }).click({ force: true })
  await pause(250)
  await shot("11-undo.png")
  await page.getByRole("button", { name: "Redo" }).click({ force: true })
  await pause(250)
  await shot("12-redo.png")

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

  console.log(`Saved items polish captures → ${ARTIFACTS}`)
  for (const still of stills) {
    console.log(`  ${still}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
