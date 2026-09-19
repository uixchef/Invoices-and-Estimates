/**
 * Dump computed heading styles and line boxes at the failing viewport.
 * PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx e2e/debug-hero-heading.ts
 */
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

const ARTIFACTS = join(dirname(fileURLToPath(import.meta.url)), "..", "artifacts", "hero-heading-fix")
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001"

async function dump(page: import("playwright").Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.waitForTimeout(250)
  return page.evaluate(`(() => {
    const w = ${width};
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        width: cs.width,
        minWidth: cs.minWidth,
        maxWidth: cs.maxWidth,
        flexBasis: cs.flexBasis,
        whiteSpace: cs.whiteSpace,
        float: cs.float,
        verticalAlign: cs.verticalAlign,
        lineHeight: cs.lineHeight,
        fontSize: cs.fontSize,
        offsetWidth: el.offsetWidth,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        rects: [...el.getClientRects()].map((r) => ({
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        })),
      };
    };
    const h1 = document.querySelector(".hero-title");
    const lead = document.querySelector(".hero-title-lead");
    const accent = document.querySelector(".hero-accent");
    const live = document.querySelector(".hero-accent__live");
    const text = document.querySelector(".hero-accent__text");
    const caret = document.querySelector(".hero-accent__caret");
    const sr = document.querySelector(".hero-accent__status");
    return {
      width: w,
      html: h1 ? h1.innerHTML.slice(0, 900) : null,
      brCount: h1 ? h1.querySelectorAll("br").length : 0,
      h1: pick(h1),
      lead: pick(lead),
      accent: pick(accent),
      live: pick(live),
      text: pick(text),
      caret: pick(caret),
      sr: pick(sr),
      srText: sr ? sr.textContent : null,
      liveText: text ? text.textContent : null,
      h1BeforeContent: h1 ? getComputedStyle(h1, "::before").content : null,
      h1AfterContent: h1 ? getComputedStyle(h1, "::after").content : null,
      parent: h1 && h1.parentElement ? pick(h1.parentElement) : null,
      parentClass: h1 && h1.parentElement ? h1.parentElement.className : null,
    };
  })()`)
}

async function main() {
  await mkdir(ARTIFACTS, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } })
  await page.goto(`${BASE_URL}/invoices`, { waitUntil: "networkidle" })
  await page.waitForSelector(".hero-title")
  await page.waitForTimeout(2800)

  await page.evaluate(`(() => {
    const h1 = document.querySelector(".hero-title");
    if (!h1) return;
    const clone = h1.cloneNode(true);
    h1.replaceWith(clone);
    const text = clone.querySelector(".hero-accent__text");
    if (text) text.textContent = "polished";
    const sr = clone.querySelector(".hero-accent__status");
    if (sr) sr.textContent = "polished";
    const caret = clone.querySelector(".hero-accent__caret");
    if (caret) caret.remove();
  })()`)

  const widths = [1440, 1280, 1100, 1040, 1024, 1000, 960, 900]
  for (const width of widths) {
    const info = await dump(page, width)
    const { writeFile } = await import("node:fs/promises")
    await writeFile(join(ARTIFACTS, `after-${width}.json`), JSON.stringify(info, null, 2))
    await page.screenshot({
      path: join(ARTIFACTS, `after-${width}.png`),
    })
    const leadRects = (info as { lead?: { rects?: { y: number }[] } }).lead?.rects ?? []
    const ys = new Set(leadRects.map((r) => r.y))
    console.log(
      width,
      "h1",
      (info as { h1?: { width: string } }).h1?.width,
      "leadLines",
      ys.size,
      JSON.stringify(leadRects)
    )
  }

  await page.evaluate(`(() => {
    const text = document.querySelector(".hero-accent__text");
    if (text) text.textContent = "professional";
    const sr = document.querySelector(".hero-accent__status");
    if (sr) sr.textContent = "professional";
  })()`)
  for (const width of [1100, 1024, 900]) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(200)
    await page.screenshot({
      path: join(ARTIFACTS, `after-professional-${width}.png`),
    })
  }

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
