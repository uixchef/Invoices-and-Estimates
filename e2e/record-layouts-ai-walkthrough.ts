/**
 * Portfolio walkthrough recorder for Layouts AI.
 * Records browser-only video at 1920×1080 with a visible demo cursor.
 *
 * Usage (from my-app/):
 *   npx tsx e2e/record-layouts-ai-walkthrough.ts
 *
 * Output:
 *   ../artifacts/layouts-ai-walkthrough.webm
 */
import { mkdir, rm } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Locator, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS_DIR = join(__dirname, "..", "..", "artifacts")
const OUTPUT_WEBM = join(ARTIFACTS_DIR, "layouts-ai-walkthrough.webm")

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005"

const DEMO_PROMPT =
  "Create a clean invoice layout with my logo, itemized services, taxes, discounts, and payment terms"

const SESSION_KEY = "invoice-builder-session-v1"

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function installDemoCursor(page: Page) {
  await page.addInitScript(() => {
    if (document.getElementById("demo-cursor-root")) {
      return
    }

    const root = document.createElement("div")
    root.id = "demo-cursor-root"

    const style = document.createElement("style")
    style.textContent = `
      html, html * { cursor: none !important; }
      #demo-cursor {
        position: fixed;
        left: 0;
        top: 0;
        width: 28px;
        height: 28px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(0px, 0px);
        filter: drop-shadow(0 1px 2px rgba(16, 24, 40, 0.35));
        transition: transform 40ms linear;
      }
    `

    const cursor = document.createElement("div")
    cursor.id = "demo-cursor"
    cursor.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6.5 4.5L22.5 14.5L13.5 15.8L10.2 24.5L6.5 4.5Z" fill="#FFFFFF" stroke="#101828" stroke-width="1.4" stroke-linejoin="round"/></svg>'

    root.append(style, cursor)
    document.documentElement.appendChild(root)

    let x = Math.round(window.innerWidth * 0.5)
    let y = Math.round(window.innerHeight * 0.42)

    const paint = () => {
      cursor.style.transform = `translate(${x - 3}px, ${y - 3}px)`
    }

    document.addEventListener(
      "mousemove",
      (event) => {
        x = event.clientX
        y = event.clientY
        paint()
      },
      true
    )

    paint()
  })
}

async function clearBuilderSession(page: Page) {
  await page.evaluate((key) => sessionStorage.removeItem(key), SESSION_KEY)
}

async function movePointer(page: Page, x: number, y: number, steps = 14) {
  await page.mouse.move(x, y, { steps })
}

async function clickPoint(page: Page, x: number, y: number) {
  await movePointer(page, x, y)
  await pause(280)
  await page.mouse.down()
  await pause(70)
  await page.mouse.up()
  await pause(950)
}

async function clickLocator(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  await locator.waitFor({ state: "visible", timeout: 20_000 })
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error("Could not resolve click target bounds")
  }
  await clickPoint(page, box.x + box.width / 2, box.y + box.height / 2)
}

async function typeProgressive(page: Page, text: string, delayMs = 44) {
  for (const char of text) {
    await page.keyboard.type(char, { delay: delayMs })
  }
}

async function restPointer(page: Page) {
  const viewport = page.viewportSize() ?? { width: 1920, height: 1080 }
  await movePointer(page, viewport.width - 72, 96, 10)
  await pause(400)
}

async function waitForGenerationComplete(page: Page) {
  const stopButton = page.getByRole("button", {
    name: /Stop (thinking|generating)/i,
  })

  await stopButton.waitFor({ state: "visible", timeout: 20_000 })
  await pause(2000)

  await page.waitForFunction(
    () => {
      const stop = document.querySelector(
        'button[aria-label="Stop generating"], button[aria-label="Stop thinking"]'
      )
      const hasBusinessName = Boolean(
        document.body.textContent?.includes("Your Business")
      )
      const isPlanning = Boolean(
        document.body.textContent?.includes("Planning next moves")
      )
      return hasBusinessName && !stop && !isPlanning
    },
    undefined,
    { timeout: 35_000 }
  )

  await pause(2200)
}

async function openBusinessNameInspector(page: Page) {
  const editButton = page
    .locator("button[aria-pressed]")
    .filter({ hasText: /^Edit$/ })
    .first()
  await clickLocator(page, editButton)
  await pause(900)

  const businessName = page
    .getByText("Your Business", { exact: true })
    .filter({ visible: true })
    .last()
  await clickLocator(page, businessName)
  await pause(1100)

  const dialog = page.getByRole("dialog", { name: "Edit Business name" })
  await dialog.waitFor({ state: "visible", timeout: 15_000 })
  return dialog
}

async function runWalkthrough(page: Page) {
  await installDemoCursor(page)

  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "load" })
  await clearBuilderSession(page)
  await page.reload({ waitUntil: "load" })

  await page.locator("#create-with-ai-prompt").waitFor({
    state: "visible",
    timeout: 20_000,
  })

  await pause(2200)

  const prompt = page.locator("#create-with-ai-prompt")
  await clickLocator(page, prompt)
  await pause(350)
  await typeProgressive(page, DEMO_PROMPT)
  await pause(1100)

  const generateButton = page.getByRole("button", { name: "Generate layout" })
  await clickLocator(page, generateButton)

  await page.waitForURL("**/invoices/layouts/builder**", { timeout: 20_000 })
  await pause(900)

  await waitForGenerationComplete(page)
  await pause(2300)

  const editDialog = await openBusinessNameInspector(page)

  const dockButton = editDialog.getByRole("button", { name: "Dock to right" })
  if (await dockButton.isVisible()) {
    await clickLocator(page, dockButton)
    await pause(900)
  }

  const styleTab = editDialog.getByRole("tab", {
    name: "Style",
    exact: true,
  })
  if (await styleTab.isVisible()) {
    await clickLocator(page, styleTab)
    await pause(450)
  }

  const panelScroll = editDialog.locator(".overflow-y-auto").first()
  await panelScroll.evaluate((element) => {
    element.scrollTop = 180
  })
  await pause(400)

  const boldButton = editDialog.getByRole("button", {
    name: "Bold",
    exact: true,
  })
  await boldButton.scrollIntoViewIfNeeded()
  await pause(350)
  await clickLocator(page, boldButton)
  await pause(1800)

  const closeEditsButton = editDialog.getByRole("button", {
    name: "Close edits",
  })
  await clickLocator(page, closeEditsButton)
  await pause(800)

  const editButton = page
    .locator("button[aria-pressed]")
    .filter({ hasText: /^Edit$/ })
    .first()
  await clickLocator(page, editButton)
  await pause(1200)

  await restPointer(page)
  await pause(3000)
}

async function main() {
  await mkdir(ARTIFACTS_DIR, { recursive: true })
  await rm(OUTPUT_WEBM, { force: true })

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: ARTIFACTS_DIR,
      size: { width: 1920, height: 1080 },
    },
    colorScheme: "light",
  })

  const page = await context.newPage()

  try {
    await runWalkthrough(page)
  } finally {
    const video = page.video()
    await context.close()

    if (!video) {
      throw new Error("Playwright did not produce a video artifact")
    }

    await video.saveAs(OUTPUT_WEBM)
    await browser.close()
  }

  console.log(`Saved walkthrough video: ${OUTPUT_WEBM}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
