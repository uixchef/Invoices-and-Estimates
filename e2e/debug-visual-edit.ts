import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, type Locator, type Page } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const artifactsDir = join(__dirname, "..", "..", "artifacts")
const baseUrl = "http://localhost:3005"
const prompt =
  "Create a clean invoice layout with my logo, itemized services, taxes, discounts, and payment terms"

async function waitForGeneratedLayout(page: Page) {
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
    { timeout: 40_000 }
  )
}

async function clickCenter(page: Page, locator: Locator) {
  await locator.waitFor({ state: "visible", timeout: 15_000 })
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error("Visible target has no bounding box")
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function captureDom(page: Page, phase: string) {
  const script = `
  (() => {
    const label = ${JSON.stringify(phase)};
    const describe = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        ariaLabel: element.getAttribute("aria-label"),
        ariaSelected: element.getAttribute("aria-selected"),
        ariaPressed: element.getAttribute("aria-pressed"),
        dataLayer: element.getAttribute("data-layer"),
        text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 240),
        className:
          typeof element.className === "string"
            ? element.className.slice(0, 300)
            : null,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none",
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      };
    };

    const businessLayers = [
      ...document.querySelectorAll('[data-layer="Business name"]'),
    ];
    const visibleLayer =
      businessLayers.find((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }) ?? null;
    const layerRect = visibleLayer?.getBoundingClientRect();
    const centerStack = layerRect
      ? document
          .elementsFromPoint(
            layerRect.x + layerRect.width / 2,
            layerRect.y + layerRect.height / 2
          )
          .slice(0, 12)
          .map(describe)
      : [];

    return {
      phase: label,
      url: location.href,
      iframeCount: document.querySelectorAll("iframe").length,
      shadowHosts: [...document.querySelectorAll("*")]
        .filter((element) => Boolean(element.shadowRoot))
        .map(describe),
      businessLayers: businessLayers.map(describe),
      businessTextMatches: [...document.querySelectorAll("*")]
        .filter(
          (element) =>
            element.children.length === 0 &&
            element.textContent?.replace(/\\s+/g, " ").trim() ===
              "Your Business"
        )
        .map((element) => ({
          ...describe(element),
          parent: element.parentElement ? describe(element.parentElement) : null,
        })),
      centerStack,
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(describe),
      tablists: [...document.querySelectorAll('[role="tablist"]')].map(
        (element) => ({
          ...describe(element),
          children: [...element.children].map(describe),
        })
      ),
      styleTextMatches: [
        ...document.querySelectorAll("button, [role], p, span, div"),
      ]
        .filter(
          (element) =>
            element.textContent?.replace(/\s+/g, " ").trim() === "Style"
        )
        .map(describe),
      editControls: [
        ...document.querySelectorAll(
          'button[aria-label], button[aria-pressed], [role="tab"]'
        ),
      ]
        .filter((element) => {
          const value = (
            (element.getAttribute("aria-label") ?? "") +
            " " +
            (element.textContent ?? "")
          ).toLowerCase()
          return /edit|style|bold|dock|float|close/.test(value)
        })
        .map(describe),
    };
  })()
  `

  return page.evaluate(script)
}

async function runValidationAttempt(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  attempt: number
) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: "light",
  })
  const page = await context.newPage()

  try {
    await page.goto(`${baseUrl}/invoices`, { waitUntil: "load" })
    await page.evaluate(() =>
      sessionStorage.removeItem("invoice-builder-session-v1")
    )
    await page.reload({ waitUntil: "load" })

    const promptInput = page.locator("#create-with-ai-prompt")
    await promptInput.waitFor({ state: "visible", timeout: 15_000 })
    await promptInput.click()
    await page.keyboard.type(prompt, { delay: 10 })
    await page.getByRole("button", { name: "Generate layout" }).click()
    await page.waitForURL("**/invoices/layouts/builder**", {
      timeout: 20_000,
    })
    await waitForGeneratedLayout(page)

    const editButton = page
      .locator("button[aria-pressed]")
      .filter({ hasText: /^Edit$/ })
      .first()
    await clickCenter(page, editButton)
    await page.waitForTimeout(800)

    const businessName = page
      .getByText("Your Business", { exact: true })
      .filter({ visible: true })
      .last()
    await businessName.waitFor({ state: "visible", timeout: 15_000 })

    if (attempt === 1) {
      await page.screenshot({
        path: join(artifactsDir, "inspector-before-business-name.png"),
      })
    }
    const before =
      attempt === 1 ? await captureDom(page, "before-click") : null

    await clickCenter(page, businessName)
    const immediate =
      attempt === 1 ? await captureDom(page, "after-click-immediate") : null
    if (attempt === 1) {
      await page.screenshot({
        path: join(artifactsDir, "inspector-after-immediate.png"),
      })
    }

    await page.waitForTimeout(1600)
    const dialog = page.getByRole("dialog", {
      name: "Edit Business name",
    })
    await dialog.waitFor({ state: "visible", timeout: 15_000 })

    if (attempt === 1) {
      const settled = await captureDom(page, "after-click-settled")
      await page.screenshot({
        path: join(artifactsDir, "inspector-after-settled.png"),
      })
      const evidence = { before, immediate, settled }
      const evidencePath = join(artifactsDir, "inspector-dom-evidence.json")
      await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
      console.log(`Evidence: ${evidencePath}`)
    }

    const styleTab = dialog.getByRole("tab", {
      name: "Style",
      exact: true,
    })
    await clickCenter(page, styleTab)

    const boldButton = dialog.getByRole("button", {
      name: "Bold",
      exact: true,
    })
    await boldButton.scrollIntoViewIfNeeded()
    await clickCenter(page, boldButton)
    if ((await boldButton.getAttribute("aria-pressed")) !== "true") {
      throw new Error(`Attempt ${attempt}: Bold did not become pressed`)
    }

    console.log(`Attempt ${attempt}: PASS`)
  } finally {
    await context.close()
  }
}

async function main() {
  await mkdir(artifactsDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })

  try {
    await runValidationAttempt(browser, 1)
    await runValidationAttempt(browser, 2)
  } finally {
    await browser.close()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
