export type LeftPanelMode =
  | "closed"
  | "ai"
  | "add-elements"
  | "saved-items"
  | "brand-boards"
  | "version-history"

export type LeftPanelFlags = {
  panelOpen: boolean
  addingElement: boolean
  browsingSavedItems: boolean
  browsingBrand: boolean
  browsingVersionHistory: boolean
}

export type LeftPanelAction =
  | { type: "open"; tool: Exclude<LeftPanelMode, "closed"> }
  | { type: "toggle"; tool: Exclude<LeftPanelMode, "closed"> }
  | { type: "close-tool"; tool: Exclude<LeftPanelMode, "closed"> }

const AI: LeftPanelFlags = {
  panelOpen: true,
  addingElement: false,
  browsingSavedItems: false,
  browsingBrand: false,
  browsingVersionHistory: false,
}

const CLOSED: LeftPanelFlags = {
  panelOpen: false,
  addingElement: false,
  browsingSavedItems: false,
  browsingBrand: false,
  browsingVersionHistory: false,
}

export function leftPanelMode(flags: LeftPanelFlags): LeftPanelMode {
  if (!flags.panelOpen) {
    return "closed"
  }
  if (flags.addingElement) {
    return "add-elements"
  }
  if (flags.browsingSavedItems) {
    return "saved-items"
  }
  if (flags.browsingBrand) {
    return "brand-boards"
  }
  if (flags.browsingVersionHistory) {
    return "version-history"
  }
  return "ai"
}

function flagsForTool(tool: Exclude<LeftPanelMode, "closed">): LeftPanelFlags {
  if (tool === "add-elements") {
    return { ...AI, addingElement: true }
  }
  if (tool === "saved-items") {
    return { ...AI, browsingSavedItems: true }
  }
  if (tool === "brand-boards") {
    return { ...AI, browsingBrand: true }
  }
  if (tool === "version-history") {
    return { ...AI, browsingVersionHistory: true }
  }
  return { ...AI }
}

/**
 * Tools that close back to Invoice AI (panel stays open) rather than
 * dismissing the left rail.
 */
function returnsToAi(tool: Exclude<LeftPanelMode, "closed">): boolean {
  return (
    tool === "add-elements" ||
    tool === "brand-boards" ||
    tool === "version-history"
  )
}

/**
 * Single left-rail occupancy. Tools replace each other; they never stack.
 *
 * Close semantics:
 * - Add elements / Brand boards / Version history return to Invoice AI
 * - Saved items close dismisses the left panel
 * - Invoice AI close dismisses the left panel
 */
export function applyLeftPanelAction(
  current: LeftPanelFlags,
  action: LeftPanelAction
): LeftPanelFlags {
  const mode = leftPanelMode(current)
  if (action.type === "open") {
    return flagsForTool(action.tool)
  }
  if (action.type === "toggle") {
    if (mode === action.tool) {
      if (returnsToAi(action.tool)) {
        return { ...AI }
      }
      return { ...CLOSED }
    }
    return flagsForTool(action.tool)
  }
  if (mode !== action.tool) {
    return current
  }
  if (returnsToAi(action.tool)) {
    return { ...AI }
  }
  return { ...CLOSED }
}

export function blankCanvasDropCopy(mode: LeftPanelMode): {
  title: string
  body: string
} {
  if (mode === "saved-items") {
    return {
      title: "Drop a saved item here to start building",
      body: "Drag a reusable section from Saved items onto the page.",
    }
  }
  return {
    title: "Drop elements here to start building",
    body: "Drag any element from the Add elements panel onto the page",
  }
}

/** Title → search field chrome. Shared by Add elements and Saved items. */
export const LEFT_PANEL_SEARCH_WRAP = "shrink-0 px-4 pt-3 pb-4"

/** Opening these tools must not clear canvas inspect/selection. */
export const LEFT_PANEL_PRESERVES_SELECTION: Record<
  Exclude<LeftPanelMode, "closed">,
  boolean
> = {
  ai: true,
  "add-elements": true,
  "saved-items": true,
  "brand-boards": true,
  "version-history": true,
}
