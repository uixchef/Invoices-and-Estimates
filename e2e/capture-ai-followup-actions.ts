/**
 * AI follow-up document actions evidence.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-ai-followup-actions.ts
 */
import { mkdir, rename } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { cleanupIntermediateVideos } from "./cleanup-videos"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "ai-followup-actions")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001"
const SESSION_KEY = "invoice-builder-session-v1"
const SAVED_KEY = "layouts-ai-saved-items-v1"
const STUDIO =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."
const STATEMENT =
  "Create a bold statement invoice for Verve with a terracotta hero, large amount due, and clear client and service details."
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
    // Detailed prompts skip clarification.
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
  await pause(500)
}

async function waitForGeneratedInvoice(page: Page) {
  await waitForTurnSettled(page)
  await page
    .getByText(/Bill to|Amount due|Invoice number|INVOICE TO|Services|ITEMS|Identity/i)
    .first()
    .waitFor({ timeout: 25_000 })
  await pause(250)
}

async function clickSuggestion(page: Page, name: string | RegExp) {
  const chip = page.getByRole("button", { name }).first()
  await chip.waitFor({ state: "visible", timeout: 12_000 })
  await chip.scrollIntoViewIfNeeded()
  await chip.click()
  await waitForTurnSettled(page)
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
  try {
    await layer.waitFor({ timeout: 5_000 })
    await layer.scrollIntoViewIfNeeded()
    await layer.dispatchEvent("click")
    await pause(250)
  } catch {
    // Evidence stills can proceed if the inspect target is a placed id.
  }
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true, slowMo: 16 })
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
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await shot("01-studio-before.png")

  await clickSuggestion(page, "Add a discount row")
  await shot("02-discount-added.png")

  await enterEdit(page)
  await selectLayer(page, "Totals")
  await shot("03-discount-inspector.png")

  const undo = page.getByRole("button", { name: "Undo" })
  await undo.waitFor({ state: "visible", timeout: 8_000 })
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[aria-label="Undo"]')
      return button instanceof HTMLButtonElement && !button.disabled
    },
    undefined,
    { timeout: 8_000 }
  )
  await undo.click()
  await pause(400)
  await shot("04-discount-undo.png")
  await page.getByRole("button", { name: "Redo" }).click()
  await pause(400)

  await sendPrompt(page, "Add a 'Pay online' button")
  await waitForTurnSettled(page)
  await shot("05-pay-online-added.png")
  await enterEdit(page)
  const payHit = page
    .locator("[data-document-paper] [data-layer]")
    .filter({ hasText: /Pay online|Pay now/i })
    .first()
  if (await payHit.count()) {
    await payHit.scrollIntoViewIfNeeded()
    await payHit.dispatchEvent("click")
  }
  await pause(200)
  const content = page.getByLabel("Content", { exact: true }).first()
  if (await content.isVisible().catch(() => false)) {
    await content.fill("Pay now")
    await content.press("Enter")
  }
  await pause(250)
  await shot("06-pay-online-edited.png")

  const scoped = page.getByPlaceholder(/Describe your edit/i).first()
  if (await scoped.isVisible().catch(() => false)) {
    await scoped.fill("make the label Pay instantly")
    await scoped.press("Enter")
    await waitForTurnSettled(page)
  }

  await sendPrompt(page, "Add a 'Pay online' button")
  await sendPrompt(page, "Add a 'Pay online' button")
  await waitForTurnSettled(page)

  await page.getByRole("button", { name: "Saved items" }).click().catch(() => {})
  await pause(300)
  await page.keyboard.press("Escape")

  await openBlankBuilder(page)
  await sendPrompt(page, STATEMENT)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await shot("08-statement-brand-action-before.png")
  await sendPrompt(page, "Add bank and payment details")
  await waitForTurnSettled(page)
  await enterEdit(page)
  const paymentHit = page
    .locator("[data-document-paper] [data-layer]")
    .filter({ hasText: /First National Bank|Payment details/i })
    .first()
  if (await paymentHit.count()) {
    await paymentHit.scrollIntoViewIfNeeded()
    await paymentHit.dispatchEvent("click")
    await pause(250)
  }
  await shot("07-statement-payment-details.png")
  await page.getByRole("button", { name: "Undo" }).click()
  await pause(300)
  await page.getByRole("button", { name: "Redo" }).click()
  await pause(300)

  await sendPrompt(page, "Switch to a bold, branded color scheme")
  await waitForTurnSettled(page)
  await shot("09-statement-brand-action-after.png")
  await enterEdit(page)
  await selectLayer(page, "Header")
  await shot("10-brand-inspector-readback.png")
  await page.getByRole("button", { name: "Undo" }).click()
  await pause(300)

  await openBlankBuilder(page)
  await sendPrompt(page, SWISS)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await sendPrompt(page, "Add a discount row")
  await waitForTurnSettled(page)
  await sendPrompt(page, "Add bank and payment details")
  await waitForTurnSettled(page)
  await shot("11-swiss-action.png")

  await page.getByRole("button", { name: "Preview", exact: true }).first().click().catch(() => {})
  await pause(400)
  await shot("12-final-continuity.png")

  const video = page.video()
  await context.close()
  await browser.close()
  if (video) {
    const raw = await video.path()
    await rename(raw, join(ARTIFACTS, "walkthrough.webm"))
  }
  await cleanupIntermediateVideos(ARTIFACTS)
  console.log(`Wrote ${stills.length} stills to ${ARTIFACTS}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
