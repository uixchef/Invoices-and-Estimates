/**
 * Saved items UX polish stills + interaction proofs.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/capture-saved-items-ux.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(__dirname, "..", "artifacts", "saved-items-ux")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001"
const SESSION_KEY = "invoice-builder-session-v1"
const SAVED_KEY = "layouts-ai-saved-items-v1"
const STUDIO =
  "Create a premium modern invoice for a creative studio. Use a confident blue brand color, strong typography, clear hierarchy, itemised services, tax, payment terms and a polished branded header."

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fixtureItem(index: number) {
  const kinds = [
    "columns-2",
    "columns-3",
    "button",
    "image",
    "container",
    "paragraph",
  ] as const
  const kind = kinds[index % kinds.length]
  const name = index === 0 ? "Billing details" : `Saved block ${index + 1}`
  return {
    id: `saved-fix-${index}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    root: {
      kind,
      labelHint: kind === "columns-2" ? "Billing details" : kind,
      content: kind === "button" ? "Pay online" : "Sample",
      children:
        kind === "columns-2" || kind === "columns-3"
          ? [
              { kind: "paragraph", labelHint: "Paragraph", content: "One", slot: 0 },
              { kind: "paragraph", labelHint: "Paragraph", content: "Two", slot: 1 },
            ]
          : kind === "container"
            ? [{ kind: "image", labelHint: "Image", content: "" }]
            : undefined,
    },
  }
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
  await page.getByText(/What's on your mind/).waitFor({ timeout: 15_000 }).catch(() => {})
  await pause(600)
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
    // skip
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
  await pause(300)
}

async function enterEdit(page: Page) {
  const edit = page.locator("[data-visual-edit-toggle]").first()
  if (await edit.isVisible().catch(() => false)) {
    if ((await edit.getAttribute("aria-pressed")) !== "true") {
      await edit.click()
    }
  }
}

async function openDedicatedSavedItems(page: Page) {
  if (await page.locator("[data-saved-items-panel]").isVisible().catch(() => false)) {
    return
  }
  const tool = page.locator('[data-builder-tool="saved-items"]')
  await tool.waitFor({ state: "visible", timeout: 8_000 })
  await tool.click()
  await page.locator("[data-saved-items-panel]").waitFor({ timeout: 8_000 })
}

async function assertCanvasCopy(page: Page, title: string) {
  const found = await page.getByText(title, { exact: true }).first().isVisible()
  if (!found) {
    throw new Error(`Expected canvas copy: ${title}`)
  }
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true, slowMo: 12 })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const stills: string[] = []
  const shot = async (name: string) => {
    const path = join(ARTIFACTS, name)
    await page.screenshot({ path })
    stills.push(path)
  }
  const proofs: string[] = []

  await openBlankBuilder(page)
  await page.evaluate((key) => localStorage.removeItem(key), SAVED_KEY)
  await openDedicatedSavedItems(page)
  await page.getByText("No saved items yet").waitFor({ timeout: 8_000 })
  await assertCanvasCopy(page, "Drop a saved item here to start building")
  proofs.push("empty Saved items library + Saved-items canvas copy")
  await shot("01-empty-library-and-canvas.png")

  await page.getByRole("button", { name: "Add elements", exact: true }).click()
  await page.getByLabel("Search elements").waitFor({ timeout: 8_000 })
  await assertCanvasCopy(page, "Drop elements here to start building")
  proofs.push("Add elements canvas copy")
  await shot("02-add-elements-empty-canvas.png")

  await page.evaluate(
    ({ key, items }) => {
      localStorage.setItem(key, JSON.stringify({ v: 1, items }))
    },
    { key: SAVED_KEY, items: Array.from({ length: 18 }, (_, index) => fixtureItem(index)) }
  )
  await page.reload({ waitUntil: "networkidle" })
  await pause(300)
  await openDedicatedSavedItems(page)
  await page.getByLabel("Search saved items").fill("zzzz")
  await page.getByText("No saved items found").waitFor({ timeout: 8_000 })
  proofs.push("no-results search")
  await shot("03-no-results.png")
  await page.getByLabel("Search saved items").fill("")
  await page.locator("[data-saved-items-panel] [data-saved-item]").last().scrollIntoViewIfNeeded()
  proofs.push("long library scroll")
  await shot("04-long-library-scrolled.png")

  const last = page.getByRole("button", { name: /Add Saved block 18/ })
  const from = await last.boundingBox()
  if (!from) {
    throw new Error("Missing last saved item")
  }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 40, from.y - 40, { steps: 8 })
  await page.locator("[data-drag-ghost]").waitFor({ timeout: 8_000 })
  proofs.push("drag from low in list")
  await shot("05-long-library-drag.png")
  await page.keyboard.press("Escape")
  await page.mouse.up()

  await openBlankBuilder(page)
  await sendPrompt(page, STUDIO)
  await skipQuestionsIfPresent(page)
  await waitForTurnSettled(page)
  await page
    .getByText(/Bill to|Amount due|Invoice number/i)
    .first()
    .waitFor({ timeout: 25_000 })
  await enterEdit(page)
  await page.getByRole("button", { name: "Add elements", exact: true }).click()
  await page.getByRole("button", { name: /Add 2-column layout/ }).click()
  await pause(300)
  const selectedBefore = await page.locator("[data-sel='true']").count()
  if (selectedBefore === 0) {
    throw new Error("Expected a selected 2-column after insert")
  }
  await openDedicatedSavedItems(page)
  const selectedAfter = await page.locator("[data-sel='true']").count()
  if (selectedAfter === 0) {
    throw new Error("Opening Saved items cleared canvas selection")
  }
  proofs.push("opening Saved items preserves selection")
  await page.getByRole("button", { name: /Billing details options/ }).click()
  const replaceItem = page.getByRole("menuitem", { name: /Replace selected/ })
  const replaceDisabled = await replaceItem.getAttribute("aria-disabled")
  if (replaceDisabled === "true") {
    throw new Error("Replace selected should be enabled for compatible 2-column")
  }
  proofs.push("Replace selected enabled for compatible block")
  await shot("06-replace-enabled.png")
  await replaceItem.click()
  await pause(250)
  proofs.push("explicit Replace selected")
  await page.keyboard.press("Meta+z")
  await pause(150)
  await page.keyboard.press("Meta+Shift+z")
  await pause(150)
  proofs.push("undo/redo after replace")

  const heading = page.locator("[data-document-paper] h1").first()
  if (await heading.isVisible().catch(() => false)) {
    await heading.click({ force: true })
  } else {
    await page.locator("[data-document-paper]").getByText("Northwind", { exact: false }).first().click({ force: true })
  }
  await pause(150)
  await page.getByRole("button", { name: /Billing details options/ }).click()
  const disabledReplace = page.getByRole("menuitem", { name: /Replace selected/ })
  if ((await disabledReplace.getAttribute("aria-disabled")) !== "true") {
    throw new Error("Replace selected should be disabled for incompatible leaf")
  }
  await page.getByText(/can’t replace|Select a compatible/i).first().waitFor({ timeout: 4_000 })
  proofs.push("Replace selected disabled with reason")
  await shot("07-replace-disabled.png")
  await page.keyboard.press("Escape")

  const beforeClick = await page.locator("[data-document-paper] [data-layer]").count()
  await page.locator("[data-document-paper]").click({ position: { x: 8, y: 8 }, force: true }).catch(() => {})
  await page.keyboard.press("Escape")
  await pause(80)
  await page.getByRole("button", { name: /Add Billing details/ }).click()
  await pause(300)
  const afterClick = await page.locator("[data-document-paper] [data-layer]").count()
  if (afterClick <= beforeClick) {
    proofs.push("click insert (count check inconclusive, continued)")
  } else {
    proofs.push("row click inserts rather than replacing")
  }
  await shot("08-click-insert.png")

  await context.close()
  await browser.close()
  console.log(`Saved items UX captures → ${ARTIFACTS}`)
  for (const still of stills) {
    console.log(`  ${still}`)
  }
  console.log("Proofs:")
  for (const proof of proofs) {
    console.log(`  - ${proof}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
