import {
  inheritPlacedAppearance,
  type ResolvedFamilyBrand,
} from "@/lib/brand-boards"
import {
  authoredKeyFromId,
  displayLabelForSlot,
} from "@/lib/native-instance-id"
import type {
  BuilderLayerStyle,
  GeneratedLayout,
  PlacedElement,
  PlacedElementZone,
} from "@/lib/layout-builder-types"
import {
  canNestInside,
  childrenOf,
  descendantIds,
  insertChildAt,
  insertRootAt,
  isLayoutKind,
  removePlacedTree,
  duplicatePlacedSubtree,
  type DropDest,
} from "@/lib/placed-tree"

export const SAVED_ITEMS_KEY = "layouts-ai-saved-items-v1"
export const SAVED_ITEMS_VERSION = 1 as const

export type SavedItemNode = {
  kind: string
  /** Preferred canvas label for this node; reallocated on insert. */
  labelHint: string
  content: string
  columns?: string[]
  href?: string
  bindToLineItems?: boolean
  bindField?: string
  slot?: number
  /** Explicit local overrides only — never frozen Brand Board tokens. */
  style?: BuilderLayerStyle
  children?: SavedItemNode[]
}

export type SavedItemDefinition = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  root: SavedItemNode
}

export type SavedItemsEnvelope = {
  v: typeof SAVED_ITEMS_VERSION
  items: SavedItemDefinition[]
}

export type SaveContext = {
  label: string
  placedElements: PlacedElement[]
  layerText: Record<string, string>
  layerStyles: Record<string, BuilderLayerStyle>
  layout: GeneratedLayout | null
  brandTokens: ResolvedFamilyBrand
}

export type SavePopoverAnchor = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export function findPlacedByInspectKey(
  elements: PlacedElement[],
  key: string | null | undefined
): PlacedElement | undefined {
  if (!key) {
    return undefined
  }
  return elements.find((element) => element.id === key || element.label === key)
}

export function visibleLayerTitle(
  key: string | null | undefined,
  elements: PlacedElement[],
  displayLabel?: string | null
): string {
  if (!key) {
    return ""
  }
  const placed = findPlacedByInspectKey(elements, key)
  if (placed) {
    return placed.label
  }
  if (displayLabel) {
    return displayLabel
  }
  return displayLabelForSlot(authoredKeyFromId(key))
}

export function placeSavePopover(
  anchor: SavePopoverAnchor,
  viewport: { width: number; height: number }
): { top: number; left: number; width: number } {
  const width = 280
  const height = 48
  const gap = 6
  let left = anchor.left
  if (left + width > viewport.width - 8) {
    left = Math.max(8, viewport.width - width - 8)
  }
  if (left < 8) {
    left = 8
  }
  let top = anchor.bottom + gap
  if (top + height > viewport.height - 8) {
    top = Math.max(8, anchor.top - height - gap)
  }
  return { top, left, width }
}

export type SaveAvailability =
  | { ok: true; node: SavedItemNode; defaultName: string }
  | { ok: false; reason: string }

export type ReplaceCheck =
  | { ok: true }
  | { ok: false; reason: string }

export type CompatibilityGroup =
  | "text"
  | "image"
  | "button"
  | "table"
  | "container"
  | "spacer"
  | "divider"

const INHERITED_STYLE_KEYS = [
  "color",
  "fontFamily",
  "backgroundColor",
  "borderColor",
] as const

const PAGE_ONLY_STYLE_KEYS = [
  "watermarkType",
  "watermarkText",
  "watermarkColor",
  "watermarkImage",
  "watermarkLayout",
  "watermarkOpacity",
  "watermarkRotation",
] as const

export const UNSAVABLE_NATIVE_LABELS: Record<string, string> = {
  Header: "The family header stays layout-specific and isn’t a reusable block.",
  "Items table": "Line items stay bound to this document.",
  "Table header": "Line items stay bound to this document.",
  Totals: "Totals are computed from this document’s financials.",
  Page: "Page chrome isn’t a reusable content block.",
  "Payment extras": "This family region isn’t a reusable structured block.",
}

const NATIVE_LEAF: Record<
  string,
  { kind: string; bindField?: string; defaultName?: string }
> = {
  "Bill to label": { kind: "heading", defaultName: "Bill to" },
  "Client name": { kind: "paragraph", bindField: "clientName" },
  "Client address line 1": { kind: "paragraph" },
  "Client address line 2": { kind: "paragraph" },
  "Issued label": { kind: "paragraph" },
  "Issue date": { kind: "paragraph", bindField: "issueDate" },
  "Due label": { kind: "paragraph" },
  "Due date": { kind: "paragraph", bindField: "dueDate" },
  "Currency code": { kind: "paragraph", bindField: "currencyCode" },
  "Notes heading": { kind: "heading", defaultName: "Notes" },
  "Notes body": { kind: "paragraph", defaultName: "Notes" },
  "Payment terms heading": { kind: "heading", defaultName: "Payment terms" },
  "Payment terms body": { kind: "paragraph", defaultName: "Payment terms" },
  "Payment details heading": { kind: "heading", defaultName: "Bank details" },
  "Payment bank name": { kind: "paragraph", defaultName: "Bank details" },
  "Payment account name": { kind: "paragraph", defaultName: "Bank details" },
  "Payment account number": { kind: "paragraph", defaultName: "Bank details" },
  "Payment routing number": { kind: "paragraph", defaultName: "Bank details" },
  "Pay online button": { kind: "button", defaultName: "Pay online button" },
}

export function catalogueLabel(kind: string): string {
  return productKindLabel(kind)
}

export function productKindLabel(kind: string): string {
  if (kind === "columns-1") return "1-column section"
  if (kind === "columns-2") return "2-column section"
  if (kind === "columns-3") return "3-column section"
  if (kind === "columns-4") return "4-column section"
  if (kind === "heading") return "Heading"
  if (kind === "paragraph") return "Paragraph"
  if (kind === "list") return "List"
  if (kind === "quote") return "Quote"
  if (kind === "divider") return "Divider"
  if (kind === "container") return "Section"
  if (kind === "spacer") return "Spacer"
  if (kind === "image") return "Image"
  if (kind === "button") return "Button"
  if (kind === "table") return "Table"
  return kind
}

export function structureHint(
  root: SavedItemNode,
  options: { name?: string; siblings?: SavedItemDefinition[] } = {}
): string {
  const name = (options.name ?? root.labelHint).trim()
  const descriptor = semanticDescriptor(root, name)
  const siblings = options.siblings ?? []
  const similar = siblings.filter(
    (item) =>
      item.name.trim().toLowerCase() === name.toLowerCase() &&
      semanticDescriptor(item.root, item.name) === descriptor
  )
  const count = countNodes(root) - 1
  if (similar.length > 1 && count > 0) {
    return `${descriptor} · ${count} elements`
  }
  return descriptor
}

function semanticDescriptor(root: SavedItemNode, name: string): string {
  const lower = name.toLowerCase()
  if (root.kind === "button" || /pay online/.test(lower)) {
    return "Button"
  }
  if (root.kind === "image") {
    return "Image"
  }
  if (isLayoutKind(root.kind) && /payment|bank/.test(lower)) {
    return "Payment section"
  }
  if (root.kind === "container") {
    const kids = root.children ?? []
    const textOnly =
      kids.length > 0 &&
      kids.every((child) =>
        ["heading", "paragraph", "list", "quote"].includes(child.kind)
      )
    return textOnly ? "Text section" : "Section"
  }
  return productKindLabel(root.kind)
}

export const SAVED_ITEMS_EMPTY_TITLE = "No saved items yet"
export const SAVED_ITEMS_EMPTY_BODY =
  "Save a reusable section from the canvas to use it across layouts."
export const SAVED_ITEMS_NO_RESULTS_TITLE = "No saved items found"
export const SAVED_ITEMS_NO_RESULTS_BODY = "Try a different search."

/** Both the dedicated panel and the Add elements shortcut read this one library. */
export const SAVED_ITEMS_SURFACES = [
  "dedicated-panel",
  "add-elements-shortcut",
] as const

export function savedItemMatchesQuery(
  item: SavedItemDefinition,
  query: string
): boolean {
  const term = query.trim().toLowerCase()
  if (!term) {
    return true
  }
  const descriptor = structureHint(item.root, { name: item.name })
  return (
    item.name.toLowerCase().includes(term) ||
    descriptor.toLowerCase().includes(term) ||
    productKindLabel(item.root.kind).toLowerCase().includes(term)
  )
}

function countNodes(node: SavedItemNode): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0)
}

export function compatibilityGroup(kind: string): CompatibilityGroup | null {
  if (
    kind === "heading" ||
    kind === "paragraph" ||
    kind === "list" ||
    kind === "quote"
  ) {
    return "text"
  }
  if (kind === "image") return "image"
  if (kind === "button") return "button"
  if (kind === "table") return "table"
  if (kind === "spacer") return "spacer"
  if (kind === "divider") return "divider"
  if (kind === "container" || kind.startsWith("columns-")) return "container"
  return null
}

export function canReplaceKinds(
  savedKind: string,
  targetKind: string
): ReplaceCheck {
  const saved = compatibilityGroup(savedKind)
  const target = compatibilityGroup(targetKind)
  if (!saved || !target) {
    return { ok: false, reason: "This item isn’t a compatible block." }
  }
  if (saved !== target) {
    return {
      ok: false,
      reason: `A ${catalogueLabel(savedKind).toLowerCase()} can’t replace a ${catalogueLabel(targetKind).toLowerCase()}.`,
    }
  }
  return { ok: true }
}

export const REPLACE_NO_SELECTION = "Select a compatible block to replace"
export const REPLACE_INCOMPATIBLE =
  "This saved item can’t replace the selected element"

export function replaceAvailabilityFor(
  saved: SavedItemNode,
  input: {
    inspectingKey: string | null
    target: PlacedElement | undefined
    all: PlacedElement[]
  }
): ReplaceCheck {
  if (!input.inspectingKey) {
    return { ok: false, reason: REPLACE_NO_SELECTION }
  }
  if (!input.target) {
    return { ok: false, reason: REPLACE_INCOMPATIBLE }
  }
  return canReplaceTarget(saved, input.target, input.all)
}

export type SavedItemGlyphKind =
  | "columns-1"
  | "columns-2"
  | "columns-3"
  | "columns-4"
  | "text"
  | "button"
  | "image"
  | "table"
  | "section"

export function savedItemGlyphKind(root: SavedItemNode): SavedItemGlyphKind {
  if (root.kind === "columns-1") return "columns-1"
  if (root.kind === "columns-2") return "columns-2"
  if (root.kind === "columns-3") return "columns-3"
  if (root.kind === "columns-4") return "columns-4"
  if (root.kind === "button") return "button"
  if (root.kind === "image") return "image"
  if (root.kind === "table") return "table"
  if (
    root.kind === "heading" ||
    root.kind === "paragraph" ||
    root.kind === "list" ||
    root.kind === "quote"
  ) {
    return "text"
  }
  if (root.kind === "container") {
    const kids = root.children ?? []
    const textOnly =
      kids.length > 0 &&
      kids.every((child) =>
        ["heading", "paragraph", "list", "quote"].includes(child.kind)
      )
    return textOnly ? "text" : "section"
  }
  return "section"
}

export function canReplaceTarget(
  saved: SavedItemNode,
  target: PlacedElement | undefined,
  all: PlacedElement[]
): ReplaceCheck {
  if (!target) {
    return {
      ok: false,
      reason: "Select a placed block on the canvas to replace it.",
    }
  }
  if (target.bindToLineItems) {
    return { ok: false, reason: "Line items stay bound to this document." }
  }
  const kindCheck = canReplaceKinds(saved.kind, target.kind)
  if (!kindCheck.ok) {
    return kindCheck
  }
  const targetHasChildren = descendantIds(all, target.id).size > 1
  const savedHasChildren = (saved.children?.length ?? 0) > 0
  if (targetHasChildren && !isLayoutKind(saved.kind)) {
    return {
      ok: false,
      reason: "This saved item can’t replace a group.",
    }
  }
  if (savedHasChildren && !isLayoutKind(target.kind)) {
    return {
      ok: false,
      reason: "A group can’t replace a single block.",
    }
  }
  return { ok: true }
}

export function explicitStyleOverrides(
  kind: string,
  style: BuilderLayerStyle | undefined,
  tokens: ResolvedFamilyBrand
): BuilderLayerStyle | undefined {
  if (!style) {
    return undefined
  }
  const inherited = inheritPlacedAppearance(kind, tokens)
  const keepSize = kind === "image" || kind === "spacer" || kind === "divider"
  const out: BuilderLayerStyle = {}
  for (const [key, value] of Object.entries(style) as [keyof BuilderLayerStyle, unknown][]) {
    if (value === undefined) {
      continue
    }
    if ((PAGE_ONLY_STYLE_KEYS as readonly string[]).includes(key)) {
      continue
    }
    if ((key === "width" || key === "height") && !keepSize) {
      continue
    }
    if (key === "width" && kind === "divider") {
      continue
    }
    if (
      (INHERITED_STYLE_KEYS as readonly string[]).includes(key) &&
      inherited[key as keyof typeof inherited] === value
    ) {
      continue
    }
    ;(out as Record<string, unknown>)[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function textAt(
  ctx: SaveContext,
  label: string,
  fallback: string
): string {
  return ctx.layerText[label] ?? fallback
}

function layerContent(ctx: SaveContext, element: PlacedElement): string {
  return ctx.layerText[element.id] ?? ctx.layerText[element.label] ?? element.content
}

function layerOverride(
  ctx: SaveContext,
  element: PlacedElement
): BuilderLayerStyle | undefined {
  return ctx.layerStyles[element.id] ?? ctx.layerStyles[element.label]
}

function nodeFromPlaced(
  element: PlacedElement,
  ctx: SaveContext
): SavedItemNode {
  const content = layerContent(ctx, element)
  const children = ctx.placedElements
    .filter((child) => child.parentId === element.id)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((child) => nodeFromPlaced(child, ctx))
  return {
    kind: element.kind,
    labelHint: element.label,
    content,
    columns: element.columns ? [...element.columns] : undefined,
    href: element.href,
    bindToLineItems: element.bindToLineItems,
    bindField: element.bindField,
    slot: element.slot,
    style: explicitStyleOverrides(
      element.kind,
      layerOverride(ctx, element),
      ctx.brandTokens
    ),
    children: children.length > 0 ? children : undefined,
  }
}

function leafFromNative(
  ctx: SaveContext,
  label: string,
  spec: { kind: string; bindField?: string; defaultName?: string },
  fallback: string,
  extra?: Partial<SavedItemNode>
): SavedItemNode {
  return {
    kind: spec.kind,
    labelHint: spec.defaultName ?? label,
    content: textAt(ctx, label, fallback),
    bindField: spec.bindField,
    style: explicitStyleOverrides(spec.kind, ctx.layerStyles[label], ctx.brandTokens),
    ...extra,
  }
}

function nativeBilling(ctx: SaveContext): SavedItemNode {
  const layout = ctx.layout
  return {
    kind: "columns-2",
    labelHint: "Billing details",
    content: "Column content",
    children: [
      leafFromNative(ctx, "Bill to label", NATIVE_LEAF["Bill to label"]!, "Bill to", {
        slot: 0,
      }),
      leafFromNative(
        ctx,
        "Client name",
        NATIVE_LEAF["Client name"]!,
        layout?.clientName ?? "Client",
        { slot: 0 }
      ),
      leafFromNative(
        ctx,
        "Client address line 1",
        NATIVE_LEAF["Client address line 1"]!,
        "456 Client Avenue",
        { slot: 0 }
      ),
      leafFromNative(
        ctx,
        "Client address line 2",
        NATIVE_LEAF["Client address line 2"]!,
        "San Francisco, CA 94103",
        { slot: 0 }
      ),
      leafFromNative(ctx, "Issued label", NATIVE_LEAF["Issued label"]!, "Issued", {
        slot: 1,
      }),
      leafFromNative(
        ctx,
        "Issue date",
        NATIVE_LEAF["Issue date"]!,
        layout?.issueDate ?? "",
        { slot: 1 }
      ),
      leafFromNative(ctx, "Due label", NATIVE_LEAF["Due label"]!, "Due", {
        slot: 1,
      }),
      leafFromNative(
        ctx,
        "Due date",
        NATIVE_LEAF["Due date"]!,
        layout?.dueDate ?? "",
        { slot: 1 }
      ),
    ],
  }
}

function nativeNotes(ctx: SaveContext): SavedItemNode {
  const layout = ctx.layout
  const children: SavedItemNode[] = []
  if (!layout || layout.sections.notes) {
    children.push(
      leafFromNative(ctx, "Notes heading", NATIVE_LEAF["Notes heading"]!, "Notes"),
      leafFromNative(
        ctx,
        "Notes body",
        NATIVE_LEAF["Notes body"]!,
        "Thank you for your business."
      )
    )
  }
  if (!layout || layout.sections.terms) {
    children.push(
      leafFromNative(
        ctx,
        "Payment terms heading",
        NATIVE_LEAF["Payment terms heading"]!,
        "Payment terms"
      ),
      leafFromNative(
        ctx,
        "Payment terms body",
        NATIVE_LEAF["Payment terms body"]!,
        "Payment due within 14 days. Late payments may incur a 1.5% monthly fee."
      )
    )
  }
  if (!layout || layout.sections.paymentDetails) {
    children.push(
      leafFromNative(
        ctx,
        "Payment details heading",
        NATIVE_LEAF["Payment details heading"]!,
        "Payment details"
      ),
      leafFromNative(
        ctx,
        "Payment bank name",
        NATIVE_LEAF["Payment bank name"]!,
        layout?.payment.bankName ?? ""
      ),
      leafFromNative(
        ctx,
        "Payment account name",
        NATIVE_LEAF["Payment account name"]!,
        layout?.payment.accountName ?? ""
      ),
      leafFromNative(
        ctx,
        "Payment account number",
        NATIVE_LEAF["Payment account number"]!,
        layout ? `Account ${layout.payment.accountNumber}` : ""
      ),
      leafFromNative(
        ctx,
        "Payment routing number",
        NATIVE_LEAF["Payment routing number"]!,
        layout ? `Routing ${layout.payment.routingNumber}` : ""
      )
    )
  }
  return {
    kind: "container",
    labelHint: "Notes & terms",
    content: "Add content inside this container.",
    children,
  }
}

function nativePayOnline(ctx: SaveContext): SavedItemNode {
  return {
    kind: "button",
    labelHint: "Pay online button",
    content: textAt(
      ctx,
      "Pay online button",
      ctx.layout?.payment.payLabel ?? "Pay online"
    ),
    href: ctx.layout?.payment.payUrl ?? "",
    style: explicitStyleOverrides(
      "button",
      ctx.layerStyles["Pay online button"] ?? ctx.layerStyles["Pay online"],
      ctx.brandTokens
    ),
  }
}

export function defaultSavedItemName(node: SavedItemNode, selectedLabel?: string): string {
  const fromLabel = (selectedLabel ?? node.labelHint).trim()
  const known = [
    "Billing details",
    "Payment terms",
    "Bank details",
    "Pay online button",
    "Notes & terms",
    "Notes",
  ]
  if (known.some((name) => name.toLowerCase() === fromLabel.toLowerCase())) {
    return fromLabel
  }
  if (fromLabel.toLowerCase().includes("payment terms")) {
    return "Payment terms"
  }
  if (fromLabel.toLowerCase().includes("bank") || fromLabel.toLowerCase().includes("payment details")) {
    return "Bank details"
  }
  if (fromLabel.toLowerCase().includes("billing")) {
    return "Billing details"
  }
  if (fromLabel.toLowerCase().includes("pay online")) {
    return "Pay online button"
  }
  const line = node.content.trim().split("\n")[0]?.trim() ?? ""
  const placeholders = new Set([
    "",
    "Heading",
    "Add your paragraph text here.",
    "Add a quote or callout here.",
    "Button label",
    "Add content inside this container.",
    "Column content",
    "Placeholder text",
    "First list item",
  ])
  if (line && !placeholders.has(line) && line.length <= 48) {
    return line
  }
  return catalogueLabel(node.kind)
}

export function serializeSelection(ctx: SaveContext): SaveAvailability {
  const placed = findPlacedByInspectKey(ctx.placedElements, ctx.label)
  const inspectLabel = placed?.label ?? ctx.label
  if (inspectLabel.startsWith("Item ")) {
    return {
      ok: false,
      reason: "Line items stay bound to this document.",
    }
  }
  const unsavable = UNSAVABLE_NATIVE_LABELS[inspectLabel]
  if (unsavable) {
    return { ok: false, reason: unsavable }
  }

  if (placed) {
    if (placed.bindToLineItems) {
      return {
        ok: false,
        reason: "Line items stay bound to this document.",
      }
    }
    const node = nodeFromPlaced(placed, ctx)
    return { ok: true, node, defaultName: defaultSavedItemName(node, placed.label) }
  }

  if (ctx.label === "Billing details") {
    const node = nativeBilling(ctx)
    return { ok: true, node, defaultName: "Billing details" }
  }
  if (ctx.label === "Notes & terms") {
    const node = nativeNotes(ctx)
    return { ok: true, node, defaultName: "Notes & terms" }
  }
  if (ctx.label === "Pay online" || ctx.label === "Pay online button") {
    const node = nativePayOnline(ctx)
    return { ok: true, node, defaultName: "Pay online button" }
  }

  const leaf = NATIVE_LEAF[ctx.label]
  if (leaf) {
    const fallback =
      leaf.bindField && ctx.layout
        ? String(ctx.layout[leaf.bindField as keyof GeneratedLayout] ?? "")
        : ctx.label
    const node = leafFromNative(ctx, ctx.label, leaf, fallback)
    return {
      ok: true,
      node,
      defaultName: defaultSavedItemName(node, leaf.defaultName ?? ctx.label),
    }
  }

  return {
    ok: false,
    reason: "This family region isn’t a reusable structured block.",
  }
}

export function newSavedItemId(): string {
  return `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSavedDefinition(
  name: string,
  root: SavedItemNode,
  now = Date.now()
): SavedItemDefinition {
  return {
    id: newSavedItemId(),
    name: name.trim() || defaultSavedItemName(root),
    createdAt: now,
    updatedAt: now,
    root: structuredClone(root),
  }
}

export function renameSavedDefinition(
  items: SavedItemDefinition[],
  id: string,
  name: string,
  now = Date.now()
): SavedItemDefinition[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, name: name.trim() || item.name, updatedAt: now }
      : item
  )
}

export function duplicateSavedDefinition(
  items: SavedItemDefinition[],
  id: string,
  now = Date.now()
): SavedItemDefinition[] {
  const source = items.find((item) => item.id === id)
  if (!source) {
    return items
  }
  const copy: SavedItemDefinition = {
    ...structuredClone(source),
    id: newSavedItemId(),
    name: `${source.name} copy`,
    createdAt: now,
    updatedAt: now,
  }
  const index = items.findIndex((item) => item.id === id)
  const next = [...items]
  next.splice(index + 1, 0, copy)
  return next
}

export function deleteSavedDefinition(
  items: SavedItemDefinition[],
  id: string
): SavedItemDefinition[] {
  return items.filter((item) => item.id !== id)
}

function isSavedNode(value: unknown): value is SavedItemNode {
  if (!value || typeof value !== "object") {
    return false
  }
  const node = value as SavedItemNode
  return typeof node.kind === "string" && typeof node.content === "string"
}

function isSavedDefinition(value: unknown): value is SavedItemDefinition {
  if (!value || typeof value !== "object") {
    return false
  }
  const item = value as SavedItemDefinition
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    isSavedNode(item.root)
  )
}

export function parseSavedItems(raw: string | null): SavedItemDefinition[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as SavedItemsEnvelope | SavedItemDefinition[]
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && parsed.v === SAVED_ITEMS_VERSION && Array.isArray(parsed.items)
        ? parsed.items
        : null
    if (!items) {
      return []
    }
    return items.filter(isSavedDefinition).map((item) => ({
      ...item,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
      updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : 0,
      root: structuredClone(item.root),
    }))
  } catch {
    return []
  }
}

export function loadSavedItems(): SavedItemDefinition[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    return parseSavedItems(window.localStorage.getItem(SAVED_ITEMS_KEY))
  } catch {
    return []
  }
}

export function persistSavedItems(items: SavedItemDefinition[]): void {
  if (typeof window === "undefined") {
    return
  }
  const envelope: SavedItemsEnvelope = { v: SAVED_ITEMS_VERSION, items }
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(envelope))
}

export type InstantiatedSavedItem = {
  elements: PlacedElement[]
  styles: Record<string, BuilderLayerStyle>
  texts: Record<string, string>
  root: PlacedElement
}

export function instantiateSavedItem(
  node: SavedItemNode,
  input: {
    nextId: () => string
    existing: PlacedElement[]
    dest: DropDest
  }
): InstantiatedSavedItem {
  const existing = [...input.existing]
  const elements: PlacedElement[] = []
  const styles: Record<string, BuilderLayerStyle> = {}
  const texts: Record<string, string> = {}

  const usedIds = new Set(existing.map((element) => element.id))
  const allocId = () => {
    let id = input.nextId()
    while (usedIds.has(id)) {
      id = input.nextId()
    }
    usedIds.add(id)
    return id
  }

  const walk = (
    current: SavedItemNode,
    parentId: string | undefined,
    fallbackSlot: number | undefined
  ): PlacedElement => {
    const id = allocId()
    const label = current.labelHint || productKindLabel(current.kind)
    const zone: PlacedElementZone =
      input.dest.kind === "root"
        ? input.dest.zone
        : existing.find(
            (element) =>
              input.dest.kind === "child" && element.id === input.dest.parentId
          )?.zone ?? "end"
    const created: PlacedElement = {
      id,
      kind: current.kind,
      label,
      zone,
      content: current.content,
      columns: current.columns ? [...current.columns] : undefined,
      href: current.href,
      bindToLineItems: current.bindToLineItems,
      bindField: current.bindField,
      parentId,
      slot: parentId ? (current.slot ?? fallbackSlot ?? 0) : undefined,
    }
    elements.push(created)
    texts[id] = current.content
    if (current.style) {
      styles[id] = { ...current.style }
    }
    for (const child of current.children ?? []) {
      walk(child, id, child.slot ?? 0)
    }
    return created
  }

  const parentId = input.dest.kind === "child" ? input.dest.parentId : undefined
  const slot = input.dest.kind === "child" ? input.dest.slot : undefined
  const root = walk(node, parentId, slot)
  return { elements, styles, texts, root }
}

export function canDropSavedItem(
  node: SavedItemNode,
  dest: DropDest | null,
  existing: PlacedElement[]
): ReplaceCheck {
  if (!dest) {
    return { ok: false, reason: "Drop this item on the document." }
  }
  if (dest.kind === "child") {
    const parent = existing.find((element) => element.id === dest.parentId)
    if (!parent) {
      return { ok: false, reason: "That container is no longer on the document." }
    }
    if (!canNestInside(node.kind, parent.kind) || isLayoutKind(node.kind)) {
      return {
        ok: false,
        reason: "Containers and columns only accept one level of content",
      }
    }
  }
  return { ok: true }
}

export function insertInstantiated(
  existing: PlacedElement[],
  instantiated: InstantiatedSavedItem,
  dest: DropDest
): PlacedElement[] {
  const rest = instantiated.elements.filter(
    (element) => element.id !== instantiated.root.id
  )
  let next =
    dest.kind === "child"
      ? insertChildAt(existing, instantiated.root, dest)
      : insertRootAt(existing, instantiated.root, dest)
  if (!next.some((element) => element.id === instantiated.root.id)) {
    return existing
  }
  const index = next.findIndex((element) => element.id === instantiated.root.id)
  const copy = [...next]
  copy.splice(index + 1, 0, ...rest)
  return copy
}

export type DocumentSlice = {
  placedElements: PlacedElement[]
  layerStyles: Record<string, BuilderLayerStyle>
  layerText: Record<string, string>
}

export function insertSavedIntoDocument(
  doc: DocumentSlice,
  node: SavedItemNode,
  dest: DropDest,
  nextId: () => string
): { ok: true; doc: DocumentSlice; root: PlacedElement } | { ok: false; reason: string } {
  const drop = canDropSavedItem(node, dest, doc.placedElements)
  if (!drop.ok) {
    return drop
  }
  const instantiated = instantiateSavedItem(node, {
    nextId,
    existing: doc.placedElements,
    dest,
  })
  return {
    ok: true,
    root: instantiated.root,
    doc: {
      placedElements: insertInstantiated(doc.placedElements, instantiated, dest),
      layerStyles: { ...doc.layerStyles, ...instantiated.styles },
      layerText: { ...doc.layerText, ...instantiated.texts },
    },
  }
}

export function replaceSelectedWithSaved(
  doc: DocumentSlice,
  node: SavedItemNode,
  targetId: string,
  nextId: () => string
): { ok: true; doc: DocumentSlice; root: PlacedElement } | { ok: false; reason: string } {
  const target = doc.placedElements.find((element) => element.id === targetId)
  const check = canReplaceTarget(node, target, doc.placedElements)
  if (!check.ok || !target) {
    return check.ok ? { ok: false, reason: "Nothing selected." } : check
  }
  const dest: DropDest = target.parentId
    ? {
        kind: "child",
        parentId: target.parentId,
        parentKind:
          doc.placedElements.find((element) => element.id === target.parentId)
            ?.kind ?? "container",
        slot: target.slot ?? 0,
        index: childrenOf(
          doc.placedElements,
          target.parentId,
          target.slot ?? 0
        ).findIndex((element) => element.id === target.id),
      }
    : {
        kind: "root",
        zone: target.zone,
        index: doc.placedElements
          .filter((element) => !element.parentId && element.zone === target.zone)
          .findIndex((element) => element.id === target.id),
      }

  const removedIds = descendantIds(doc.placedElements, target.id)
  const without = removePlacedTree(doc.placedElements, target.id)
  const strippedStyles = Object.fromEntries(
    Object.entries(doc.layerStyles).filter(([key]) => {
      const owner = doc.placedElements.find(
        (element) => element.id === key || element.label === key
      )
      return !owner || !removedIds.has(owner.id)
    })
  )
  const strippedText = Object.fromEntries(
    Object.entries(doc.layerText).filter(([key]) => {
      const owner = doc.placedElements.find(
        (element) => element.id === key || element.label === key
      )
      return !owner || !removedIds.has(owner.id)
    })
  )
  const instantiated = instantiateSavedItem(node, {
    nextId,
    existing: doc.placedElements,
    dest,
  })
  if (dest.kind === "child" && !canNestInside(node.kind, dest.parentKind)) {
    return { ok: false, reason: "Containers and columns only accept one level of content" }
  }
  return {
    ok: true,
    root: instantiated.root,
    doc: {
      placedElements: insertInstantiated(without, instantiated, dest),
      layerStyles: { ...strippedStyles, ...instantiated.styles },
      layerText: { ...strippedText, ...instantiated.texts },
    },
  }
}

export function duplicatePlacedDocument(
  doc: DocumentSlice,
  sourceId: string,
  nextId: () => string
): { ok: true; doc: DocumentSlice; root: PlacedElement } | { ok: false; reason: string } {
  const source = doc.placedElements.find((element) => element.id === sourceId)
  if (!source) {
    return { ok: false, reason: "Nothing selected." }
  }
  if (source.bindToLineItems) {
    return { ok: false, reason: "Line items can only appear once on this invoice." }
  }
  const duplicated = duplicatePlacedSubtree(doc.placedElements, sourceId, nextId)
  if (!duplicated) {
    return { ok: false, reason: "That block can’t be duplicated." }
  }
  const ids = descendantIds(doc.placedElements, sourceId)
  const ordered = doc.placedElements.filter((element) => ids.has(element.id))
  const styles = { ...doc.layerStyles }
  const texts = { ...doc.layerText }
  ordered.forEach((original, index) => {
    const copy = duplicated.copies[index]
    if (!copy) {
      return
    }
    const style = doc.layerStyles[original.id] ?? doc.layerStyles[original.label]
    const text =
      doc.layerText[original.id] ?? doc.layerText[original.label] ?? original.content
    if (style) {
      styles[copy.id] = { ...style }
    }
    texts[copy.id] = text
  })
  return {
    ok: true,
    root: duplicated.root,
    doc: {
      placedElements: duplicated.elements,
      layerStyles: styles,
      layerText: texts,
    },
  }
}

export function idsFromTree(elements: PlacedElement[]): string[] {
  return elements.map((element) => element.id)
}
