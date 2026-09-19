import type { GeneratedLayout, PlacedElement, PlacedElementZone } from "@/lib/layout-builder-types"
import { getDefaultPlacedContent } from "@/lib/placed-element-defaults"
import { nextPlacedId, nextPlacedLabel } from "@/lib/placed-elements"
import { insertRootAt, type DropDest } from "@/lib/placed-tree"

const KIND_MATCHERS: { kind: string; label: string; pattern: RegExp }[] = [
  { kind: "heading", label: "Heading", pattern: /\bheading\b/ },
  { kind: "paragraph", label: "Paragraph", pattern: /\bparagraph\b/ },
  { kind: "quote", label: "Quote", pattern: /\bquote\b/ },
  { kind: "list", label: "List", pattern: /\blist\b/ },
  { kind: "button", label: "Button", pattern: /\bbutton\b/ },
  { kind: "image", label: "Image", pattern: /\bimage\b|\bphoto\b|\blogo block\b/ },
  { kind: "divider", label: "Divider", pattern: /\bdivider\b|\brule\b/ },
  { kind: "spacer", label: "Spacer", pattern: /\bspacer\b/ },
  { kind: "container", label: "Container", pattern: /\bcontainer\b/ },
]

function quotedName(text: string): string | null {
  const quoted = text.match(/called\s+["“']([^"”']+)["”']/) ?? text.match(/named\s+["“']([^"”']+)["”']/)
  if (quoted?.[1]) {
    return quoted[1].trim()
  }
  const plain = text.match(/called\s+([^.,\n]+?)(?:\s+below|\s+after|\s+under|$)/i)
  if (plain?.[1] && !/^(a|an|the)$/i.test(plain[1].trim())) {
    return plain[1].trim().replace(/^the\s+/i, "")
  }
  return null
}

function zoneFromPrompt(text: string): PlacedElementZone {
  if (/\b(line items?|items table|item table)\b/.test(text)) {
    return "after-items"
  }
  if (/\btotals?\b/.test(text)) {
    return "after-totals"
  }
  if (/\bbilling\b|\bbill to\b/.test(text)) {
    return "after-billing"
  }
  if (/\bnotes?\b/.test(text)) {
    return "after-notes"
  }
  return "end"
}

function findKind(text: string) {
  return KIND_MATCHERS.find((entry) => entry.pattern.test(text)) ?? null
}

function findPlaced(
  placed: PlacedElement[],
  labelOrKind: string
): PlacedElement | undefined {
  const exact = placed.find(
    (element) => element.label.toLowerCase() === labelOrKind.toLowerCase()
  )
  if (exact) {
    return exact
  }
  return placed.find((element) => element.kind === labelOrKind.toLowerCase())
}

export type BlockPromptResult = {
  placed: PlacedElement[]
  inspect?: PlacedElement
  handled: boolean
  addedPayButton?: boolean
}

/**
 * Maps add/remove/rename instructions onto the same PlacedElement list the
 * palette uses. Idempotent: adding a heading that already exists is a no-op.
 */
export function applyBlockPrompt(
  placed: PlacedElement[],
  layout: GeneratedLayout,
  rawPrompt: string
): BlockPromptResult {
  const trimmed = rawPrompt.trim()
  const scoped = trimmed.match(/^([^:]{1,80}):\s*([\s\S]+)$/)
  const labelPrefix = scoped?.[1]?.trim()
  const body = (scoped?.[2] ?? trimmed).toLowerCase()
  const remove = /\b(remove|hide|delete|drop|without)\b/.test(body)

  if (labelPrefix) {
    const target = findPlaced(placed, labelPrefix)
    if (target) {
      if (remove) {
        return {
          placed: placed.filter((element) => element.id !== target.id && element.parentId !== target.id),
          handled: true,
        }
      }
      const named =
        quotedName(body) ??
        body.replace(/^(change|make|set|rename|update|turn)\s+(this|it|the copy|the text|the heading)?\s*(to|into|say|says)?\s*/i, "").trim()
      if (named && named.length < 80) {
        const next = placed.map((element) =>
          element.id === target.id
            ? { ...element, content: named.replace(/^["']|["']$/g, "") }
            : element
        )
        const inspect = next.find((element) => element.id === target.id)
        return { placed: next, inspect, handled: true }
      }
    }
  }

  const kindMatch = findKind(body)
  const adding = /\badd\b/.test(body) || /\binsert\b/.test(body)
  if (!kindMatch || !adding || remove) {
    if (remove && kindMatch) {
      const target = [...placed].reverse().find((element) => element.kind === kindMatch.kind)
      if (target) {
        return {
          placed: placed.filter((element) => element.id !== target.id && element.parentId !== target.id),
          handled: true,
        }
      }
    }
    return { placed, handled: false }
  }

  const name = quotedName(rawPrompt) ?? quotedName(body)
  const content =
    kindMatch.kind === "button" && /\bpay online\b/.test(body)
      ? (layout.payment?.payLabel ?? "Pay online")
      : (name ?? getDefaultPlacedContent(kindMatch.kind))

  const exists = placed.some(
    (element) =>
      element.kind === kindMatch.kind &&
      element.content.trim().toLowerCase() === content.trim().toLowerCase()
  )
  if (exists) {
    const inspect = placed.find(
      (element) =>
        element.kind === kindMatch.kind &&
        element.content.trim().toLowerCase() === content.trim().toLowerCase()
    )
    return { placed, inspect, handled: true }
  }

  const zone: PlacedElementZone = zoneFromPrompt(body)
  const dest: DropDest = { kind: "root", zone, index: Number.MAX_SAFE_INTEGER }
  const created: PlacedElement = {
    id: nextPlacedId(placed),
    kind: kindMatch.kind,
    label: nextPlacedLabel(placed, kindMatch.kind, kindMatch.label),
    zone,
    content,
    href:
      kindMatch.kind === "button"
        ? (layout.payment?.payUrl ?? "")
        : undefined,
  }
  return {
    placed: insertRootAt(placed, created, dest),
    inspect: created,
    handled: true,
    addedPayButton: kindMatch.kind === "button" && /\bpay online\b/.test(body),
  }
}

export const PLACED_BIND_FIELDS = [
  { id: "businessName", label: "Company name" },
  { id: "clientName", label: "Client name" },
  { id: "documentNumber", label: "Invoice number" },
  { id: "issueDate", label: "Issue date" },
  { id: "dueDate", label: "Due date" },
  { id: "currencyCode", label: "Currency" },
] as const

export type PlacedBindFieldId = (typeof PLACED_BIND_FIELDS)[number]["id"]

export function boundValue(
  layout: GeneratedLayout,
  field: string | undefined
): string | null {
  if (!field) {
    return null
  }
  if (field.startsWith("payment.")) {
    const key = field.slice("payment.".length)
    const payment = layout.payment
    const value = payment?.[key as keyof typeof payment]
    return typeof value === "string" ? value : null
  }
  const value = layout[field as PlacedBindFieldId]
  return typeof value === "string" ? value : null
}
