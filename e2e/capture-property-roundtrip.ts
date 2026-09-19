/**
 * Property round-trip — canvas ↔ inspector evidence.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-property-roundtrip.ts
 */
import { mkdir, readdir, rename } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "property-roundtrip")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const SESSION_KEY = "invoice-builder-session-v1"
const SAVED_KEY = "layouts-ai-saved-items-v1"
const STATEMENT =
  "Create a bold statement invoice for Verve with a terracotta hero, large amount due, and clear client and service details."
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
    .getByText(/Bill to|Amount due|Invoice number|INVOICE TO|Services|ITEMS|Identity/i)
    .first()
    .waitFor({ timeout: 25_000 })
  await pause(200)
}

async function enterEdit(page: Page) {
  const edit = page.locator("[data-visual-edit-toggle]").first()
  if (await edit.isVisible().catch(() => false)) {
    if ((await edit.getAttribute("aria-pressed")) !== "true") {
      await edit.click()
    }
  }
}

async function selectLayer(page: Page, label: string) {
  const layer = page.locator(`[data-document-paper] [data-layer="${label}"]`).first()
  await layer.waitFor({ timeout: 12_000 })
  await layer.scrollIntoViewIfNeeded()
  await layer.dispatchEvent("click")
  await pause(250)
}

async function openStyleTab(page: Page) {
  const tab = page.getByRole("tab", { name: "Style", exact: true })
  if (await tab.isVisible().catch(() => false)) {
    await tab.click()
    await pause(150)
  }
  await page.keyboard.press("Escape")
}

async function backgroundField(page: Page) {
  const label = page.getByText("Background", { exact: true }).first()
  await label.waitFor({ state: "attached", timeout: 8_000 })
  await label.scrollIntoViewIfNeeded()
  return label.locator("xpath=ancestor::label[1]")
}

async function setBackgroundHex(page: Page, hex: string) {
  const heading = page.getByText("Background", { exact: true }).first()
  await heading.waitFor({ state: "attached", timeout: 8_000 })
  await heading.scrollIntoViewIfNeeded()
  const trigger = page
    .locator("label")
    .filter({ has: page.getByText("Background", { exact: true }) })
    .locator('[data-slot="popover-trigger"]')
    .first()
  await trigger.focus()
  await page.keyboard.press("Enter")
  await pause(300)
  await page.getByRole("button", { name: "Add", exact: true }).first().click()
  await pause(200)
  const hexPrefix = page.getByText("HEX", { exact: true })
  await hexPrefix.waitFor({ timeout: 8_000 })
  const input = hexPrefix.locator("xpath=following::input[1]")
  await input.fill(hex.replace("#", ""))
  await input.press("Enter")
  await pause(200)
  await page.keyboard.press("Escape")
  await pause(150)
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

  await page.addInitScript((key) => localStorage.removeItem(key), SAVED_KEY)

  await openBlankBuilder(page)
  await sendPrompt(page, STATEMENT)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await enterEdit(page)
  await selectLayer(page, "Header")
  await openStyleTab(page)
  await backgroundField(page)
  await shot("01-statement-orange-selected.png")
  await shot("02-statement-orange-inspector-value.png")
  await setBackgroundHex(page, "2563eb")
  await shot("03-statement-color-changed.png")
  await page.getByRole("button", { name: "Undo" }).click({ force: true })
  await pause(250)
  await shot("04-statement-undo.png")

  await selectLayer(page, "Header")
  await openStyleTab(page)
  await shot("07-selection-switch-a.png")
  await selectLayer(page, "Billing details")
  await openStyleTab(page)
  await shot("08-selection-switch-b.png")

  await openBlankBuilder(page)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await enterEdit(page)
  await selectLayer(page, "Business name")
  await openStyleTab(page)
  await shot("05-studio-business-name-readback.png")
  const size = page.locator("label").filter({ hasText: /^Size$/ }).locator("input")
  if (await size.count()) {
    await size.first().fill("40")
    await size.first().press("Enter")
    await pause(200)
  }
  await shot("06-studio-typography-change.png")

  await selectLayer(page, "Business name")
  const ai = page.getByLabel(/Describe your edit for Business name/)
  if (await ai.isVisible().catch(() => false)) {
    await ai.fill("make the business name bold")
    await page.getByRole("button", { name: "Submit edit" }).click()
    await waitForTurnSettled(page)
    await selectLayer(page, "Business name")
    await openStyleTab(page)
  }
  await shot("11-ai-edit-readback.png")

  await selectLayer(page, "Billing details")
  await page.getByRole("button", { name: "Save item" }).first().click({ force: true })
  await page.locator("[data-save-item-name]").waitFor({ timeout: 8_000 })
  await page.locator("#saved-item-name").fill("Billing details")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await page.getByText(/Saved “Billing details”/).waitFor({ timeout: 8_000 })
  await page.getByRole("button", { name: "Saved items" }).click()
  await page
    .locator("[data-saved-items-panel], [data-saved-items]")
    .first()
    .waitFor({ timeout: 8_000 })
  const savedTile = page.getByRole("button", { name: /Add Billing details|Billing details/ }).first()
  await savedTile.waitFor({ timeout: 8_000 })
  await savedTile.click()
  await pause(400)
  await openStyleTab(page)
  await shot("09-saved-item-readback.png")

  const placedLayers = page.locator('[data-document-paper] [data-layer^="placed-"]')
  if ((await placedLayers.count()) > 0) {
    await placedLayers.last().dispatchEvent("click")
    await pause(200)
    await page.locator('[data-layer^="placed-"]').last().hover()
    await page.getByRole("button", { name: /Duplicate / }).first().click({ force: true })
    await pause(300)
    await page.locator('[data-document-paper] [data-layer^="placed-"]').last().dispatchEvent("click")
  } else {
    await selectLayer(page, "Billing details")
    await page.getByRole("button", { name: /Duplicate Billing details/ }).first().click({
      force: true,
    })
    await pause(300)
    await selectLayer(page, "Billing details copy 1")
  }
  await openStyleTab(page)
  await setBackgroundHex(page, "fef3c7")
  await shot("10-duplicate-independent-edit.png")

  await openBlankBuilder(page)
  await sendPrompt(page, SWISS)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await enterEdit(page)
  await selectLayer(page, "Business name")
  await openStyleTab(page)
  await shot("12-swiss-native-readback.png")

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

  console.log(`Property roundtrip captures → ${ARTIFACTS}`)
  for (const still of stills) {
    console.log(`  ${still}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
