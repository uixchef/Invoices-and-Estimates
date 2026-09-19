import assert from "node:assert/strict"
import test from "node:test"

import {
  applyConversationScroll,
  CONVERSATION_NEAR_BOTTOM_PX,
  conversationOnClarificationChange,
  conversationOnContentChange,
  conversationOnEntry,
  conversationOnPanelReentry,
  conversationOnSubmit,
  conversationOnUserScroll,
  distanceFromBottom,
  isNearBottom,
  latestScrollTop,
} from "./conversation-scroll"

const viewport = {
  scrollTop: 0,
  clientHeight: 400,
  scrollHeight: 400,
}

const longChat = {
  scrollTop: 0,
  clientHeight: 400,
  scrollHeight: 2000,
}

test("existing-history entry requests latest positioning", () => {
  const decision = conversationOnEntry(true)
  assert.equal(decision.stickToLatest, true)
  assert.equal(decision.alignToLatest, true)
  assert.equal(
    applyConversationScroll(longChat, decision),
    latestScrollTop(longChat)
  )
})

test("empty conversation does not force an initial jump", () => {
  const decision = conversationOnEntry(false)
  assert.equal(decision.alignToLatest, false)
  assert.equal(applyConversationScroll(viewport, decision), null)
})

test("near-bottom threshold treats a small remainder as latest", () => {
  const near = {
    scrollTop: 2000 - 400 - (CONVERSATION_NEAR_BOTTOM_PX - 8),
    clientHeight: 400,
    scrollHeight: 2000,
  }
  assert.equal(isNearBottom(near), true)
  const away = {
    ...near,
    scrollTop: 200,
  }
  assert.equal(isNearBottom(away), false)
  assert.ok(distanceFromBottom(away) > CONVERSATION_NEAR_BOTTOM_PX)
})

test("manual upward scroll disables sticky-follow", () => {
  const decision = conversationOnUserScroll({
    scrollTop: 120,
    clientHeight: 400,
    scrollHeight: 2000,
  })
  assert.equal(decision.stickToLatest, false)
  assert.equal(decision.alignToLatest, false)
})

test("returning near bottom enables sticky-follow", () => {
  const decision = conversationOnUserScroll({
    scrollTop: latestScrollTop(longChat),
    clientHeight: 400,
    scrollHeight: 2000,
  })
  assert.equal(decision.stickToLatest, true)
  assert.equal(decision.alignToLatest, false)
})

test("new user submit resumes latest-follow", () => {
  const decision = conversationOnSubmit()
  assert.equal(decision.stickToLatest, true)
  assert.equal(decision.alignToLatest, true)
})

test("content update while user is away does not force bottom", () => {
  const decision = conversationOnContentChange(false)
  assert.equal(decision.alignToLatest, false)
  assert.equal(applyConversationScroll(longChat, decision), null)
})

test("content update while sticky follows bottom", () => {
  const grown = { ...longChat, scrollHeight: 2400 }
  const decision = conversationOnContentChange(true)
  assert.equal(decision.alignToLatest, true)
  assert.equal(applyConversationScroll(grown, decision), latestScrollTop(grown))
})

test("clarification state does not reset the scroll model", () => {
  const away = conversationOnClarificationChange(false)
  assert.equal(away.stickToLatest, false)
  assert.equal(away.alignToLatest, false)
  const sticky = conversationOnClarificationChange(true)
  assert.equal(sticky.stickToLatest, true)
  assert.equal(sticky.alignToLatest, true)
})

test("panel remount/re-entry with history surfaces latest", () => {
  const decision = conversationOnPanelReentry(true)
  assert.deepEqual(decision, conversationOnEntry(true))
})

test("aligning while already at latest is a no-op jump, not a loop", () => {
  const atLatest = {
    scrollTop: latestScrollTop(longChat),
    clientHeight: 400,
    scrollHeight: 2000,
  }
  const next = applyConversationScroll(atLatest, conversationOnContentChange(true))
  assert.equal(next, atLatest.scrollTop)
})
