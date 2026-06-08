/**
 * Figma: Integrations HighRise — filtered empty state (grid 3448:77202, table
 * 3448:64348). Shared "no results for these filters" block: a no-results
 * illustration, title + supporting copy, and an optional Clear filters action.
 *
 * The illustration is an inline SVG (rather than the exported Figma asset) so it
 * stays in-repo and doesn't depend on Figma's expiring asset URLs.
 */
function NoResultsIllustration() {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="none"
      role="img"
      aria-label="No results"
      className="shrink-0"
    >
      {/* Soft backdrop */}
      <ellipse cx="92" cy="98" rx="64" ry="58" fill="#EFF4FF" />
      <circle cx="146" cy="58" r="5" fill="#D1E0FF" />
      <circle cx="36" cy="120" r="4" fill="#D1E0FF" />

      {/* Question marks */}
      <path
        d="M70 26c0-6 5-10 11-10s11 4 11 10c0 5-3 7-6 9-2 1.5-3 3-3 5"
        stroke="#101828"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="83" cy="56" r="2" fill="#101828" />
      <path
        d="M126 86c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6c0 3-2 4.2-3.6 5.4-1.2.9-1.9 1.8-1.9 3.1"
        stroke="#84ADFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="133.5" cy="103" r="1.6" fill="#84ADFF" />

      {/* Window / card */}
      <rect
        x="62"
        y="64"
        width="76"
        height="60"
        rx="8"
        fill="#FFFFFF"
        stroke="#84ADFF"
        strokeWidth="2.5"
      />
      <path
        d="M62 78c0-7.7 0-11.5 2.1-13.8C66 62 69.4 62 76 62h48c6.6 0 9.9 0 11.9 2.2 2.1 2.3 2.1 6.1 2.1 13.8H62Z"
        fill="#D1E0FF"
      />
      <circle cx="71" cy="71" r="2.2" fill="#FFFFFF" />
      <circle cx="79" cy="71" r="2.2" fill="#FFFFFF" />
      <rect x="74" y="90" width="40" height="6" rx="3" fill="#EFF4FF" />
      <rect x="74" y="102" width="52" height="6" rx="3" fill="#EFF4FF" />

      {/* Magnifying glass */}
      <circle
        cx="78"
        cy="98"
        r="22"
        fill="#FFFFFF"
        stroke="#1570EF"
        strokeWidth="4"
      />
      <path
        d="M78 80a18 18 0 0 0-18 18"
        stroke="#84ADFF"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M62 114 52 124"
        stroke="#1570EF"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
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
