/**
 * Generate the curated Saffron invoice screenshot used as the image-reference demo.
 *
 *   PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" npx tsx e2e/generate-saffron-reference.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "..", "public", "demo", "saffron-invoice-reference.png")

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; background: #ddd; }
    .page {
      width: 595px;
      height: 842px;
      display: flex;
      background: #f7f1ea;
      color: #1c1917;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    .field {
      width: 62%;
      background: #c2410c;
      color: white;
      padding: 48px 32px 36px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .eyebrow { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; opacity: 0.7; }
    .brand { font-size: 42px; font-weight: 800; letter-spacing: -0.05em; line-height: 0.9; margin: 12px 0 40px; }
    .due-label { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.7; }
    .due { font-size: 52px; font-weight: 800; letter-spacing: -0.05em; line-height: 0.85; margin-top: 8px; }
    .side { flex: 1; padding: 48px 28px; display: flex; flex-direction: column; }
    .meta { font-size: 11px; color: #78716c; }
    .client { font-size: 18px; font-weight: 700; margin: 6px 0 24px; letter-spacing: -0.03em; }
    .row { display: flex; justify-content: space-between; border-top: 1px solid rgba(28,25,23,0.12); padding: 10px 0; font-size: 13px; }
    .amt { font-weight: 600; }
  </style>
</head>
<body>
  <div class="page">
    <div class="field">
      <div class="eyebrow">Invoice</div>
      <div class="brand">Saffron</div>
      <div class="due-label">Amount due</div>
      <div class="due">$10,068.00</div>
    </div>
    <div class="side">
      <div class="meta">Billed to</div>
      <div class="client">Holt Atelier</div>
      <div class="row"><span>Seasonal campaign</span><span class="amt">$5,400</span></div>
      <div class="row"><span>Lookbook art direction</span><span class="amt">$2,400</span></div>
      <div class="row"><span>Retail stills × 12</span><span class="amt">$1,080</span></div>
    </div>
  </div>
</body>
</html>`

async function main() {
  await mkdir(dirname(OUT), { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 595, height: 842 },
    deviceScaleFactor: 2,
  })
  await page.setContent(HTML, { waitUntil: "load" })
  await page.locator(".page").screenshot({ path: OUT })
  await browser.close()
  console.log(`Wrote ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
