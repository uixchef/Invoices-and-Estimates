"use client"

import { HLIcon } from "@/components/highrise/icon"
import { ChevronDownIcon } from "@gohighlevel/ghl-icons/24/outline"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

type LayoutsPaginationProps = {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function getVisiblePages(
  current: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages]
  }
  if (current >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages]
}

export function LayoutsPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: LayoutsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const visiblePages = getVisiblePages(page, totalPages)

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-4 py-2 pl-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
          Rows per page
        </span>
        <label className="relative">
          <span className="sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 w-16 appearance-none rounded border border-[#d0d5dd] bg-white px-2 py-1.5 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <HLIcon
            className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
            decorative
          >
            <ChevronDownIcon />
          </HLIcon>
        </label>
        <span className="font-[family-name:var(--font-inter)] text-sm leading-5 text-[#475467]">
          {start}-{end} of {total}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            "flex h-8 items-center justify-center rounded border border-[#d0d5dd] bg-white px-2 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 shadow-[0_1px_1px_rgba(16,24,40,0.05)]",
            page <= 1
              ? "cursor-not-allowed text-[#d0d5dd]"
              : "text-[#344054] hover:bg-slate-50"
          )}
        >
          Previous
        </button>

        {visiblePages.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 min-w-8 items-center justify-center rounded border border-[#d0d5dd] bg-white px-2 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNumber}
              type="button"
              aria-current={pageNumber === page ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded p-1.5 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#475467]",
                pageNumber === page
                  ? "border border-[#2970ff] bg-white"
                  : "hover:bg-slate-50"
              )}
            >
              {pageNumber}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            "flex h-8 items-center justify-center rounded border border-[#d0d5dd] bg-white px-2 font-[family-name:var(--font-inter)] text-sm font-semibold leading-5 text-[#475467] shadow-[0_1px_1px_rgba(16,24,40,0.05)]",
            page >= totalPages
              ? "cursor-not-allowed text-[#d0d5dd]"
              : "hover:bg-slate-50"
          )}
        >
          Next
        </button>
      </div>
    </div>
  )
}
