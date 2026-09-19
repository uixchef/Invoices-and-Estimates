import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  PRODUCT_CLOSE_LABEL,
  PRODUCT_DISCLAIMER,
  PRODUCT_MESSAGE_LABEL,
  PRODUCT_NAME,
  PRODUCT_UNREACHABLE,
} from "./product-name"
import { USE_YOUR_JUDGMENT_LABEL } from "./clarification-copy"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") {
      continue
    }
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path, acc)
      continue
    }
    if (/\.(tsx|ts)$/.test(entry.name)) {
      acc.push(path)
    }
  }
  return acc
}

function userFacingHits(source: string): string[] {
  const hits: string[] = []
  const quoted = /["'`]Invoice AI["'`]/g
  const jsx = />\s*Invoice AI\s*</g
  if (quoted.test(source) || jsx.test(source)) {
    hits.push("Invoice AI")
  }
  if (/["'`]Layout AI["'`]/.test(source)) {
    hits.push("Layout AI")
  }
  return hits
}

test("approved feature name is Layouts AI", () => {
  assert.equal(PRODUCT_NAME, "Layouts AI")
  assert.match(PRODUCT_DISCLAIMER, /^Layouts AI can make mistakes/)
  assert.match(PRODUCT_UNREACHABLE, /^Couldn't reach Layouts AI/)
  assert.equal(PRODUCT_MESSAGE_LABEL, "Message Layouts AI")
  assert.equal(PRODUCT_CLOSE_LABEL, "Close Layouts AI")
})

test("no reachable user-facing Invoice AI or Layout AI remains", () => {
  const files = [
    ...walk(join(root, "components")),
    ...walk(join(root, "app")),
    ...walk(join(root, "lib")),
    ...walk(join(root, "e2e")),
  ]
  const offenders: string[] = []
  for (const file of files) {
    if (file.endsWith("product-name.test.ts")) {
      continue
    }
    const source = readFileSync(file, "utf8")
    const hits = userFacingHits(source)
    if (hits.length > 0) {
      offenders.push(`${file.replace(root + "/", "")}: ${hits.join(", ")}`)
    }
  }
  assert.deepEqual(offenders, [])
})

test("primary surfaces use Layouts AI", () => {
  const panel = readFileSync(
    join(root, "components/invoices/builder/invoice-ai-panel.tsx"),
    "utf8"
  )
  const toolbar = readFileSync(
    join(root, "components/invoices/builder/layout-builder-toolbar.tsx"),
    "utf8"
  )
  const hero = readFileSync(
    join(root, "components/invoices/create-with-ai-panel.tsx"),
    "utf8"
  )
  assert.match(panel, /PRODUCT_NAME/)
  assert.match(panel, /PRODUCT_DISCLAIMER/)
  assert.match(panel, /PRODUCT_MESSAGE_LABEL/)
  assert.match(toolbar, /aria-label=\{PRODUCT_NAME\}/)
  assert.match(hero, /\{PRODUCT_NAME\}/)
  const welcome = readFileSync(
    join(root, "components/invoices/builder/ai-welcome-state.tsx"),
    "utf8"
  )
  assert.match(welcome, /PRODUCT_DISCLAIMER/)
})

test("invoice remains the document domain in user-facing creation copy", () => {
  const hero = readFileSync(
    join(root, "components/invoices/create-with-ai-panel.tsx"),
    "utf8"
  )
  const canvas = readFileSync(
    join(root, "components/invoices/builder/layout-builder-canvas.tsx"),
    "utf8"
  )
  assert.match(hero, /Create an invoice/)
  assert.match(canvas, /Start creating your invoice layout/)
})

test("sentence-case contracts for important controls", () => {
  assert.equal(USE_YOUR_JUDGMENT_LABEL, "Use your judgment")
  const toolbar = readFileSync(
    join(root, "components/invoices/builder/layout-builder-toolbar.tsx"),
    "utf8"
  )
  assert.match(toolbar, /aria-label="Add elements"/)
  assert.match(toolbar, /aria-label="Saved items"/)
  assert.match(toolbar, /aria-label="Version history"/)
  assert.match(toolbar, /aria-label="Brand boards"/)
  assert.doesNotMatch(toolbar, /comingSoon/)
  assert.doesNotMatch(toolbar, /Coming soon/)
  const add = readFileSync(
    join(root, "components/invoices/builder/add-elements-panel.tsx"),
    "utf8"
  )
  const saved = readFileSync(
    join(root, "components/invoices/builder/saved-items-panel.tsx"),
    "utf8"
  )
  const history = readFileSync(
    join(root, "components/invoices/builder/version-history-panel.tsx"),
    "utf8"
  )
  assert.doesNotMatch(add, /Coming soon/)
  assert.doesNotMatch(saved, /Coming soon/)
  assert.doesNotMatch(history, /Coming soon/)
})

test("Brand Board panel uses US color spelling", () => {
  const boards = readFileSync(
    join(root, "components/invoices/builder/brand-boards-panel.tsx"),
    "utf8"
  )
  assert.match(boards, /Keep the colors\. Change the type\./)
  assert.match(boards, /Keep the type\. Change the colors\./)
  assert.doesNotMatch(boards, /Keep the colours/)
})
