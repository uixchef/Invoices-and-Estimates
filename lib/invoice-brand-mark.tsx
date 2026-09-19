import type { LayoutFamilyId } from "@/lib/layout-family"
import type { GeneratedLayout } from "@/lib/layout-builder-types"
import { cn } from "@/lib/utils"

export function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "B"
}

export function displayName(name: string): string {
  return name.split(",")[0]?.trim() || name
}

export function InvoiceBrandMark({
  layout,
  family,
  size = "md",
  onDark = false,
  className,
}: {
  layout: GeneratedLayout
  family: LayoutFamilyId
  size?: "sm" | "md" | "lg" | "hero"
  onDark?: boolean
  className?: string
}) {
  if (!layout.sections.logo) {
    return null
  }

  const initials = initialsFor(layout.businessName)
  const dim =
    size === "hero"
      ? "size-[72px] text-[22px]"
      : size === "lg"
        ? "size-14 text-[15px]"
        : size === "sm"
          ? "size-7 text-[9px]"
          : "size-10 text-[12px]"

  if (family === "studio") {
    const box =
      size === "hero"
        ? "size-12"
        : size === "lg"
          ? "size-10"
          : size === "sm"
            ? "size-[22px]"
            : "size-8"
    return (
      <div className={cn("relative shrink-0", box, className)} aria-hidden>
        <span
          className="absolute inset-0"
          style={{ backgroundColor: layout.accent }}
        />
        <span
          className="absolute inset-0 translate-x-[5px] translate-y-[5px] border-[1.5px] bg-transparent"
          style={{ borderColor: layout.accent }}
        />
      </div>
    )
  }

  if (family === "editorial") {
    return (
      <span
        className={cn(
          "font-[family-name:var(--font-newsreader)] text-[11px] italic tracking-[0.28em]",
          onDark ? "text-white/80" : "text-[#7a2832]",
          className
        )}
        aria-hidden
      >
        {initials.split("").join(" · ")}
      </span>
    )
  }

  if (family === "swiss") {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#0a0a0a] font-[family-name:var(--font-geist-mono)] font-medium uppercase tracking-tighter text-white",
          dim,
          className
        )}
        aria-hidden
      >
        {initials}
      </div>
    )
  }

  if (family === "atelier") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border border-[#1f3d32] font-[family-name:var(--font-instrument-serif)] italic text-[#1f3d32]",
          dim,
          className
        )}
        aria-hidden
      >
        {initials}
      </div>
    )
  }

  if (family === "statement") {
    return (
      <p
        className={cn(
          "font-[family-name:var(--font-geist-sans)] font-black uppercase leading-none tracking-[-0.06em] text-white",
          size === "hero" ? "text-[64px]" : "text-[28px]",
          className
        )}
        aria-hidden
      >
        {initials}
      </p>
    )
  }

  if (family === "ledger") {
    return (
      <span
        className={cn(
          "font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.32em] text-[#3ee0b7]",
          className
        )}
        aria-hidden
      >
        {initials}
      </span>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center font-[family-name:var(--font-geist-sans)] font-semibold tracking-tight",
        dim,
        onDark ? "bg-white text-[#0b1220]" : "text-white",
        className
      )}
      style={onDark ? undefined : { backgroundColor: layout.accent }}
      aria-hidden
    >
      {initials}
    </div>
  )
}
