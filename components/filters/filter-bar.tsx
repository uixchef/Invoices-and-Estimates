"use client"

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Check, Plus, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { FilterDefinition } from "@/lib/layout-filters"
import { cn } from "@/lib/utils"

export type FilterBarAnchor = "toolbar" | "table"

function FilterDropdownPanel({
  definition,
  selectedIds,
  onSelectedIdsChange,
  onApply,
}: {
  definition: FilterDefinition
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  onApply: () => void
}) {
  const hasSelection = selectedIds.length > 0
  const statusLabel = hasSelection
    ? `${selectedIds.length} selected`
    : definition.emptyStatus

  return (
    <div className="flex w-[284px] flex-col overflow-hidden rounded border border-[#d0d5dd] bg-white shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]">
      <div className="bg-[#f9fafb] px-4 pb-1 pt-2">
        <p className="font-[family-name:var(--font-inter)] text-sm font-medium leading-5 text-[#475467]">
          {statusLabel}
        </p>
      </div>

      <div className="max-h-[280px] overflow-y-auto overscroll-contain">
        {definition.options.map((option) => {
          const selected = selectedIds.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onSelectedIdsChange(
                  selected
                    ? selectedIds.filter((id) => id !== option.id)
                    : [...selectedIds, option.id]
                )
              }
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-left font-[family-name:var(--font-inter)] text-base font-medium leading-6 text-[#101828] outline-none",
                selected
                  ? "bg-[#eff4ff] hover:bg-[#eff4ff]"
                  : "bg-white hover:bg-[#f2f4f7] focus-visible:bg-[#f2f4f7]"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {selected ? (
                <Check className="size-4 shrink-0 text-[#004eeb]" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="border-t border-[#d0d5dd] py-3">
        <div className="flex items-center justify-end gap-3 px-4">
          <button
            type="button"
            disabled={!hasSelection}
            onClick={() => onSelectedIdsChange([])}
            className={cn(
              "font-[family-name:var(--font-inter)] text-base font-semibold leading-6 outline-none",
              hasSelection
                ? "cursor-pointer text-[#344054] hover:text-[#101828]"
                : "cursor-not-allowed text-[#d0d5dd]"
            )}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="cursor-pointer font-[family-name:var(--font-inter)] text-base font-semibold leading-6 text-[#004eeb] outline-none hover:text-[#155eef]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export function FilterDropdownPopover({
  definition,
  open,
  onOpenChange,
  selectedIds,
  onSelectedIdsChange,
  trigger,
  draftIds: controlledDraftIds,
  onDraftIdsChange,
  align = "start",
  sideOffset = 8,
}: {
  definition: FilterDefinition
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  trigger: ReactNode
  draftIds?: string[]
  onDraftIdsChange?: (ids: string[]) => void
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  const [internalDraftIds, setInternalDraftIds] = useState(selectedIds)
  const openedAtRef = useRef(0)
  const draftIds = controlledDraftIds ?? internalDraftIds
  const setDraftIds = onDraftIdsChange ?? setInternalDraftIds

  useEffect(() => {
    if (open) openedAtRef.current = Date.now()
  }, [open])

  useEffect(() => {
    if (open && onDraftIdsChange === undefined) {
      setInternalDraftIds(selectedIds)
    }
  }, [open, onDraftIdsChange, selectedIds])

  const shouldIgnoreDismiss = () => Date.now() - openedAtRef.current < 400

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && shouldIgnoreDismiss()) return
    onOpenChange(nextOpen)
  }

  const handleApply = () => {
    onSelectedIdsChange(draftIds)
    openedAtRef.current = 0
    onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        className="z-[110] border-0 bg-transparent p-0 shadow-none"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          if (shouldIgnoreDismiss()) event.preventDefault()
        }}
        onFocusOutside={(event) => {
          if (shouldIgnoreDismiss()) event.preventDefault()
        }}
      >
        <FilterDropdownPanel
          definition={definition}
          selectedIds={draftIds}
          onSelectedIdsChange={setDraftIds}
          onApply={handleApply}
        />
      </PopoverContent>
    </Popover>
  )
}

function formatFilterTagValue(
  selectedIds: string[],
  options: FilterDefinition["options"]
): string | null {
  if (selectedIds.length === 0) return null
  const firstLabel =
    options.find((option) => option.id === selectedIds[0])?.label ??
    selectedIds[0]
  if (selectedIds.length === 1) return firstLabel
  return `${firstLabel}, +${selectedIds.length - 1}`
}

function FilterTag<T extends string>({
  filterId,
  definition,
  isActive,
  popoverOpen,
  onPopoverOpenChange,
  selectedIds,
  draftIds,
  onDraftIdsChange,
  onSelectedIdsChange,
  onRemove,
}: {
  filterId: T
  definition: FilterDefinition
  isActive: boolean
  popoverOpen: boolean
  onPopoverOpenChange: (open: boolean) => void
  selectedIds: string[]
  draftIds: string[]
  onDraftIdsChange: (ids: string[]) => void
  onSelectedIdsChange: (ids: string[]) => void
  onRemove: () => void
}) {
  const displayIds = isActive ? draftIds : selectedIds
  const valueLabel = formatFilterTagValue(displayIds, definition.options)

  return (
    <div
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-[14px] border pl-2 pr-3",
        isActive
          ? "border-[#475467] bg-[#eaecf0] text-[#101828]"
          : "border-[#d0d5dd] bg-white text-[#344054]"
      )}
    >
      <FilterDropdownPopover
        definition={definition}
        open={popoverOpen}
        onOpenChange={onPopoverOpenChange}
        selectedIds={selectedIds}
        onSelectedIdsChange={onSelectedIdsChange}
        draftIds={draftIds}
        onDraftIdsChange={onDraftIdsChange}
        trigger={
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isActive}
            className="inline-flex min-w-0 items-center gap-0.5 font-[family-name:var(--font-inter)] text-sm font-medium leading-5 outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
          >
            <span>{definition.tagLabel}</span>
            {valueLabel ? (
              <span
                className={cn(
                  "rounded px-1.5",
                  isActive ? "bg-[#fcfcfd]" : "bg-[#f2f4f7]"
                )}
              >
                {valueLabel}
              </span>
            ) : null}
          </button>
        }
      />
      <button
        type="button"
        aria-label={`Remove ${definition.tagLabel} filter`}
        onClick={onRemove}
        className={cn(
          "rounded-[10px] p-[3px] outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
          isActive ? "bg-white hover:bg-[#f2f4f7]" : "opacity-50 hover:opacity-70"
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

type ConfigurableFilterBarProps<T extends string> = {
  filterDefinitions: Record<T, FilterDefinition>
  addFilterOptions: Array<{ id: T; menuLabel: string }>
  openFilterId: T | null
  openFilterAnchor: FilterBarAnchor | null
  selections: Record<T, string[]>
  filterDraftIds: string[]
  visibleFilterTags: T[]
  onFilterDraftIdsChange: (ids: string[]) => void
  onFilterApply: (filterId: T, ids: string[]) => void
  onToolbarFilterOpenChange: (filterId: T, open: boolean) => void
  onAddFilter: (filterId: T) => void
  onRemoveFilter: (filterId: T) => void
}

export function ConfigurableFilterBar<T extends string>({
  filterDefinitions,
  addFilterOptions,
  openFilterId,
  openFilterAnchor,
  selections,
  filterDraftIds,
  visibleFilterTags,
  onFilterDraftIdsChange,
  onFilterApply,
  onToolbarFilterOpenChange,
  onAddFilter,
  onRemoveFilter,
}: ConfigurableFilterBarProps<T>) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const availableAddOptions = addFilterOptions.filter(
    (option) => !visibleFilterTags.includes(option.id)
  )

  return (
    <div className="flex w-fit max-w-full min-w-0 items-center gap-2">
      {visibleFilterTags.map((filterId) => {
        const isActive = openFilterId === filterId
        const definition = filterDefinitions[filterId]
        return (
          <FilterTag
            key={filterId}
            filterId={filterId}
            definition={definition}
            isActive={isActive}
            popoverOpen={isActive && openFilterAnchor === "toolbar"}
            onPopoverOpenChange={(open) =>
              onToolbarFilterOpenChange(filterId, open)
            }
            selectedIds={selections[filterId]}
            draftIds={isActive ? filterDraftIds : selections[filterId]}
            onDraftIdsChange={onFilterDraftIdsChange}
            onSelectedIdsChange={(ids) => onFilterApply(filterId, ids)}
            onRemove={() => onRemoveFilter(filterId)}
          />
        )
      })}

      {visibleFilterTags.length > 0 && availableAddOptions.length > 0 ? (
        <div className="h-3.5 w-px shrink-0 bg-[#d0d5dd]" aria-hidden />
      ) : null}

      {availableAddOptions.length > 0 ? (
        <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-haspopup="menu"
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-[14px] border pl-2 pr-3 font-[family-name:var(--font-inter)] text-sm font-medium leading-5",
                "border-[#d0d5dd] bg-white text-[#344054] hover:bg-slate-50",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                "data-[state=open]:border-[#475467] data-[state=open]:bg-[#eaecf0] data-[state=open]:text-[#101828]"
              )}
            >
              <Plus className="size-[18px]" aria-hidden />
              Add filter
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="z-[110] rounded">
            {availableAddOptions.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => {
                  setAddMenuOpen(false)
                  onAddFilter(option.id)
                }}
              >
                {option.menuLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
