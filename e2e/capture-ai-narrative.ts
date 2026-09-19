/**
 * Left-panel working-narrative stills across generation paths.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-ai-narrative.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "ai-narrative")
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
  await pause(250)
}

async function sendPrompt(page: Page, text: string) {
  const welcome = page.locator("#builder-welcome-prompt")
  if (await welcome.isVisible().catch(() => false)) {
    await welcome.fill(text)
    await welcome.press("Enter")
    return
  }
  const composer = page.locator("#builder-composer")
  await composer.fill(text)
  await composer.press("Enter")
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

async function waitForThinking(page: Page) {
  await page.getByText("Thinking...", { exact: false }).first().waitFor({
    timeout: 12_000,
  })
}

async function waitForPanelText(page: Page, snippets: string[]) {
  await page.waitForFunction(
    (expected) => {
      const panel = [...document.querySelectorAll("aside")].find((node) =>
        node.textContent?.includes("Layouts AI")
      )
      const text = panel?.textContent ?? ""
      return expected.every((snippet) => text.includes(snippet))
    },
    snippets,
    { timeout: 15_000 }
  )
}

async function waitForReady(page: Page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes("Thinking..."),
    undefined,
    { timeout: 30_000 }
  )
  // Completion copy streams after status is ready. Wait until every visible
  // stream in the panel has finished, so complete stills are never mid-word.
  await page.waitForFunction(
    () => {
      const panel = [...document.querySelectorAll("aside")].find((node) =>
        node.textContent?.includes("Layouts AI")
      )
      if (!panel) {
        return false
      }
      const nodes = panel.querySelectorAll("[data-streaming-complete]")
      if (nodes.length === 0) {
        return false
      }
      return [...nodes].every(
        (node) => node.getAttribute("data-streaming-complete") === "1"
      )
    },
    undefined,
    { timeout: 20_000 }
  )
  await pause(200)
}

async function shotPanel(page: Page, stills: string[], name: string) {
  const panel = page.locator("aside").filter({ hasText: "Layouts AI" }).first()
  await panel.waitFor({ state: "visible", timeout: 15_000 })
  const scroller = panel.locator(".overflow-y-auto").first()
  if (await scroller.count()) {
    await scroller.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
  }
  const path = join(ARTIFACTS, name)
  await panel.screenshot({ path })
  stills.push(path)
}

async function generateFromDashboardReference(
  page: Page,
  stills: string[],
  prefix: string,
  prompt: string | null,
  completeSnippets: string[]
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
  await waitForThinking(page)
  await pause(700)
  await shotPanel(page, stills, `${prefix}-interpret.png`)
  await skipQuestionsIfPresent(page)
  await waitForThinking(page)
  await pause(2_400)
  await shotPanel(page, stills, `${prefix}-working.png`)
  await waitForReady(page)
  await waitForPanelText(page, completeSnippets)
  await shotPanel(page, stills, `${prefix}-complete.png`)
}

async function generateFromWelcome(
  page: Page,
  stills: string[],
  prompt: string,
  prefix: string,
  completeSnippets: string[]
) {
  await openBlankBuilder(page)
  await sendPrompt(page, prompt)
  await waitForThinking(page)
  await pause(500)
  await shotPanel(page, stills, `${prefix}-interpret.png`)
  await skipQuestionsIfPresent(page)
  await waitForThinking(page)
  await pause(2_200)
  await shotPanel(page, stills, `${prefix}-working.png`)
  await waitForReady(page)
  await waitForPanelText(page, completeSnippets)
  await shotPanel(page, stills, `${prefix}-complete.png`)
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const stills: string[] = []

  const simple = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await generateFromWelcome(
    simple,
    stills,
    "Make an invoice",
    "simple-prompt",
    ["is ready"]
  )
  await simple.close()

  const detailed = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await generateFromWelcome(detailed, stills, DETAILED, "detailed-prompt", [
    "stronger visual weight",
    "Editable payment and notes sections",
  ])
  await detailed.getByText("Add a discount row").first().click()
  await waitForThinking(detailed)
  await pause(400)
  await shotPanel(detailed, stills, "quick-discount-working.png")
  await waitForReady(detailed)
  await waitForPanelText(detailed, [
    "Discount added. Subtotal, tax and amount due are updated.",
  ])
  await shotPanel(detailed, stills, "quick-discount-complete.png")
  await detailed
    .getByText("Switch to a bold, branded color scheme")
    .first()
    .click()
  await waitForThinking(detailed)
  await pause(400)
  await shotPanel(detailed, stills, "quick-brand-working.png")
  await waitForReady(detailed)
  await waitForPanelText(detailed, [
    "Accent updated to a bolder branded palette. This Studio composition is unchanged.",
  ])
  await shotPanel(detailed, stills, "quick-brand-complete.png")
  await detailed.close()

  const reconstruct = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await generateFromDashboardReference(
    reconstruct,
    stills,
    "reference-only",
    null,
    [
      "The reconstruction is ready",
      "Payment, notes and terms stay editable",
    ]
  )
  await reconstruct.close()

  const modified = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  await generateFromDashboardReference(
    modified,
    stills,
    "reference-modify",
    "Use this structure but make it blue and more minimal.",
    [
      "The reconstruction is ready",
      "quieter styling and a blue accent",
      "Everything on the page stays editable",
    ]
  )
  await modified.close()

  await browser.close()

  const { spawn } = await import("node:child_process")
  spawn("open", ["-R", ...stills], { stdio: "ignore", detached: true }).unref()
  spawn("open", [ARTIFACTS], { stdio: "ignore", detached: true }).unref()
  console.log(`Wrote ${stills.length} stills to ${ARTIFACTS}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
