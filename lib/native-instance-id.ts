/**
 * Native element identity — three independent concepts:
 *
 * 1. DISPLAY LABEL  — human-facing inspector/canvas name ("Due date").
 * 2. AUTHORED KEY   — stable semantic slot in the family definition ("due-date").
 * 3. INSTANCE ID    — this exact editable occurrence ("n/billing-details/due-date").
 *
 * Instance IDs are deterministic: derived from the authored tree path of
 * machine slots + copy-instance identity + same-parent occurrence. They are
 * never taken from visible copy, never minted during React render with
 * random/useId, and they survive undo/redo, Preview, and reload without a
 * separate ID table.
 *
 * Compatibility: older sessions may still key overrides by
 *   gen-1  "Due date"
 *   gen-2  "Billing details/Due date"
 * New writes use gen-3 instance IDs only. Legacy keys are read aliases.
 */

export const NATIVE_ID_PREFIX = "n/"
const COPY_SEPARATOR = "#copy-"
const OCCURRENCE_SEPARATOR = "@"

/**
 * Frozen display-label → authored-slot catalog for current family nodes.
 * This is the default when a `<T>`/`<S>` does not pass an explicit `slot`.
 * It must not be used as a live slug of whatever the display label is today:
 * a later display rename keeps the catalog entry (or an explicit `slot`).
 */
const DISPLAY_TO_SLOT: Record<string, string> = {
  Page: "page",
  Header: "header",
  "Billing details": "billing-details",
  "Line items": "line-items",
  Notes: "notes",
  Totals: "totals",
  "Payment extras": "payment-extras",
  "Payment details": "payment-details",
  "Business name": "business-name",
  "Document type": "document-type",
  "Document number": "document-number",
  "Bill to label": "bill-to-label",
  "Client name": "client-name",
  "Client address line 1": "client-address-1",
  "Client address line 2": "client-address-2",
  "Issued label": "issued-label",
  "Issue date": "issue-date",
  "Due label": "due-label",
  "Due date": "due-date",
  "Currency code": "currency-code",
  "Services heading": "services-heading",
  "Notes body": "notes-body",
  "Payment terms body": "payment-terms-body",
  "Amount due label": "amount-due-label",
  "Amount due": "amount-due",
  "Prepared for": "prepared-for",
  "Identity heading": "identity-heading",
  "Client name caption": "client-name-caption",
  "Issue date caption": "issue-date-caption",
  "Due date caption": "due-date-caption",
  "Currency code caption": "currency-code-caption",
  "Items heading": "items-heading",
  "Description column": "description-column",
  "Qty column": "qty-column",
  "Rate column": "rate-column",
  "Sum column": "sum-column",
  "Pay online button": "pay-online-button",
  "Online payment link": "online-payment-link",
  "Payment details heading": "payment-details-heading",
  "Payment bank name": "payment-bank-name",
  "Payment account name": "payment-account-name",
  "Payment account number": "payment-account-number",
  "Payment routing number": "payment-routing-number",
  "Discount label": "discount-label",
  "Discount amount": "discount-amount",
  "Table header": "table-header",
  "Items table": "items-table",
  "Business header": "business-header",
  "Customer information": "customer-information",
  "Pay online": "pay-online",
  "Business address": "business-address",
}

const SLOT_TO_DISPLAY: Record<string, string> = Object.fromEntries(
  Object.entries(DISPLAY_TO_SLOT).map(([display, slot]) => [slot, display])
)

const CONTAINER_SLOTS = new Set([
  "header",
  "billing-details",
  "line-items",
  "notes",
  "totals",
  "payment-extras",
  "payment-details",
  "table-header",
  "items-table",
  "business-header",
  "customer-information",
])

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function itemSlotFromDisplay(label: string): string | null {
  const item = label.match(/^Item (\d+) (description|qty|rate|amount)$/)
  if (!item) {
    return null
  }
  return `item-${item[1]}-${item[2]}`
}

function itemDisplayFromSlot(slot: string): string | null {
  const item = slot.match(/^item-(\d+)-(description|qty|rate|amount)$/)
  if (!item) {
    return null
  }
  return `Item ${item[1]} ${item[2]}`
}

/** Machine authored key for a family node. Explicit `slot` wins. */
export function slotFromDisplayLabel(label: string): string {
  const item = itemSlotFromDisplay(label)
  if (item) {
    return item
  }
  return DISPLAY_TO_SLOT[label] ?? slugify(label)
}

/** Default human title for a machine slot (not a live rename source). */
export function displayLabelForSlot(slot: string): string {
  const item = itemDisplayFromSlot(slot)
  if (item) {
    return item
  }
  return SLOT_TO_DISPLAY[slot] ?? slot
}

export function isNativeInstanceId(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(NATIVE_ID_PREFIX))
}

export function isContainerAuthoredKey(authoredKey: string): boolean {
  return CONTAINER_SLOTS.has(stripOccurrence(stripCopySuffix(authoredKey)))
}

function stripCopySuffix(segment: string): string {
  const match = segment.match(/^(.*)#copy-\d+$/)
  return match ? match[1] : segment
}

function stripOccurrence(segment: string): string {
  const match = segment.match(/^(.*)@\d+$/)
  return match ? match[1] : segment
}

function leafSegment(instanceId: string): string {
  const body = isNativeInstanceId(instanceId)
    ? instanceId.slice(NATIVE_ID_PREFIX.length)
    : instanceId
  const slash = body.lastIndexOf("/")
  return slash === -1 ? body : body.slice(slash + 1)
}

/**
 * Build a native instance ID from ancestor machine slots and this node's slot.
 *
 * @param occurrence 1-based same-parent same-slot index. 1 omits `@n`.
 */
export function nativeInstanceId(
  sectionPath: readonly string[],
  slot: string,
  occurrence = 1
): string {
  const leaf = occurrence > 1 ? `${slot}${OCCURRENCE_SEPARATOR}${occurrence}` : slot
  const body =
    sectionPath.length === 0 ? leaf : `${sectionPath.join("/")}/${leaf}`
  return `${NATIVE_ID_PREFIX}${body}`
}

export function nativeSectionInstanceId(
  parentPath: readonly string[],
  sectionSlot: string,
  occurrence = 1
): string {
  return nativeInstanceId(parentPath, sectionSlot, occurrence)
}

export function withCopySuffix(instanceId: string, copyIndex: number): string {
  return `${instanceId}${COPY_SEPARATOR}${copyIndex}`
}

export function copyIndexFromId(instanceId: string): number {
  const match = instanceId.match(/#copy-(\d+)$/)
  return match ? Number(match[1]) : 0
}

export function baseInstanceId(instanceId: string): string {
  const match = instanceId.match(/^(.*)#copy-\d+$/)
  return match ? match[1] : instanceId
}

/**
 * Authored semantic key for a node. Machine slot, independent of display copy.
 * Accepts gen-3 IDs, gen-2 path IDs, and gen-1 labels.
 */
export function authoredKeyFromId(instanceId: string): string {
  const leaf = stripOccurrence(stripCopySuffix(leafSegment(instanceId)))
  if (DISPLAY_TO_SLOT[leaf]) {
    return DISPLAY_TO_SLOT[leaf]
  }
  const item = itemSlotFromDisplay(leaf)
  if (item) {
    return item
  }
  if (leaf.includes(" ")) {
    return slugify(leaf)
  }
  return leaf
}

/**
 * Key used by family-authored style/content tables (historical display slots).
 */
export function authoredLookupKey(authoredKeyOrId: string): string {
  const slot = authoredKeyFromId(authoredKeyOrId)
  return displayLabelForSlot(slot)
}

/** Gen-2 path identity used by the previous pass ("Billing details/Due date"). */
export function legacyPathInstanceId(
  sectionDisplays: readonly string[],
  fieldDisplay: string
): string {
  if (sectionDisplays.length === 0) {
    return fieldDisplay
  }
  return `${sectionDisplays.join("/")}/${fieldDisplay}`
}

function gen2AliasFromNativeId(instanceId: string): string | null {
  if (!isNativeInstanceId(instanceId)) {
    return null
  }
  const body = instanceId.slice(NATIVE_ID_PREFIX.length)
  const segments = body.split("/")
  const displayed = segments.map((segment) => {
    const copyMatch = segment.match(/^(.*)#copy-(\d+)$/)
    const raw = copyMatch ? copyMatch[1] : segment
    const occMatch = raw.match(/^(.*)@(\d+)$/)
    if (occMatch && Number(occMatch[2]) > 1) {
      return null
    }
    const slot = occMatch ? occMatch[1] : raw
    const display = displayLabelForSlot(slot)
    return copyMatch ? `${display}${COPY_SEPARATOR}${copyMatch[2]}` : display
  })
  if (displayed.some((part) => part == null)) {
    return null
  }
  return displayed.join("/")
}

/**
 * Read-only lookup keys, most specific first.
 * Occurrence > 1 has no gen-1/gen-2 alias (those eras collided).
 */
export function compatibilityKeys(instanceId: string): string[] {
  const keys = [instanceId]
  if (!isNativeInstanceId(instanceId)) {
    const authored = authoredKeyFromId(instanceId)
    const display = displayLabelForSlot(authored)
    if (!keys.includes(display)) {
      keys.push(display)
    }
    return keys
  }
  const gen2 = gen2AliasFromNativeId(instanceId)
  if (gen2 && !keys.includes(gen2)) {
    keys.push(gen2)
  }
  const occ = leafSegment(instanceId).match(/@(\d+)$/)
  if (occ && Number(occ[1]) > 1) {
    return keys
  }
  const display = displayLabelForSlot(authoredKeyFromId(instanceId))
  if (display && !keys.includes(display)) {
    keys.push(display)
  }
  return keys
}

export function readLayerStore<T>(
  store: Record<string, T>,
  instanceId: string
): T | undefined {
  for (const key of compatibilityKeys(instanceId)) {
    if (Object.prototype.hasOwnProperty.call(store, key)) {
      return store[key]
    }
  }
  return undefined
}

export function isHiddenLayer(
  hiddenLayers: readonly string[],
  instanceId: string
): boolean {
  const keys = new Set(compatibilityKeys(instanceId))
  return hiddenLayers.some((hidden) => keys.has(hidden))
}

export function legacyLabelOverride<T>(
  instanceId: string,
  labelKeyedStore: Record<string, T>
): T | undefined {
  return readLayerStore(labelKeyedStore, instanceId)
}

export function makeOccurrenceCounter(): (slot: string) => number {
  const counts: Record<string, number> = {}
  return (slot: string) => {
    counts[slot] = (counts[slot] ?? 0) + 1
    return counts[slot]
  }
}
