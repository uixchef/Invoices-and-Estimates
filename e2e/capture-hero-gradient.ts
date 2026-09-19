import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"
import { chromium } from "playwright"

const ARTIFACTS = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "artifacts",
  "composer-reference"
)

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const stills: string[] = []
  for (const width of [1440, 1100] as const) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.addInitScript(() => {
      sessionStorage.removeItem("invoice-builder-session-v1")
    })
    await page.goto("http://localhost:3001/invoices", {
      waitUntil: "networkidle",
    })
    await page.waitForSelector("#create-with-ai-prompt")
    await page.waitForTimeout(700)
    const path = join(
      ARTIFACTS,
      width === 1440 ? "hero-gradient.png" : "hero-gradient-narrow.png"
    )
    await page.screenshot({ path })
    stills.push(path)
    await context.close()
  }
  await browser.close()
  spawn("open", ["-R", ...stills], { stdio: "ignore", detached: true }).unref()
  spawn("open", [ARTIFACTS], { stdio: "ignore", detached: true }).unref()
  console.log(`Wrote ${stills.length} hero stills`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
