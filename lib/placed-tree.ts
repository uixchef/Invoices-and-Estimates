import type { PlacedElement, PlacedElementZone } from "@/lib/layout-builder-types"

export type RootDropDest = {
  kind: "root"
  zone: PlacedElementZone
  index: number
}

export type ChildDropDest = {
  kind: "child"
  parentId: string
  parentKind: string
  slot: number
  index: number
}

export type DropDest = RootDropDest | ChildDropDest

export function destKey(dest: DropDest): string {
  if (dest.kind === "root") {
    return `root:${dest.zone}:${dest.index}`
  }
  return `child:${dest.parentId}:${dest.slot}:${dest.index}`
}

export function isLayoutKind(kind: string): boolean {
  return kind === "container" || kind.startsWith("columns-")
}

export function canNestInside(childKind: string, parentKind: string): boolean {
  if (!isLayoutKind(parentKind)) {
    return false
  }
  if (isLayoutKind(childKind) || childKind === "table") {
    return false
  }
  return true
}

export function rootsOf(elements: PlacedElement[]): PlacedElement[] {
  return elements.filter((element) => !element.parentId)
}

export function childrenOf(
  elements: PlacedElement[],
  parentId: string,
  slot = 0
): PlacedElement[] {
  return elements.filter(
    (element) => element.parentId === parentId && (element.slot ?? 0) === slot
  )
}

export function descendantIds(
  elements: PlacedElement[],
  id: string
): Set<string> {
  const ids = new Set<string>()
  const walk = (target: string) => {
    ids.add(target)
    for (const element of elements) {
      if (element.parentId === target) {
        walk(element.id)
      }
    }
  }
  walk(id)
  return ids
}

export function removePlacedTree(
  elements: PlacedElement[],
  id: string
): PlacedElement[] {
  const ids = descendantIds(elements, id)
  return elements.filter((element) => !ids.has(element.id))
}

export function duplicatePlacedSubtree(
  elements: PlacedElement[],
  sourceId: string,
  nextId: () => string
): { elements: PlacedElement[]; copies: PlacedElement[]; root: PlacedElement } | null {
  const source = elements.find((element) => element.id === sourceId)
  if (!source || source.bindToLineItems) {
    return null
  }
  const ids = descendantIds(elements, sourceId)
  const ordered = elements.filter((element) => ids.has(element.id))
  const mapping = new Map<string, string>()
  for (const element of ordered) {
    mapping.set(element.id, nextId())
  }
  const copies: PlacedElement[] = ordered.map((element) => ({
    ...element,
    id: mapping.get(element.id)!,
    label: element.label,
    columns: element.columns ? [...element.columns] : undefined,
    parentId:
      element.parentId && mapping.has(element.parentId)
        ? mapping.get(element.parentId)
        : element.parentId,
  }))
  const lastIndex = elements.reduce(
    (last, element, index) => (ids.has(element.id) ? index : last),
    -1
  )
  const next = [...elements]
  next.splice(lastIndex + 1, 0, ...copies)
  return { elements: next, copies, root: copies[0]! }
}

export function insertRootAt(
  elements: PlacedElement[],
  created: PlacedElement,
  dest: RootDropDest
): PlacedElement[] {
  const moved: PlacedElement = {
    ...created,
    parentId: undefined,
    slot: undefined,
    zone: dest.zone,
  }
  const roots = rootsOf(elements)
  const zoneRoots = roots.filter((element) => element.zone === dest.zone)
  const clamped = Math.max(0, Math.min(dest.index, zoneRoots.length))
  if (zoneRoots.length === 0) {
    const later = elements.findIndex((element) => {
      if (element.parentId) {
        return false
      }
      const order: PlacedElementZone[] = [
        "after-billing",
        "after-items",
        "after-totals",
        "after-notes",
        "end",
      ]
      return order.indexOf(element.zone) > order.indexOf(dest.zone)
    })
    const copy = [...elements]
    copy.splice(later === -1 ? copy.length : later, 0, moved)
    return copy
  }
  const anchor =
    clamped >= zoneRoots.length
      ? zoneRoots[zoneRoots.length - 1]
      : zoneRoots[clamped]
  const global = elements.findIndex((element) => element.id === anchor.id)
  const copy = [...elements]
  copy.splice(clamped >= zoneRoots.length ? global + 1 : global, 0, moved)
  return copy
}

export function insertChildAt(
  elements: PlacedElement[],
  created: PlacedElement,
  dest: ChildDropDest
): PlacedElement[] {
  const parent = elements.find((element) => element.id === dest.parentId)
  if (!parent || !canNestInside(created.kind, parent.kind)) {
    return elements
  }
  const moved: PlacedElement = {
    ...created,
    parentId: dest.parentId,
    slot: dest.slot,
    zone: parent.zone,
  }
  const siblings = childrenOf(elements, dest.parentId, dest.slot)
  const clamped = Math.max(0, Math.min(dest.index, siblings.length))
  const copy = [...elements]
  if (siblings.length === 0 || clamped >= siblings.length) {
    const parentIndex = copy.findIndex((element) => element.id === dest.parentId)
    const last = siblings[siblings.length - 1]
    const at = last
      ? copy.findIndex((element) => element.id === last.id) + 1
      : parentIndex + 1
    copy.splice(at, 0, moved)
    return copy
  }
  const at = copy.findIndex((element) => element.id === siblings[clamped].id)
  copy.splice(at, 0, moved)
  return copy
}

function adjustedDest(
  elements: PlacedElement[],
  source: PlacedElement,
  dest: DropDest
): DropDest {
  if (dest.kind === "root" && !source.parentId && source.zone === dest.zone) {
    const from = rootsOf(elements)
      .filter((element) => element.zone === dest.zone)
      .findIndex((element) => element.id === source.id)
    if (from !== -1 && dest.index > from) {
      return { ...dest, index: dest.index - 1 }
    }
  }
  if (
    dest.kind === "child" &&
    source.parentId === dest.parentId &&
    (source.slot ?? 0) === dest.slot
  ) {
    const from = childrenOf(elements, dest.parentId, dest.slot).findIndex(
      (element) => element.id === source.id
    )
    if (from !== -1 && dest.index > from) {
      return { ...dest, index: dest.index - 1 }
    }
  }
  return dest
}

export function relocatePlacedElement(
  elements: PlacedElement[],
  id: string,
  dest: DropDest
): PlacedElement[] {
  const source = elements.find((element) => element.id === id)
  if (!source) {
    return elements
  }
  if (dest.kind === "child" && descendantIds(elements, id).has(dest.parentId)) {
    return elements
  }
  const nextDest = adjustedDest(elements, source, dest)
  const without = elements.filter((element) => element.id !== id)
  const relocated =
    nextDest.kind === "root"
      ? insertRootAt(without, source, nextDest)
      : insertChildAt(without, source, nextDest)
  const parent = relocated.find((element) => element.id === id)
  if (!parent) {
    return relocated
  }
  return relocated.map((element) =>
    element.parentId === id ? { ...element, zone: parent.zone } : element
  )
}

export type SlotBox = {
  key: string
  dest: DropDest
  rect: { top: number; bottom: number; left: number; right: number }
}

export function pickDropSlot(
  x: number,
  y: number,
  slots: SlotBox[],
  paper: { top: number; bottom: number; left: number; right: number } | null
): SlotBox | null {
  if (!paper || slots.length === 0) {
    return null
  }
  const overPaper =
    x >= paper.left - 32 &&
    x <= paper.right + 32 &&
    y >= paper.top - 48 &&
    y <= paper.bottom + 48
  if (!overPaper) {
    return null
  }
  let best: SlotBox | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const slot of slots) {
    const midY = (slot.rect.top + slot.rect.bottom) / 2
    const inX = x >= slot.rect.left - 48 && x <= slot.rect.right + 48
    const vertical = Math.abs(y - midY)
    const score = vertical - (inX ? 24 : 0)
    if (score < bestScore) {
      bestScore = score
      best = slot
    }
  }
  return best
}

export function isNoOpMove(element: PlacedElement, dest: DropDest): boolean {
  if (dest.kind === "root") {
    return !element.parentId && element.zone === dest.zone
  }
  return (
    element.parentId === dest.parentId && (element.slot ?? 0) === dest.slot
  )
}
