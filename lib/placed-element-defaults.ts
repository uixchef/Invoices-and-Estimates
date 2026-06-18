import type { BuilderLayerKind, BuilderLayerStyle } from "@/lib/layout-builder-types"

/** Default copy shown when an element is first dropped onto the canvas. */
export function getDefaultPlacedContent(kind: string): string {
  const defaults: Record<string, string> = {
    heading: "Heading",
    paragraph: "Add your paragraph text here.",
    list: "First list item\nSecond list item\nThird list item",
    quote: "Add a quote or callout here.",
    button: "Button label",
    container: "Add content inside this container.",
    image: "",
    table: "",
    spacer: "",
    divider: "",
  }

  if (kind.startsWith("columns-")) {
    return "Column content"
  }

  return defaults[kind] ?? "Placeholder text"
}

export function isMultilinePlacedKind(kind: string): boolean {
  return (
    kind === "paragraph" ||
    kind === "list" ||
    kind === "quote" ||
    kind === "container" ||
    kind.startsWith("columns-")
  )
}

/**
 * Whether a placed element is an individual text layer (editable copy) vs a
 * structural / container block. Drives text-only inspector controls like the
 * Style tab's "Content" field. Structural kinds — divider, spacer, image,
 * table, and the generic "container" wrapper — return false.
 */
export function isTextPlacedKind(kind: string): boolean {
  if (kind.startsWith("columns-")) {
    return true
  }
  return (
    kind === "heading" ||
    kind === "paragraph" ||
    kind === "list" ||
    kind === "quote" ||
    kind === "button"
  )
}

/** Non-text blocks with no typography — divider, spacer, etc. */
export function isStructuralPlacedKind(kind: string): boolean {
  return kind === "divider" || kind === "spacer"
}

export function getPlacedElementLayerKind(kind: string): BuilderLayerKind {
  if (kind === "image") {
    return "image"
  }
  if (isStructuralPlacedKind(kind)) {
    return "structural"
  }
  if (isTextPlacedKind(kind)) {
    return "text"
  }
  return "container"
}

/** Initial inspector seed when a palette element is first dropped. */
export function getPlacedElementSeed(
  kind: string,
  content: string
): { content: string; style: BuilderLayerStyle } {
  if (kind === "image") {
    return {
      content: "",
      style: {
        imageAlign: "full",
        imageSizeMode: "custom",
        width: 80,
        height: 80,
      },
    }
  }
  if (kind === "spacer") {
    return { content, style: { height: 24 } }
  }
  if (kind === "divider") {
    return { content, style: { height: 1 } }
  }
  return { content, style: {} }
}
