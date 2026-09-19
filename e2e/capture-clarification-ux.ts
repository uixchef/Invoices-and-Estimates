/**
 * Clarification UX polish stills.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-clarification-ux.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "clarification-ux")
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

async function waitForQuestion(page: Page, snippet: string) {
  await page.getByText(snippet, { exact: false }).first().waitFor({
    state: "visible",
    timeout: 12_000,
  })
}

async function waitForThinking(page: Page) {
  await page
    .getByText("Thinking...", { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 12_000 })
    .catch(() => {})
}

async function shotPanel(page: Page, stills: string[], name: string) {
  const panel = page.locator("aside").filter({ hasText: "Layouts AI" }).first()
  await panel.waitFor({ state: "visible", timeout: 15_000 })
  const path = join(ARTIFACTS, name)
  await panel.screenshot({ path })
  stills.push(path)
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const stills: string[] = []

  const vague = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(vague)
  await sendPrompt(vague, "Create a premium invoice.")
  await waitForQuestion(vague, "What should it feel like?")
  await vague.getByText("Needs clarification").first().waitFor({ timeout: 8_000 })
  const skipVisible = await vague.getByRole("button", { name: "Skip" }).isVisible().catch(() => false)
  if (skipVisible) {
    throw new Error("Skip should not appear")
  }
  await shotPanel(vague, stills, "01-vague-question.png")

  await vague.getByRole("button", { name: "Professional", exact: true }).click()
  await pause(200)
  await shotPanel(vague, stills, "02-selected-answer.png")
  await vague.close()

  const judgment = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(judgment)
  await sendPrompt(judgment, "Create a premium invoice.")
  await waitForQuestion(judgment, "What should it feel like?")
  await judgment.getByRole("button", { name: "Use your judgment" }).waitFor()
  await shotPanel(judgment, stills, "03-use-your-judgment.png")
  await judgment.close()

  const freeform = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(freeform)
  await sendPrompt(freeform, "Create a premium invoice.")
  await waitForQuestion(freeform, "What should it feel like?")
  await freeform.locator("#builder-composer").fill("Clean, premium and not too corporate.")
  await pause(250)
  await shotPanel(freeform, stills, "04-freeform-answer.png")
  await freeform.locator("#builder-composer").press("Enter")
  await waitForThinking(freeform)
  await pause(600)
  await shotPanel(freeform, stills, "05-acknowledged-and-thinking.png")
  await freeform.close()

  const reference = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await reference.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)
  await reference.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await reference.waitForSelector("#create-with-ai-prompt")
  await reference.locator('input[type="file"][accept*="image"]').setInputFiles(REFERENCE)
  await pause(400)
  await reference.getByLabel("Generate layout").click()
  await reference.waitForURL("**/invoices/layouts/builder", { timeout: 20_000 })
  await waitForQuestion(reference, "What matters most from this reference?")
  await shotPanel(reference, stills, "06-reference-question.png")
  await reference.close()

  const detailed = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(detailed)
  await sendPrompt(detailed, DETAILED)
  await pause(3500)
  const asked = await detailed.getByText("What should it feel like?").isVisible().catch(() => false)
  if (asked) {
    throw new Error("Detailed prompt should not ask clarification")
  }
  await shotPanel(detailed, stills, "07-detailed-no-question.png")
  await detailed.close()

  const composer = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await composer.addInitScript((key) => {
    sessionStorage.removeItem(key)
  }, SESSION_KEY)
  await composer.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await composer.waitForSelector("#create-with-ai-prompt")
  await composer.locator('input[type="file"][accept*="image"]').setInputFiles(REFERENCE)
  await pause(400)
  const order = await composer.locator("[data-composer-left-order]").getAttribute("data-composer-left-order")
  if (order !== "attach,measurement,assets") {
    throw new Error(`Unexpected composer left order: ${order}`)
  }
  const bar = composer.locator(".prompt-bar").first()
  await bar.screenshot({ path: join(ARTIFACTS, "08-composer-attachment-order.png") })
  stills.push(join(ARTIFACTS, "08-composer-attachment-order.png"))
  await composer.close()

  const walk = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await openBlankBuilder(walk)
  await sendPrompt(walk, "Create a premium invoice.")
  await pause(700)
  await shotPanel(walk, stills, "walkthrough-01-request.png")
  await waitForQuestion(walk, "What should it feel like?")
  await shotPanel(walk, stills, "walkthrough-02-question.png")
  await walk.getByRole("button", { name: "Professional", exact: true }).click()
  await walk.getByRole("button", { name: "Continue" }).click()
  await waitForThinking(walk)
  await pause(500)
  await shotPanel(walk, stills, "walkthrough-03-resumed.png")
  await walk.close()

  await browser.close()
  console.log(stills.join("\n"))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
