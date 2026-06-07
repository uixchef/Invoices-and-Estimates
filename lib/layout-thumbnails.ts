/** Figma Invoice Template (3175:161256) — BranditX gray-blue layout */
export const BRANDITX_TEMPLATE_THUMBNAIL =
  "/layouts/thumbnails/template-branditx.svg"

/** Figma Invoice Template (3175:165826) — BranditX boxed billed-to + meta grid */
export const BRANDITX_GRID_TEMPLATE_THUMBNAIL =
  "/layouts/thumbnails/template-invoice-grid.svg"

const LAYOUT_THUMBNAILS = [
  "/layouts/thumbnails/template-01.svg",
  BRANDITX_TEMPLATE_THUMBNAIL,
  BRANDITX_GRID_TEMPLATE_THUMBNAIL,
  "/layouts/thumbnails/template-04.svg",
  "/layouts/thumbnails/template-05.svg",
  "/layouts/thumbnails/template-06.svg",
  "/layouts/thumbnails/template-07.svg",
  "/layouts/thumbnails/template-08.svg",
] as const

export function getLayoutThumbnail(layoutId: string): string {
  const match = layoutId.match(/layout-(\d+)/)
  const index = match ? Number.parseInt(match[1], 10) - 1 : 0

  if (index === 1) {
    return BRANDITX_TEMPLATE_THUMBNAIL
  }

  if (index === 2) {
    return BRANDITX_GRID_TEMPLATE_THUMBNAIL
  }

  return LAYOUT_THUMBNAILS[Math.abs(index) % LAYOUT_THUMBNAILS.length]
}
