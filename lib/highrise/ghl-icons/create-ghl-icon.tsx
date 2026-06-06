import { forwardRef, type SVGProps } from "react"
import type { LucideIcon } from "lucide-react"

import type { GhlIcon } from "./types"

export function createGhlIconFromLucide(
  Lucide: LucideIcon,
  displayName: string
): GhlIcon {
  const Icon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
    function GhlOutlineIcon(props, ref) {
      return (
        <Lucide
          ref={ref}
          strokeWidth={props.strokeWidth ?? 1.5}
          {...props}
        />
      )
    }
  )
  Icon.displayName = displayName
  return Icon
}
