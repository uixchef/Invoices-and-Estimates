"use client"

import { Eye } from "lucide-react"

import { useLayoutBuilder } from "@/lib/layout-builder-context"
import {
  canRestoreDocumentVersion,
  formatVersionTimestamp,
} from "@/lib/document-versions"
import { versionHistorySelectedId } from "@/lib/version-history-ui"
import { cn } from "@/lib/utils"

export function PreviewVersionBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-[8px] border border-[#84adff] bg-white p-2 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Eye className="size-3.5 shrink-0 text-[#155eef]" aria-hidden />
        <span className="truncate font-[family-name:var(--font-inter)] text-xs font-medium leading-[18px] text-[#475467]">
          Previewing an earlier version
        </span>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex h-6 shrink-0 items-center justify-center rounded-[4px] bg-[#155eef] px-1.5 font-[family-name:var(--font-inter)] text-xs font-semibold leading-[18px] text-white outline-none transition-colors hover:bg-[#0040c1] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
      >
        Back to current
      </button>
    </div>
  )
}

export function VersionHistoryPanel() {
  const {
    documentVersions,
    currentVersionId,
    previewVersionId,
    previewDocumentVersion,
    restoreDocumentVersion,
    closeVersionHistoryPreview,
    previewingHistoricalVersion,
    status,
  } = useLayoutBuilder()

  const selectedId = versionHistorySelectedId({
    currentVersionId,
    previewVersionId,
    previewingHistoricalVersion,
  })
  const canRestore =
    selectedId != null &&
    canRestoreDocumentVersion(documentVersions, selectedId, currentVersionId)
  const now = Date.now()
  const ordered = [...documentVersions].reverse()
  const showBanner =
    previewingHistoricalVersion && (status === "ready" || status === "idle")

  return (
    <div
      data-version-history-panel
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {showBanner ? (
        <div className="shrink-0 px-4 pb-3">
          <PreviewVersionBanner onExit={closeVersionHistoryPreview} />
        </div>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-2"
        data-version-history-scroll
      >
        {ordered.length === 0 ? (
          <p className="px-1 py-3 font-[family-name:var(--font-inter)] text-xs leading-5 text-[#667085]">
            Versions appear after this document is generated or edited.
          </p>
        ) : (
          <ul
            role="listbox"
            aria-label="Document versions"
            className="flex flex-col gap-0.5"
          >
            {ordered.map((version) => {
              const isCurrent = version.id === currentVersionId
              const isSelected = version.id === selectedId
              return (
                <li key={version.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => previewDocumentVersion(version.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-[4px] px-2 py-1.5 text-left outline-none transition-colors",
                      "font-[family-name:var(--font-inter)]",
                      "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                      isSelected ? "bg-[#eff4ff]" : "hover:bg-[#f9fafb]"
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-medium text-[#101828]">
                        {version.label}
                      </span>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-[4px] bg-[#d1e0ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#004eeb]">
                          Current
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] leading-4 text-[#667085]">
                      {formatVersionTimestamp(version.createdAt, now)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 justify-end border-t border-[#eaecf0] px-4 py-3">
        <button
          type="button"
          disabled={!canRestore}
          onClick={() => {
            if (selectedId) {
              restoreDocumentVersion(selectedId)
            }
          }}
          className="inline-flex h-7 items-center rounded-[4px] bg-[#155eef] px-2.5 font-[family-name:var(--font-inter)] text-xs font-semibold text-white outline-none transition-colors hover:bg-[#0040c1] focus-visible:ring-2 focus-visible:ring-[#155eef]/40 disabled:bg-[#b2ccff] disabled:text-white"
        >
          Restore
        </button>
      </div>
    </div>
  )
}
