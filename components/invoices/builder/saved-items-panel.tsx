"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { SavedItemRow } from "@/components/invoices/builder/saved-item-row"
import { Input } from "@/components/highrise/input-text"
import { LEFT_PANEL_SEARCH_WRAP } from "@/lib/builder-left-panel"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import {
  SAVED_ITEMS_EMPTY_BODY,
  SAVED_ITEMS_EMPTY_TITLE,
  SAVED_ITEMS_NO_RESULTS_BODY,
  SAVED_ITEMS_NO_RESULTS_TITLE,
  savedItemMatchesQuery,
} from "@/lib/saved-items"

export function SavedItemsPanel() {
  const [query, setQuery] = useState("")
  const { savedItems, insertSavedItem } = useLayoutBuilder()
  const term = query.trim()
  const visible = useMemo(
    () =>
      term
        ? savedItems.filter((item) => savedItemMatchesQuery(item, term))
        : savedItems,
    [savedItems, term]
  )

  return (
    <div
      data-saved-items-panel
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className={LEFT_PANEL_SEARCH_WRAP}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[#667085]"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved items"
            aria-label="Search saved items"
            className="h-9 pl-8 font-[family-name:var(--font-inter)] text-base leading-6"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
        {savedItems.length === 0 ? (
          <div className="px-1 py-6">
            <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]">
              {SAVED_ITEMS_EMPTY_TITLE}
            </p>
            <p className="mt-1 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]">
              {SAVED_ITEMS_EMPTY_BODY}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-1 py-6">
            <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#344054]">
              {SAVED_ITEMS_NO_RESULTS_TITLE}
            </p>
            <p className="mt-1 font-[family-name:var(--font-inter)] text-sm leading-5 text-[#667085]">
              {SAVED_ITEMS_NO_RESULTS_BODY}
            </p>
          </div>
        ) : (
          <div role="list" aria-label="Saved items" className="flex flex-col gap-0.5">
            {visible.map((item) => (
              <SavedItemRow
                key={item.id}
                item={item}
                siblings={savedItems}
                onInsert={insertSavedItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
