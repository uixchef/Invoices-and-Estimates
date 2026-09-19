import type { BuilderVisualStyle } from "@/lib/layout-builder-types"

export { PORTFOLIO_HERO_PROMPT } from "@/lib/layout-family"
export {
  resolveInitialVisualStyle,
} from "@/lib/layout-family"

export const PORTFOLIO_WALKTHROUGH_PROMPT =
  "Create a clean invoice layout with my logo, itemized services, taxes, discounts, and payment terms"

/** @deprecated Use LayoutFamilyId via lib/layout-family. Kept for older imports. */
export type { BuilderVisualStyle }
