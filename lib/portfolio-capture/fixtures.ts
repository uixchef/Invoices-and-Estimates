import type { AiTodoItem } from "../../components/ai/ai-todo-list"
import {
  buildCompletionSummary,
  buildRecommendations,
  buildTodoLabels,
  buildWorkingNarrative,
} from "../builder-narrative"
import type {
  BuilderAssistantMessage,
  BuilderLayerKind,
  BuilderMessage,
  BuilderSelection,
  BuilderStatus,
  BuilderUserMessage,
  GeneratedLayout,
} from "../layout-builder-types"
import {
  CAPTURE_DETAILED_PROMPT,
  CAPTURE_INVOICE_SOURCE_ID,
  CAPTURE_SAMPLE_SOURCE_ID,
  CAPTURE_SCOPED_LAYER,
  CAPTURE_SPARSE_PROMPT,
  captureScopedUserText,
} from "./prompts"
import { captureMessageId, type CaptureStateId } from "./runtime"

const DETAILED_REQUEST = {
  prompt: CAPTURE_DETAILED_PROMPT,
  family: "studio" as const,
  paperName: "A4",
}

function completedTodos(): AiTodoItem[] {
  return buildTodoLabels(DETAILED_REQUEST).map((label, index) => ({
    id: `builder-todo-${index}`,
    label,
    status: "done" as const,
  }))
}

/**
 * Layout `deriveLayout` produces for the detailed capture prompt at the capture
 * clock (brand family, blue accent from the prompt — not a special-cased design).
 */
export const CAPTURE_SETTLED_LAYOUT: GeneratedLayout = {
  documentType: "Standard invoice",
  businessName: "Northwind Studio",
  clientName: "Atelier Mär",
  emphasis: null,
  style: "studio",
  accent: "#1a4cff",
  currencyCode: "USD",
  currencySymbol: "$",
  sections: {
    logo: true,
    items: true,
    taxes: true,
    notes: true,
    terms: true,
    discount: false,
    onlinePayment: false,
    paymentDetails: false,
  },
  lineItems: [
    { description: "Brand identity & art direction", qty: 1, rate: 4800 },
    { description: "Campaign layout system", qty: 1, rate: 3200 },
    { description: "Design implementation", qty: 12, rate: 140 },
  ],
  taxRate: 0.1,
  discountRate: 0.1,
  documentNumber: "INV-2026-0142",
  issueDate: "Sep 17, 2026",
  dueDate: "Oct 1, 2026",
  payment: {
    bankName: "First National Bank",
    accountName: "Northwind Studio",
    accountNumber: "4829 1103 7741",
    routingNumber: "021000021",
    payUrl: "https://pay.layouts-ai.demo/invoice/INV-2026-0142",
    payLabel: "Pay online",
  },
}

function userMessage(index: number, text: string): BuilderUserMessage {
  return {
    id: captureMessageId(index),
    role: "user",
    text,
    references: [],
  }
}

function settledAssistant(index: number, prompt: string): BuilderAssistantMessage {
  return {
    id: captureMessageId(index),
    role: "assistant",
    receivedAnswers: null,
    preReasoning: null,
    preDurationSec: null,
    reasoning: buildWorkingNarrative({
      ...DETAILED_REQUEST,
      phase: "implement",
    }),
    durationSec: 7,
    todos: completedTodos(),
    summary: buildCompletionSummary(CAPTURE_SETTLED_LAYOUT, DETAILED_REQUEST),
    recommendations: buildRecommendations(CAPTURE_SETTLED_LAYOUT),
  }
}

export const EJECTED_CODE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Standard invoice · Your Business</title>
    <style>
      :root { --accent: #155eef; }
      body { font-family: Inter, sans-serif; color: #101828; margin: 24px; }
      h1 { color: var(--accent); font-size: 24px; font-weight: 600; }
      .muted { color: #667085; }
    </style>
  </head>
  <body>
    <h1>Your Business</h1>
    <p class="muted">Acme Co. · INV-2026-0142 · Sep 17, 2026</p>
  </body>
</html>
`

export type CaptureLiveKickoff = "none" | "initial-generation" | "scoped-follow-up"

export type CaptureBlueprint = {
  state: CaptureStateId
  isBlankSession: boolean
  hasGeneratedOnce: boolean
  seedPrompt: string
  messages: BuilderMessage[]
  lastMessageIndex: number
  codeOverride: string | null
  codeOpen: boolean
  previewOpen: boolean
  previewSourceId: string | null
  editMode: boolean
  inspectingLayer: string | null
  inspectingLayerKind: BuilderLayerKind | null
  editsTab: "content" | "style" | "advanced"
  selections: BuilderSelection[]
  aiEditingLayer: string | null
  thoughtDurationSec: number | null
  preThoughtDurationSec: number | null
  completedTodoCount: number
  stillStatus: BuilderStatus
  liveKickoff: CaptureLiveKickoff
}

function detailedUser(): BuilderUserMessage {
  return userMessage(1, CAPTURE_DETAILED_PROMPT)
}

function detailedSettled(): BuilderMessage[] {
  return [detailedUser(), settledAssistant(2, CAPTURE_DETAILED_PROMPT)]
}

function chromeDefaults(
  state: CaptureStateId,
  patch: Partial<CaptureBlueprint> &
    Pick<CaptureBlueprint, "stillStatus" | "liveKickoff">
): CaptureBlueprint {
  return {
    state,
    isBlankSession: false,
    hasGeneratedOnce: true,
    seedPrompt: CAPTURE_DETAILED_PROMPT,
    messages: detailedSettled(),
    lastMessageIndex: 2,
    codeOverride: null,
    codeOpen: false,
    previewOpen: true,
    previewSourceId: null,
    editMode: false,
    inspectingLayer: null,
    inspectingLayerKind: null,
    editsTab: "style",
    selections: [],
    aiEditingLayer: null,
    thoughtDurationSec: 7,
    preThoughtDurationSec: null,
    completedTodoCount: buildTodoLabels(DETAILED_REQUEST).length,
    ...patch,
  }
}

export function getCaptureBlueprint(state: CaptureStateId): CaptureBlueprint {
  switch (state) {
    case "blank":
      return {
        state,
        isBlankSession: true,
        hasGeneratedOnce: false,
        seedPrompt: "",
        messages: [],
        lastMessageIndex: 0,
        codeOverride: null,
        codeOpen: false,
        previewOpen: true,
        previewSourceId: null,
        editMode: false,
        inspectingLayer: null,
        inspectingLayerKind: null,
        editsTab: "style",
        selections: [],
        aiEditingLayer: null,
        thoughtDurationSec: null,
        preThoughtDurationSec: null,
        completedTodoCount: 0,
        stillStatus: "idle",
        liveKickoff: "none",
      }
    case "clarify-required":
      return {
        state,
        isBlankSession: false,
        hasGeneratedOnce: false,
        seedPrompt: CAPTURE_SPARSE_PROMPT,
        messages: [userMessage(1, CAPTURE_SPARSE_PROMPT)],
        lastMessageIndex: 1,
        codeOverride: null,
        codeOpen: false,
        previewOpen: true,
        previewSourceId: null,
        editMode: false,
        inspectingLayer: null,
        inspectingLayerKind: null,
        editsTab: "style",
        selections: [],
        aiEditingLayer: null,
        thoughtDurationSec: null,
        preThoughtDurationSec: 3,
        completedTodoCount: 0,
        stillStatus: "asking",
        liveKickoff: "initial-generation",
      }
    case "clarify-skipped":
      return {
        state,
        isBlankSession: false,
        hasGeneratedOnce: false,
        seedPrompt: CAPTURE_DETAILED_PROMPT,
        messages: [detailedUser()],
        lastMessageIndex: 1,
        codeOverride: null,
        codeOpen: false,
        previewOpen: true,
        previewSourceId: null,
        editMode: false,
        inspectingLayer: null,
        inspectingLayerKind: null,
        editsTab: "style",
        selections: [],
        aiEditingLayer: null,
        thoughtDurationSec: null,
        preThoughtDurationSec: null,
        completedTodoCount: 2,
        stillStatus: "thinking",
        liveKickoff: "initial-generation",
      }
    case "gen-ready":
      return chromeDefaults(state, {
        hasGeneratedOnce: true,
        messages: [detailedUser()],
        lastMessageIndex: 1,
        stillStatus: "ready",
        liveKickoff: "initial-generation",
      })
    case "scoped-edit": {
      const scopedText = captureScopedUserText()
      return chromeDefaults(state, {
        messages: [...detailedSettled(), userMessage(3, scopedText)],
        lastMessageIndex: 4,
        editMode: true,
        inspectingLayer: CAPTURE_SCOPED_LAYER,
        inspectingLayerKind: "text",
        selections: [{ id: captureMessageId(4), label: CAPTURE_SCOPED_LAYER }],
        aiEditingLayer: CAPTURE_SCOPED_LAYER,
        thoughtDurationSec: null,
        preThoughtDurationSec: 3,
        completedTodoCount: 2,
        stillStatus: "thinking",
        liveKickoff: "scoped-follow-up",
      })
    }
    case "visual-edit":
      return chromeDefaults(state, {
        editMode: true,
        inspectingLayer: CAPTURE_SCOPED_LAYER,
        inspectingLayerKind: "text",
        editsTab: "style",
        selections: [{ id: captureMessageId(3), label: CAPTURE_SCOPED_LAYER }],
        lastMessageIndex: 3,
        stillStatus: "ready",
        liveKickoff: "none",
      })
    case "preview-sample":
      return chromeDefaults(state, {
        previewSourceId: CAPTURE_SAMPLE_SOURCE_ID,
        stillStatus: "ready",
        liveKickoff: "none",
      })
    case "preview-invoice":
      return chromeDefaults(state, {
        previewSourceId: CAPTURE_INVOICE_SOURCE_ID,
        stillStatus: "ready",
        liveKickoff: "none",
      })
    case "code-ejected":
      return chromeDefaults(state, {
        codeOverride: EJECTED_CODE,
        codeOpen: true,
        previewOpen: true,
        editMode: false,
        stillStatus: "ready",
        liveKickoff: "none",
      })
  }
}
