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
