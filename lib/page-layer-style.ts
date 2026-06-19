import type { BuilderLayerStyle } from "@/lib/layout-builder-types"

function parsePx(value: string): number | undefined {
  const parsed = Math.round(parseFloat(value))
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : undefined
}

/** Reads box-model values from a live page shell for the inspector baseline. */
export function pageStyleFromComputed(node: HTMLElement): BuilderLayerStyle {
  const cs = window.getComputedStyle(node)
  const radius = parsePx(cs.borderTopLeftRadius)
  return {
    backgroundColor:
      cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? cs.backgroundColor
        : undefined,
    marginTop: parsePx(cs.marginTop),
    marginRight: parsePx(cs.marginRight),
    marginBottom: parsePx(cs.marginBottom),
    marginLeft: parsePx(cs.marginLeft),
    paddingTop: parsePx(cs.paddingTop),
    paddingRight: parsePx(cs.paddingRight),
    paddingBottom: parsePx(cs.paddingBottom),
    paddingLeft: parsePx(cs.paddingLeft),
    width: parsePx(cs.width),
    height: parsePx(cs.height),
    radiusTopLeft: radius,
    radiusTopRight: radius,
    radiusBottomRight: radius,
    radiusBottomLeft: radius,
  }
}
