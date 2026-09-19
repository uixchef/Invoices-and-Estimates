import type {
  BuilderConditionRule,
  BuilderLayerKind,
  BuilderLayerRules,
  BuilderLayerStyle,
  BuilderRuleKind,
  GeneratedLayout,
  PlacedElement,
} from "@/lib/layout-builder-types"
import { isPageLayer, PAGE_LAYER_LABEL } from "@/lib/layout-builder-types"
import {
  inheritPlacedAppearance,
  mergeInheritedStyle,
  type ResolvedFamilyBrand,
} from "@/lib/brand-boards"
import {
  authoredNativeContent,
  authoredNativeStyle,
} from "@/lib/family-authored-properties"
import { getPlacedElementLayerKind, isTextPlacedKind } from "@/lib/placed-element-defaults"
import { boundValue } from "@/lib/placed-element-prompt"
import {
  authoredKeyFromId,
  authoredLookupKey,
  isContainerAuthoredKey,
  readLayerStore,
} from "@/lib/native-instance-id"

export type PropertyResolutionInput = {
  /** Instance identity — unique per editable occurrence. Keys overrides. */
  layerId: string
  /** Authored semantic key for family default lookup. Defaults to layerId. */
  authoredKey?: string
  kind: BuilderLayerKind | null
  layout: GeneratedLayout
  tokens: ResolvedFamilyBrand
  layerStyles: Record<string, BuilderLayerStyle>
  layerText: Record<string, string>
  placed?: PlacedElement
}

export type ResolvedElementProperties = {
  layerId: string
  kind: BuilderLayerKind
  content: string
  /** Effective style shown on canvas / in the inspector. */
  style: BuilderLayerStyle
  /** Explicit element override only. */
  override: BuilderLayerStyle
  bindField?: string
}

export function explicitLayerStyle(
  layerStyles: Record<string, BuilderLayerStyle>,
  layerId: string,
  fallbackLabel?: string
): BuilderLayerStyle {
  return (
    layerStyles[layerId] ??
    (fallbackLabel ? layerStyles[fallbackLabel] : undefined) ??
    {}
  )
}

export function definedStyle(
  style: BuilderLayerStyle
): BuilderLayerStyle {
  return Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined)
  ) as BuilderLayerStyle
}

/**
 * Single resolution path:
 * explicit override → native authored (or placed inheritance) → empty
 */
export function resolveElementProperties(
  input: PropertyResolutionInput
): ResolvedElementProperties {
  const placed = input.placed
  const authoredKey = input.authoredKey ?? input.layerId
  const kind =
    input.kind ??
    (placed ? getPlacedElementLayerKind(placed.kind) : inferNativeKind(authoredKey))
  const override = definedStyle(
    placed
      ? explicitLayerStyle(input.layerStyles, input.layerId, placed.label)
      : (readLayerStore(input.layerStyles, input.layerId) ?? {})
  )

  const inherited = placed
    ? inheritPlacedAppearance(placed.kind, input.tokens)
    : authoredNativeStyle(authoredKey, {
        layout: input.layout,
        tokens: input.tokens,
      })

  const style = definedStyle(
    mergeInheritedStyle(inherited, override)
  )

  const content = resolveContent(input)
  return {
    layerId: input.layerId,
    kind,
    content,
    style,
    override,
    bindField: placed?.bindField,
  }
}

function inferNativeKind(layerId: string): BuilderLayerKind {
  if (layerId === PAGE_LAYER_LABEL) {
    return "page"
  }
  const slot = authoredKeyFromId(layerId)
  if (slot === "page") {
    return "page"
  }
  const key = authoredLookupKey(layerId)
  if (
    isContainerAuthoredKey(slot) ||
    key === "Header" ||
    key === "Billing details" ||
    key === "Line items" ||
    key === "Totals" ||
    key === "Notes" ||
    key === "Business header" ||
    key === "Customer information" ||
    key === "Items table" ||
    key === "Table header"
  ) {
    return "container"
  }
  return "text"
}

function resolveContent(input: PropertyResolutionInput): string {
  const placed = input.placed
  const authoredKey = input.authoredKey ?? input.layerId
  if (placed?.bindField) {
    const bound = boundValue(input.layout, placed.bindField)
    if (bound != null) {
      return bound
    }
  }
  const override =
    (placed
      ? input.layerText[input.layerId] ?? input.layerText[placed.label]
      : readLayerStore(input.layerText, input.layerId))
  if (override != null) {
    return override
  }
  if (placed) {
    return placed.content
  }
  return authoredNativeContent(authoredKey, input.layout) ?? ""
}

export function boundLayoutValue(
  layout: GeneratedLayout,
  field: string | undefined
): string | undefined {
  if (!field) {
    return undefined
  }
  const map: Record<string, string | undefined> = {
    businessName: layout.businessName,
    clientName: layout.clientName,
    documentNumber: layout.documentNumber,
    issueDate: layout.issueDate,
    dueDate: layout.dueDate,
    currencyCode: layout.currencyCode,
  }
  return map[field]
}

export function parseScopedStylePrompt(raw: string): {
  layerId: string
  patch: Partial<BuilderLayerStyle>
} | null {
  const scoped = raw.match(/^([^:]{1,80}):\s*([\s\S]+)$/)
  if (!scoped?.[1] || !scoped[2]) {
    return null
  }
  const layerId = scoped[1].trim()
  const body = scoped[2].toLowerCase()
  const patch: Partial<BuilderLayerStyle> = {}

  if (/\bbold\b|\bsemibold\b|\bheavy\b/.test(body)) {
    const weight = /\bsemibold\b/.test(body) ? 600 : 700
    patch.fontWeight = weight
    patch.bold = weight >= 700
  }
  if (/\bitalic\b/.test(body)) {
    patch.fontStyle = "italic"
  }
  if (/\bunderline\b/.test(body)) {
    patch.underline = true
  }
  const hex = body.match(/#([0-9a-f]{3,8})\b/i)
  if (hex) {
    const color = hex[0]
    if (/\bbackground\b|\bfill\b|\bblock\b/.test(body)) {
      patch.backgroundColor = color
    } else {
      patch.color = color
    }
  }
  const size = body.match(/\b(\d{2,3})\s*px\b/)
  if (size) {
    patch.fontSize = Number(size[1])
  }
  if (Object.keys(patch).length === 0) {
    return null
  }
  return { layerId, patch }
}

export function applyStyleOverride(
  current: Record<string, BuilderLayerStyle>,
  layerId: string,
  patch: Partial<BuilderLayerStyle>
): Record<string, BuilderLayerStyle> {
  return {
    ...current,
    [layerId]: { ...current[layerId], ...patch },
  }
}

export type InspectorPropertyGroup = "content" | "style" | "advanced"

/**
 * Data fields historically bound in the Content tab for native containers and
 * leaves. Empty means the layer has no connected-field Content controls.
 */
const CONNECTED_FIELDS_BY_LAYER: Record<string, string[]> = {
  Header: ["Company name", "Business address", "Document type", "Invoice number"],
  "Billing details": [
    "Client name",
    "Address line 1",
    "Address line 2",
    "Issue date",
    "Due date",
    "Currency",
  ],
  Totals: ["Subtotal", "Tax total", "Grand total"],
  "Table header": ["Item description", "Quantity", "Unit price", "Line total"],
  "Pay online": ["Online payment link", "Grand total"],
  "Payment extras": [
    "Online payment link",
    "Grand total",
    "Item description",
  ],
  "Business name": ["Company name"],
  "Business address": ["Business address"],
  "Document type": ["Document type"],
  "Document number": ["Invoice number"],
  "Client name": ["Client name"],
  "Client address line 1": ["Address line 1"],
  "Client address line 2": ["Address line 2"],
  "Issue date": ["Issue date"],
  "Due date": ["Due date"],
  "Currency code": ["Currency"],
}

export function connectedFieldsForLayer(
  layerId: string | null | undefined,
  authoredKey?: string
): string[] {
  if (!layerId) {
    return []
  }
  const key = authoredLookupKey(authoredKey ?? layerId)
  if (key in CONNECTED_FIELDS_BY_LAYER) {
    return CONNECTED_FIELDS_BY_LAYER[key]
  }
  if (key.startsWith("Item ") || authoredKeyFromId(authoredKey ?? layerId).startsWith("item-")) {
    return ["Item description", "Quantity", "Unit price", "Line total"]
  }
  return []
}

function hasInspectorContentGroup(input: {
  layerId: string
  authoredKey?: string
  kind: BuilderLayerKind | null
  placed?: PlacedElement
}): boolean {
  if (isPageLayer(input.layerId)) {
    return false
  }
  const placed = input.placed
  if (placed?.kind === "button") {
    return true
  }
  if (placed?.bindToLineItems || placed?.kind === "table") {
    return true
  }
  if (placed && isTextPlacedKind(placed.kind)) {
    return true
  }
  if (input.kind === "text") {
    return true
  }
  return connectedFieldsForLayer(input.layerId, input.authoredKey).length > 0
}

function hasInspectorStyleGroup(layerId: string): boolean {
  return !isPageLayer(layerId)
}

/**
 * Advanced cards that have a real renderer contract.
 *
 * Historical Advanced (Show/hide, Repeat, Wrap) stored `layerRules` only.
 * There is no field→document evaluator, no comparison value for Equals,
 * no collection iterator, and no data-context wrap. Until those exist,
 * this list stays empty so the inspector never shows a dead Advanced group.
 */
export const FUNCTIONAL_ADVANCED_KINDS: readonly BuilderRuleKind[] = []

export function hasFunctionalAdvancedCapabilities(): boolean {
  return FUNCTIONAL_ADVANCED_KINDS.length > 0
}

/**
 * Capability-derived inspector groups for the selected node.
 * Page returns [] so the overlay renders page properties with no tab switcher.
 * Advanced is included only when a rule kind has real runtime support.
 */
export function inspectorPropertyGroups(input: {
  layerId: string | null
  authoredKey?: string
  kind: BuilderLayerKind | null
  placed?: PlacedElement
}): InspectorPropertyGroup[] {
  if (!input.layerId || isPageLayer(input.layerId)) {
    return []
  }
  const groups: InspectorPropertyGroup[] = []
  if (
    hasInspectorContentGroup({
      layerId: input.layerId,
      authoredKey: input.authoredKey,
      kind: input.kind,
      placed: input.placed,
    })
  ) {
    groups.push("content")
  }
  if (hasInspectorStyleGroup(input.layerId)) {
    groups.push("style")
  }
  if (hasFunctionalAdvancedCapabilities()) {
    groups.push("advanced")
  }
  return groups
}

export function layerRulesFor(
  rules: Record<string, BuilderLayerRules>,
  layerId: string
): BuilderLayerRules {
  return rules[layerId] ?? {}
}

export function mergeLayerRule(
  current: Record<string, BuilderLayerRules>,
  layerId: string,
  kind: BuilderRuleKind,
  rule: BuilderConditionRule
): Record<string, BuilderLayerRules> {
  return {
    ...current,
    [layerId]: { ...current[layerId], [kind]: rule },
  }
}

export function clearMergedLayerRule(
  current: Record<string, BuilderLayerRules>,
  layerId: string,
  kind: BuilderRuleKind
): Record<string, BuilderLayerRules> {
  const existing = current[layerId]
  if (!existing || !(kind in existing)) {
    return current
  }
  const { [kind]: _removed, ...rest } = existing
  return { ...current, [layerId]: rest }
}

export function effectiveInspectorTab(
  requested: InspectorPropertyGroup,
  groups: InspectorPropertyGroup[]
): InspectorPropertyGroup {
  if (groups.includes(requested)) {
    return requested
  }
  if (groups.includes("style")) {
    return "style"
  }
  return groups[0] ?? "style"
}
