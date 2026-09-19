/**
 * Brand boards — identity vs composition proof.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-brand-boards.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "brand-boards")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const SESSION_KEY = "invoice-builder-session-v1"
const REFERENCE = join(
  __dirname,
  "..",
  "public",
  "demo",
  "saffron-invoice-reference.png"
)

const STUDIO =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."
const FAMILIES: Record<string, string> = {
  swiss:
    "Create a clean minimal swiss grid invoice with compact type, a technical layout, and itemised services.",
  editorial:
    "Create an editorial magazine invoice with a dramatic masthead, running folio, and itemised services.",
  atelier:
    "Create a quiet luxury atelier invoice with a formal closing composition and itemised services.",
  statement:
    "Create an expressive statement invoice with a large colour field and the amount due as a brand device.",
  ledger:
    "Create a contemporary dark financial ledger invoice with clear transaction hierarchy and itemised services.",
}

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

async function openBrandBoards(page: Page) {
  await page.getByRole("button", { name: "Brand boards" }).click()
  await page.getByLabel("Harbor studio").waitFor({ timeout: 8_000 })
}

async function previewBoard(page: Page, name: string) {
  await openBrandBoards(page)
  await page.getByRole("button", { name: new RegExp(name) }).first().click()
  await pause(250)
}

async function applyBoard(page: Page) {
  const apply = page.getByRole("button", { name: "Apply", exact: true })
  if (await apply.isVisible().catch(() => false)) {
    await apply.click()
    await pause(250)
  }
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
  await shot("03-studio-before-board.png")

  await openBrandBoards(page)
  await shot("01-brand-boards-panel.png")
  await shot("02-built-in-board-cards.png")

  await previewBoard(page, "Folio editorial")
  await shot("04-studio-preview-folio.png")
  await applyBoard(page)
  await shot("05-studio-applied-folio.png")

  await page.getByRole("button", { name: /Technical index/ }).click()
  await pause(200)
  await shot("06-studio-font-pairing.png")
  await applyBoard(page)

  await page.getByRole("button", { name: "Undo" }).click()
  await pause(200)
  await shot("07-undo-board.png")
  await page.getByRole("button", { name: "Redo" }).click()
  await pause(200)
  await shot("07b-redo-board.png")

  await openBlankBuilder(page)
  await sendPrompt(page, FAMILIES.swiss)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await previewBoard(page, "Folio editorial")
  await applyBoard(page)
  await shot("08-swiss-folio.png")

  await openBlankBuilder(page)
  await sendPrompt(page, FAMILIES.editorial)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await previewBoard(page, "Folio editorial")
  await applyBoard(page)
  await shot("09-editorial-folio.png")

  await openBlankBuilder(page)
  await sendPrompt(page, FAMILIES.atelier)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await previewBoard(page, "Harbor studio")
  await applyBoard(page)
  await shot("09b-atelier-harbor.png")

  await openBlankBuilder(page)
  await sendPrompt(page, FAMILIES.statement)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await previewBoard(page, "Harbor studio")
  await applyBoard(page)
  await shot("09c-statement-harbor.png")

  await openBlankBuilder(page)
  await sendPrompt(page, FAMILIES.ledger)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await previewBoard(page, "Paper quiet")
  await applyBoard(page)
  await shot("09d-ledger-paper-quiet.png")

  await openBlankBuilder(page)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await previewBoard(page, "Quiet atelier")
  await applyBoard(page)
  await page.getByRole("button", { name: "Add elements" }).click()
  await page.getByRole("button", { name: /Add Heading/ }).click({ force: true })
  await pause(300)
  await shot("10-manual-heading-inherits.png")

  await page.getByRole("button", { name: "Layouts AI", exact: true }).click()
  await sendPrompt(page, "Add a heading called Payment terms below the line items.")
  await waitForTurnSettled(page)
  await page.getByText("Payment terms").first().waitFor({ timeout: 10_000 })
  await shot("11-ai-heading-inherits.png")

  await page.getByText("Payment terms").first().click()
  await page.getByRole("dialog", { name: /Edit Heading/ }).waitFor({ timeout: 10_000 })
  const textColor = page.getByLabel("Text").locator("..").getByRole("button").first()
  if (await textColor.count()) {
    await textColor.click()
    await pause(200)
  }
  await shot("12-local-override.png")
  const reset = page.getByRole("button", { name: "Reset to brand" })
  if (await reset.isVisible().catch(() => false)) {
    await reset.click()
    await pause(200)
    await shot("13-reset-to-brand.png")
  } else {
    await shot("13-reset-to-brand.png")
  }

  await page.getByRole("button", { name: "Brand boards" }).click()
  await page.getByRole("button", { name: "Create custom Brand Board" }).click()
  await page.getByLabel("Board name").fill("Pine workshop")
  await page.getByLabel("Primary").fill("#14532d")
  await pause(200)
  await shot("14-create-custom.png")
  await shot("15-custom-live-preview.png")
  await page.getByRole("button", { name: "Save and apply" }).click()
  await pause(300)
  await shot("16-custom-applied.png")

  await openBlankBuilder(page)
  const fileInput = page.locator('input[type="file"][accept*="image"]').first()
  await fileInput.setInputFiles(REFERENCE)
  await sendPrompt(page, "Recreate this invoice")
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await shot("17-reference-before-board.png")
  await previewBoard(page, "Northwind corporate")
  await applyBoard(page)
  await shot("17b-reference-after-board.png")
  const resultToggle = page.getByRole("button", { name: "Result", exact: true })
  if (await resultToggle.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Reference", exact: true }).click()
    await pause(200)
    await shot("17c-reference-image-unchanged.png")
    await resultToggle.click()
  }

  await openBlankBuilder(page)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForGeneratedInvoice(page)
  await shot("walk-01-generated.png")
  await openBrandBoards(page)
  await shot("walk-02-open-boards.png")
  await previewBoard(page, "Indexed grid")
  await pause(180)
  await previewBoard(page, "Field statement")
  await pause(180)
  await previewBoard(page, "Quiet atelier")
  await shot("walk-03-preview-multiple.png")
  await applyBoard(page)
  await page.getByRole("button", { name: /Editorial serif/ }).click()
  await pause(200)
  await shot("walk-04-swap-pairing.png")
  await applyBoard(page)
  await page.getByRole("button", { name: "Add elements" }).click()
  await page.getByRole("button", { name: /Add Heading/ }).click({ force: true })
  await pause(250)
  await shot("walk-05-add-element.png")
  await page.getByText("Heading", { exact: true }).last().click()
  await pause(250)
  await shot("walk-06-override.png")
  await page.getByRole("button", { name: "Undo" }).click()
  await pause(200)
  await shot("walk-07-undo.png")
  await page.getByRole("button", { name: "Brand boards" }).click()
  await page.getByRole("button", { name: "Create custom Brand Board" }).click()
  await page.getByLabel("Board name").fill("Night market")
  await page.getByRole("button", { name: "Save and apply" }).click()
  await pause(300)
  await shot("walk-08-custom.png")

  await browser.close()
  console.log(`Captured ${stills.length} stills`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
