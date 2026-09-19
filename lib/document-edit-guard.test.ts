import assert from "node:assert/strict"
import test from "node:test"

import { documentMutationsLocked } from "./document-edit-guard"

test("Reference active blocks inspector, AI, duplicate, delete, and insert paths", () => {
  assert.equal(
    documentMutationsLocked({
      previewingVersion: false,
      compareWithReference: true,
    }),
    true
  )
})

test("returning to Result unlocks document editing", () => {
  assert.equal(
    documentMutationsLocked({
      previewingVersion: false,
      compareWithReference: false,
    }),
    false
  )
})

test("version preview also locks mutations", () => {
  assert.equal(
    documentMutationsLocked({
      previewingVersion: true,
      compareWithReference: false,
    }),
    true
  )
})
