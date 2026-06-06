const LAYOUT_THUMBNAILS = [
  "/layouts/thumbnails/template-01.svg",
  "/layouts/thumbnails/template-02.svg",
  "/layouts/thumbnails/template-03.svg",
  "/layouts/thumbnails/template-04.svg",
  "/layouts/thumbnails/template-05.svg",
  "/layouts/thumbnails/template-06.svg",
  "/layouts/thumbnails/template-07.svg",
  "/layouts/thumbnails/template-08.svg",
] as const

export function getLayoutThumbnail(layoutId: string): string {
  const match = layoutId.match(/layout-(\d+)/)
  const index = match ? Number.parseInt(match[1], 10) - 1 : 0
  return LAYOUT_THUMBNAILS[Math.abs(index) % LAYOUT_THUMBNAILS.length]
}
