"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronDown, FileText, ReceiptText, Search } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import {
  ACTUAL_INVOICES,
  INVOICE_SAMPLES,
  type DocumentSource,
} from "@/lib/invoice-sources"
import { cn } from "@/lib/utils"

// Unfiltered order (samples first, then invoices) — used to seed the keyboard
// highlight on the current selection when the picker opens.
const SOURCE_ORDER: DocumentSource[] = [...INVOICE_SAMPLES, ...ACTUAL_INVOICES]

function matches(source: DocumentSource, query: string): boolean {
  const haystack =
    `${source.shortLabel} ${source.title} ${source.subtitle} ${source.client ?? ""} ${source.status ?? ""}`.toLowerCase()
  return haystack.includes(query)
}

function SourceRow({
  source,
  selected,
  active,
  onSelect,
  onHover,
  rowRef,
}: {
  source: DocumentSource
  selected: boolean
  active: boolean
  onSelect: () => void
  onHover: () => void
  rowRef: (node: HTMLButtonElement | null) => void
}) {
  const isSample = source.kind === "sample"
  const Icon = isSample ? FileText : ReceiptText
  return (
    <button
      ref={rowRef}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-2 px-2 py-1 text-left outline-none transition-colors",
        isSample && "items-start",
        selected ? "bg-[#eff4ff]" : active && "bg-[#f2f4f7]"
      )}
    >
      <span
        className={cn(
          "flex w-[14px] shrink-0 items-center justify-center text-[#667085] [&_svg]:size-[14px]",
          isSample && "py-[3px]"
        )}
      >
        <Icon aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium leading-5 text-[#344054]">
            {source.title}
          </span>
          {source.status ? (
            <span className="shrink-0 text-[11px] leading-4 text-[#667085]">
              {source.status}
            </span>
          ) : null}
        </span>
        {isSample ? (
          <span className="text-xs leading-[17px] text-[#475467]">
            {source.subtitle}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-[#f9fafb] px-2 pb-1 pt-2 pr-2.5 text-xs font-medium leading-[17px] text-[#98a2b3]">
      {children}
    </p>
  )
}

/**
 * Toolbar control that picks the data source the document preview renders
 * against: a built-in sample dataset or one of the workspace's actual invoices.
 * Searchable command-palette pattern (Figma 3330:48623).
 */
export function DocumentSourcePicker() {
  const { previewSourceId, setPreviewSourceId, documentType } =
    useLayoutBuilder()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const normalized = query.trim().toLowerCase()
  const samples = useMemo(
    () =>
      normalized
        ? INVOICE_SAMPLES.filter((source) => matches(source, normalized))
        : INVOICE_SAMPLES,
    [normalized]
  )
  const invoices = useMemo(
    () =>
      normalized
        ? ACTUAL_INVOICES.filter((source) => matches(source, normalized))
        : ACTUAL_INVOICES,
    [normalized]
  )

  // Flat, ordered list backing arrow-key navigation across both sections.
  const flat = useMemo(() => [...samples, ...invoices], [samples, invoices])

  const selectedLabel =
    SOURCE_ORDER.find((source) => source.id === previewSourceId)?.shortLabel ??
    documentType

  const commit = (source: DocumentSource) => {
    setPreviewSourceId(source.id)
    setOpen(false)
  }

  const moveActive = (delta: number) => {
    if (flat.length === 0) {
      return
    }
    setActiveIndex((current) => {
      const next = (current + delta + flat.length) % flat.length
      rowRefs.current.get(flat[next].id)?.scrollIntoView({ block: "nearest" })
      return next
    })
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setQuery("")
      // Land the highlight on the current selection so the open state reflects
      // what's applied, otherwise start at the top.
      const index = SOURCE_ORDER.findIndex(
        (source) => source.id === previewSourceId
      )
      setActiveIndex(index >= 0 ? index : 0)
    }
  }

  const setRowRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      rowRefs.current.set(id, node)
    } else {
      rowRefs.current.delete(id)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Document data source"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-[4px] border border-[#d0d5dd] bg-white px-2 text-[#475467] outline-none transition-colors",
            "font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
            "hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 [&_svg]:size-[18px]",
            "data-[state=open]:bg-[#f2f4f7]"
          )}
        >
          <FileText aria-hidden />
          <span className="max-w-[180px] truncate">{selectedLabel}</span>
          <ChevronDown className="size-4 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[320px] rounded-[4px] border-[#d0d5dd] p-0 shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]"
        onOpenAutoFocus={(event) => {
          // Keep focus on the search field rather than the first row.
          event.preventDefault()
        }}
      >
        <div className="flex flex-col py-1">
          <div className="p-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[#d0d5dd] bg-white px-2 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-[box-shadow,border-color] focus-within:border-[#84adff] focus-within:shadow-[0_0_0_4px_#eff4ff,0px_1px_2px_0px_rgba(16,24,40,0.05)]">
              <Search
                className="size-4 shrink-0 text-[#667085]"
                aria-hidden
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault()
                    moveActive(1)
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault()
                    moveActive(-1)
                  } else if (event.key === "Enter") {
                    event.preventDefault()
                    const target = flat[activeIndex]
                    if (target) {
                      commit(target)
                    }
                  }
                }}
                placeholder="Search samples or invoices"
                aria-label="Search samples or invoices"
                className="h-full min-w-0 flex-1 bg-transparent text-sm leading-5 text-[#101828] outline-none placeholder:text-[#667085]"
              />
            </div>
          </div>

          <div className="h-px w-full bg-[#eaecf0]" />

          <div
            role="listbox"
            aria-label="Document data sources"
            className="max-h-[320px] overflow-y-auto"
          >
            {flat.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-[#667085]">
                No matches for &ldquo;{query.trim()}&rdquo;
              </p>
            ) : (
              <>
                {samples.length > 0 ? (
                  <>
                    <SectionHeader>Samples</SectionHeader>
                    {samples.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        selected={source.id === previewSourceId}
                        active={flat.indexOf(source) === activeIndex}
                        onSelect={() => commit(source)}
                        onHover={() => setActiveIndex(flat.indexOf(source))}
                        rowRef={setRowRef(source.id)}
                      />
                    ))}
                  </>
                ) : null}

                {invoices.length > 0 ? (
                  <>
                    <SectionHeader>Actual invoices</SectionHeader>
                    {invoices.map((source) => (
                      <SourceRow
                        key={source.id}
                        source={source}
                        selected={source.id === previewSourceId}
                        active={flat.indexOf(source) === activeIndex}
                        onSelect={() => commit(source)}
                        onHover={() => setActiveIndex(flat.indexOf(source))}
                        rowRef={setRowRef(source.id)}
                      />
                    ))}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
