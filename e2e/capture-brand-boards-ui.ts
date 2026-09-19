/**
 * Brand boards panel UI refinement stills.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-brand-boards-ui.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "brand-boards-ui")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const SESSION_KEY = "invoice-builder-session-v1"
const STUDIO =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."
const FAMILIES = [
  "Create an editorial magazine invoice with a dramatic masthead and itemised services.",
  "Create a clean minimal swiss grid invoice with compact type and itemised services.",
  "Create a quiet luxury atelier invoice with a formal closing and itemised services.",
  "Create an expressive statement invoice with a large colour field and itemised services.",
  "Create a contemporary dark financial ledger invoice with itemised services.",
]

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function openBlankBuilder(page: Page) {
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key)
    localStorage.removeItem("layouts-ai-custom-brand-boards-v1")
  }, SESSION_KEY)
  await page.goto(`${BASE_URL}/invoices/layouts/builder`, {
    waitUntil: "networkidle",
  })
  await page.waitForSelector("#builder-welcome-prompt, #builder-composer", {
    timeout: 20_000,
  })
  await pause(200)
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

async function waitForGeneratedInvoice(page: Page) {
  const thinking = page.getByText("Thinking...", { exact: false }).first()
  await thinking.waitFor({ state: "visible", timeout: 12_000 }).catch(() => {})
  await page.waitForFunction(
    () => !document.body.innerText.includes("Thinking..."),
    undefined,
    { timeout: 40_000 }
  )
  await page
    .getByText(/Bill to|Amount due|Invoice number|INVOICE TO|Services|ITEMS/i)
    .first()
    .waitFor({ timeout: 25_000 })
  await pause(200)
}

async function openBrandBoards(page: Page) {
  if (await page.getByLabel("Harbor studio").isVisible().catch(() => false)) {
    return
  }
  await page.getByRole("button", { name: "Brand boards" }).click()
  await page.getByLabel("Harbor studio").waitFor({ timeout: 8_000 })
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const stills: string[] = []
  const shot = async (name: string) => {
    const path = join(ARTIFACTS, name)
    await page.screenshot({ path, fullPage: false })
    stills.push(path)
    console.log(`Wrote ${path}`)
  }

  await openBlankBuilder(page)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await openBrandBoards(page)
  await shot("01-default-list.png")

  const body = await page.getByLabel("Harbor studio").locator("xpath=ancestor::aside[1]").innerText()
  if (/\bItemised services\b/.test(body) || /(^|\n)Northwind(\n|$)/.test(body)) {
    throw new Error("Specimen invoice copy leaked into Brand Board cards")
  }

  await page.getByLabel("Folio editorial").click()
  await pause(250)
  await shot("02-preview-folio.png")

  await page.getByRole("button", { name: "Apply", exact: true }).click()
  await pause(250)
  await shot("03-applied-folio.png")

  await page.getByLabel("Indexed grid").click()
  await pause(200)
  await shot("04-contrasting-cards.png")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await pause(200)

  await page.getByText("Keep the colors. Change the type.").scrollIntoViewIfNeeded()
  await page.getByRole("button", { name: /Geist Mono/ }).last().click()
  await pause(200)
  await shot("05-font-pairing.png")
  await page.getByRole("button", { name: "Apply", exact: true }).click().catch(() => {})
  await pause(200)
  await shot("06-customized-state.png")

  await page.getByRole("button", { name: "Create custom Brand Board" }).click()
  await page.getByLabel("Board name").fill("Pine workshop")
  await pause(200)
  await shot("07-custom-editor.png")

  for (const [index, prompt] of FAMILIES.entries()) {
    await openBlankBuilder(page)
    await sendPrompt(page, prompt)
    await skipQuestionsIfPresent(page)
    await waitForGeneratedInvoice(page)
    await openBrandBoards(page)
    await page.getByLabel("Harbor studio").click()
    await page.getByRole("button", { name: "Apply", exact: true }).click().catch(() => {})
    await pause(200)
    await shot(`08-family-${index + 1}.png`)
  }

  await browser.close()
  console.log(`Captured ${stills.length} stills`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
