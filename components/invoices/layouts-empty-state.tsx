import Image from "next/image"

/**
 * Figma: Integrations HighRise — filtered empty state (grid 3448:77202, table
 * 3448:64348). Shared "no results for these filters" block: a no-results
 * illustration, title + supporting copy, and an optional Clear filters action.
 */
function NoResultsIllustration() {
  return (
    <Image
      src="/layouts/empty-state-no-results.png"
      alt=""
      width={180}
      height={180}
      aria-hidden
      className="size-[180px] shrink-0"
    />
  )
}

export function LayoutsEmptyState({
  onClearFilters,
  showClear = true,
  entityLabel = "layouts",
}: {
  onClearFilters?: () => void
  showClear?: boolean
  /** Plural noun for the filtered records, e.g. "layouts", "mediums". */
  entityLabel?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 text-center">
      <NoResultsIllustration />
      <div className="flex w-[352px] max-w-full flex-col items-center gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#101828]">
            No {entityLabel} match these filters
          </p>
          <p className="font-[family-name:var(--font-inter)] text-sm font-normal leading-5 text-[#475467]">
            Try adjusting or clearing your filter criteria to see more results.
          </p>
        </div>
        {showClear && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center rounded-lg border border-[#84adff] bg-white px-3.5 py-2 font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#004eeb] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline-none transition-colors hover:bg-[#eff4ff] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  )
}
