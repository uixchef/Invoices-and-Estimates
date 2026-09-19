/**
 * Clarification-system stills and a short restraint walkthrough.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-clarification-system.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "clarification-system")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const REFERENCE = join(
  __dirname,
  "..",
  "public",
  "demo",
  "saffron-invoice-reference.png"
)
const SESSION_KEY = "invoice-builder-session-v1"
const DETAILED =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."

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

async function waitForQuestion(page: Page, snippet: string, timeout = 12_000) {
  await page.getByText(snippet, { exact: false }).first().waitFor({
    state: "visible",
    timeout,
  })
}

async function waitForThinking(page: Page) {
  await page
    .getByText("Thinking...", { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 12_000 })
    .catch(() => {})
}

async function waitForReady(page: Page) {
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

async function shotPanel(page: Page, stills: string[], name: string) {
  const panel = page.locator("aside").filter({ hasText: "Layouts AI" }).first()
  await panel.waitFor({ state: "visible", timeout: 15_000 })
  const path = join(ARTIFACTS, name)
  await panel.screenshot({ path })
  stills.push(path)
}

async function chooseOption(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click()
  await page.getByRole("button", { name: "Done" }).click()
}

async function generateFromDashboard(
  page: Page,
  prompt: string | null
) {
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)
  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await page.waitForSelector("#create-with-ai-prompt")
  const fileInput = page.locator('input[type="file"][accept*="image"]')
  await fileInput.setInputFiles(REFERENCE)
  await pause(400)
  if (prompt) {
    await page.fill("#create-with-ai-prompt", prompt)
  }
  await page.getByLabel("Generate layout").click()
  await page.waitForURL("**/invoices/layouts/builder", { timeout: 20_000 })
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const stills: string[] = []

  const clear = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(clear)
  await sendPrompt(clear, DETAILED)
  await pause(3500)
  const askedClear = await clear
    .getByText("What should it feel like?")
    .isVisible()
    .catch(() => false)
  if (askedClear) {
    throw new Error("Detailed prompt should not ask clarification")
  }
  await shotPanel(clear, stills, "01-clear-no-question.png")
  await waitForReady(clear)
  await clear.close()

  const vague = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(vague)
  await sendPrompt(vague, "Create a premium invoice.")
  await waitForQuestion(vague, "What should it feel like?")
  const fiveUp = await vague.getByText("of 5").isVisible().catch(() => false)
  if (fiveUp) {
    throw new Error("Vague prompt must not show a five-question wizard")
  }
  await shotPanel(vague, stills, "02-vague-first-round.png")
  await vague.close()

  const progressive = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(progressive)
  await sendPrompt(progressive, "Create something premium.")
  await waitForQuestion(progressive, "What are you creating this invoice for?")
  await chooseOption(progressive, "Services")
  await waitForQuestion(progressive, "What should it feel like?")
  await shotPanel(progressive, stills, "03-progressive-follow-up.png")
  await progressive.close()

  const decide = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(decide)
  await sendPrompt(decide, "Create a premium invoice.")
  await waitForQuestion(decide, "What should it feel like?")
  await chooseOption(decide, "Decide for me")
  await waitForThinking(decide)
  await pause(500)
  const again = await decide
    .getByText("What should it feel like?")
    .isVisible()
    .catch(() => false)
  if (again) {
    throw new Error("Decide for me should not re-ask the same dimension")
  }
  await shotPanel(decide, stills, "04-decide-for-me.png")
  await decide.close()

  const reference = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await generateFromDashboard(reference, null)
  await waitForQuestion(reference, "What matters most from this reference?")
  await shotPanel(reference, stills, "05-reference-question.png")
  await reference.close()

  const explicit = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await generateFromDashboard(
    explicit,
    "Keep this structure but make it blue and more minimal."
  )
  await waitForThinking(explicit)
  await pause(3200)
  const refQ = await explicit
    .getByText("What matters most from this reference?")
    .isVisible()
    .catch(() => false)
  if (refQ) {
    throw new Error("Explicit reference intent should skip preservation questions")
  }
  await shotPanel(explicit, stills, "06-reference-explicit-no-question.png")
  await explicit.close()

  const element = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(element)
  await sendPrompt(element, DETAILED)
  await waitForReady(element)
  await element.getByRole("button", { name: "Edit", exact: true }).click()
  await pause(250)
  const heading = element.locator('[data-layer="Business name"]').first()
  await heading.click({ force: true })
  await pause(300)
  const scoped = element.getByLabel(/Describe your edit/)
  await scoped.waitFor({ state: "visible", timeout: 10_000 })
  await scoped.fill("make it nicer")
  await scoped.press("Enter")
  await pause(3200)
  const questionnaire = await element
    .getByText("A couple of quick choices")
    .isVisible()
    .catch(() => false)
  if (questionnaire) {
    throw new Error("Element edit launched a questionnaire")
  }
  await shotPanel(element, stills, "07-element-edit.png")
  await element.close()

  const walk = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(walk)
  await sendPrompt(walk, "Create a premium invoice.")
  await pause(800)
  await shotPanel(walk, stills, "walkthrough-01-vague-prompt.png")
  await waitForQuestion(walk, "What should it feel like?")
  await shotPanel(walk, stills, "walkthrough-02-one-question.png")
  await chooseOption(walk, "Professional")
  await waitForThinking(walk)
  await pause(500)
  await shotPanel(walk, stills, "walkthrough-03-generation-begins.png")
  await walk.close()

  await browser.close()
  console.log(stills.join("\n"))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
