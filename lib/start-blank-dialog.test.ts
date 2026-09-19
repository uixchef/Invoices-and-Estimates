import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const src = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/invoices/start-blank-medium-dialog.tsx"
  ),
  "utf8"
)

test("start-blank dialog exposes a DialogDescription instead of silencing Radix", () => {
  assert.match(src, /DialogDescription/)
  assert.match(
    src,
    /Choose a paper size to start your layout from a blank page\./
  )
  assert.match(src, /DialogDescription className="sr-only"/)
  assert.doesNotMatch(src, /aria-describedby=\{undefined\}/)
})
