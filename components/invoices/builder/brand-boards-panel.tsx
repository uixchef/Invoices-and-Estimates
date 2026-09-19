"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"

import { Input } from "@/components/highrise/input-text"
import {
  BRAND_FONTS,
  BRAND_THEMES,
  BRAND_TYPE_PAIRINGS,
  catalogBoards,
  exactBoardId,
  selectionFromBoard,
  typePairingSpecimen,
  type BrandBoard,
  type BrandSelection,
  type BrandTheme,
  type BrandTypePairing,
} from "@/lib/brand-boards"
import { useLayoutBuilder } from "@/lib/layout-builder-context"
import { cn } from "@/lib/utils"

function Palette({ theme }: { theme: BrandTheme }) {
  const swatches = [
    { color: theme.primary, flex: 32 },
    { color: theme.accent, flex: 18 },
    { color: theme.surface, flex: 20 },
    { color: theme.text, flex: 16 },
    { color: theme.mutedText, flex: 14 },
  ]
  return (
    <div
      className="flex h-5 overflow-hidden rounded-[3px] border border-[#eaecf0]"
      aria-hidden
    >
      {swatches.map((swatch, index) => (
        <span
          key={`${swatch.color}-${index}`}
          className="h-full min-w-0"
          style={{ backgroundColor: swatch.color, flex: swatch.flex }}
        />
      ))}
    </div>
  )
}

function TypeSpecimen({
  type,
  compact = false,
}: {
  type: BrandTypePairing
  compact?: boolean
}) {
  const copy = typePairingSpecimen(type)
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={cn(
          "mt-px shrink-0 font-medium leading-none text-[#101828]",
          compact ? "text-[17px]" : "text-[19px]"
        )}
        style={{ fontFamily: type.headingFont }}
        aria-hidden
      >
        Aa
      </span>
      <span className="min-w-0 pt-px">
        <span className="block truncate text-[11px] font-medium leading-[14px] text-[#344054]">
          {copy.primary}
        </span>
        <span className="block truncate text-[11px] leading-[14px] text-[#667085]">
          {copy.secondary}
        </span>
      </span>
    </div>
  )
}

function BoardCard({
  board,
  selected,
  applied,
  onSelect,
  onEdit,
  onRemove,
}: {
  board: BrandBoard
  selected: boolean
  applied: boolean
  onSelect: () => void
  onEdit?: () => void
  onRemove?: () => void
}) {
  const preview = selected && !applied
  return (
    <div
      className={cn(
        "rounded-[8px] border bg-white",
        applied && "border-[#155eef] bg-white",
        preview && "border-[#84adff] bg-[#f8fbff]",
        !applied && !preview && "border-[#eaecf0] hover:border-[#b2ddff]"
      )}
    >
      <button
        type="button"
        aria-pressed={preview || applied}
        aria-label={`${board.name}${applied ? ", applied" : preview ? ", preview" : ""}`}
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col px-3 py-3 text-left outline-none",
          "font-[family-name:var(--font-inter)]",
          "focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold leading-5 text-[#101828]">
            {board.name}
          </p>
          <span className="inline-flex h-[18px] w-[62px] shrink-0 items-center justify-end gap-0.5 text-[11px] font-medium leading-[18px] text-[#1570ef]">
            {applied ? (
              <>
                <Check className="size-3" strokeWidth={2.4} aria-hidden />
                Applied
              </>
            ) : preview ? (
              "Preview"
            ) : null}
          </span>
        </div>
        <p className="mt-[3px] text-xs leading-4 text-[#667085]">{board.description}</p>
        <div className="mt-2.5">
          <Palette theme={board.theme} />
        </div>
        <div className="mt-2.5">
          <TypeSpecimen type={board.type} />
        </div>
      </button>
      {board.origin === "custom" && (onEdit || onRemove) ? (
        <div className="flex items-center gap-3 border-t border-[#eaecf0] px-3 py-1.5">
          {onEdit ? (
            <button
              type="button"
              className="text-[11px] font-medium text-[#155eef] outline-none hover:text-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              onClick={onEdit}
            >
              Edit
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              className="text-[11px] font-medium text-[#b42318] outline-none hover:text-[#912018] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
              onClick={onRemove}
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CustomEditor({
  initial,
  onCancel,
  onSave,
  onLive,
}: {
  initial?: BrandBoard
  onCancel: () => void
  onSave: (board: BrandBoard) => void
  onLive: (board: BrandBoard) => void
}) {
  const draftId = useRef(initial?.id ?? `draft-${Date.now()}`)
  const [name, setName] = useState(initial?.name ?? "Workshop board")
  const [primary, setPrimary] = useState(initial?.theme.primary ?? "#1e3a5f")
  const [accent, setAccent] = useState(initial?.theme.accent ?? "#b45309")
  const [surface, setSurface] = useState(initial?.theme.surface ?? "#ffffff")
  const [text, setText] = useState(initial?.theme.text ?? "#0f172a")
  const [muted, setMuted] = useState(initial?.theme.mutedText ?? "#475569")
  const [headingFont, setHeadingFont] = useState(
    initial?.type.headingFont ?? BRAND_FONTS[0].value
  )
  const [bodyFont, setBodyFont] = useState(initial?.type.bodyFont ?? BRAND_FONTS[0].value)

  const draftBoard = useMemo<BrandBoard>(() => {
    const themeId = initial?.themeId ?? draftId.current
    const typeId = initial?.typeId ?? `${draftId.current}-type`
    const headingLabel =
      BRAND_FONTS.find((font) => font.value === headingFont)?.label ?? "Heading"
    const bodyLabel = BRAND_FONTS.find((font) => font.value === bodyFont)?.label ?? "Body"
    return {
      id: draftId.current,
      name: name.trim() || "Custom board",
      description: "Saved locally",
      origin: "custom",
      themeId,
      typeId,
      theme: {
        id: themeId,
        name: name.trim() || "Custom board",
        primary,
        accent,
        surface,
        strongSurface: primary,
        text,
        mutedText: muted,
        border: "#e2e8f0",
      },
      type: {
        id: typeId,
        name: name.trim() || "Custom pairing",
        headingFont,
        bodyFont,
        headingLabel,
        bodyLabel,
      },
    }
  }, [accent, bodyFont, headingFont, initial, muted, name, primary, surface, text])

  useEffect(() => {
    onLive(draftBoard)
  }, [draftBoard, onLive])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1 pb-4">
      <p className="text-sm leading-5 text-[#475467]">
        Custom boards stay in this browser. They are not account-level storage.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#344054]">Name</span>
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Board name" />
      </label>
      {(
        [
          ["Primary", primary, setPrimary],
          ["Accent", accent, setAccent],
          ["Page", surface, setSurface],
          ["Text", text, setText],
          ["Muted text", muted, setMuted],
        ] as const
      ).map(([label, value, setter]) => (
        <label key={label} className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#344054]">{label}</span>
          <input
            type="color"
            value={value.startsWith("#") && value.length === 7 ? value : "#101828"}
            aria-label={label}
            onChange={(event) => setter(event.target.value)}
            className="size-7 cursor-pointer rounded-[4px] border border-[#d0d5dd] bg-white"
          />
        </label>
      ))}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#344054]">Heading font</span>
        <select
          aria-label="Heading font"
          value={headingFont}
          onChange={(event) => setHeadingFont(event.target.value)}
          className="h-9 rounded-[4px] border border-[#d0d5dd] bg-white px-2 text-sm"
        >
          {BRAND_FONTS.map((font) => (
            <option key={font.id} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#344054]">Body font</span>
        <select
          aria-label="Body font"
          value={bodyFont}
          onChange={(event) => setBodyFont(event.target.value)}
          className="h-9 rounded-[4px] border border-[#d0d5dd] bg-white px-2 text-sm"
        >
          {BRAND_FONTS.map((font) => (
            <option key={font.id} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </label>
      <div
        className="rounded-[8px] border border-[#eaecf0] px-3 py-2.5"
        style={{ backgroundColor: surface, color: text }}
      >
        <TypeSpecimen
          type={{
            id: "preview",
            name: name,
            headingFont,
            bodyFont,
            headingLabel:
              BRAND_FONTS.find((font) => font.value === headingFont)?.label ?? "Heading",
            bodyLabel: BRAND_FONTS.find((font) => font.value === bodyFont)?.label ?? "Body",
          }}
        />
      </div>
      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 flex-1 rounded-[4px] border border-[#d0d5dd] text-sm font-medium text-[#344054]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draftBoard)}
          className="h-9 flex-1 rounded-[4px] bg-[#155eef] text-sm font-semibold text-white"
        >
          Save and apply
        </button>
      </div>
    </div>
  )
}

export function BrandBoardsPanel() {
  const {
    brandDraft,
    brandTokens,
    previewBrandSelection,
    applyBrandSelection,
    cancelBrandPreview,
    customBoards,
    upsertCustomBoard,
    removeCustomBoard,
    previewUnsavedBoard,
    generatedLayout,
  } = useLayoutBuilder()
  const [mode, setMode] = useState<"list" | "create" | "edit">("list")
  const [editing, setEditing] = useState<BrandBoard | null>(null)
  const boards = useMemo(() => catalogBoards(customBoards), [customBoards])
  const live = brandDraft ?? generatedLayout.brand ?? null
  const liveExact = live ? exactBoardId(live, customBoards) : brandTokens.exactBoardId

  if (mode === "create" || mode === "edit") {
    return (
      <CustomEditor
        initial={mode === "edit" ? editing ?? undefined : undefined}
        onCancel={() => {
          cancelBrandPreview()
          setMode("list")
          setEditing(null)
        }}
        onLive={previewUnsavedBoard}
        onSave={(board) => {
          upsertCustomBoard(board, true)
          setMode("list")
          setEditing(null)
        }}
      />
    )
  }

  const showStatus = Boolean(brandDraft) || Boolean(live && !liveExact && !brandDraft)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showStatus ? (
      <div className="shrink-0 bg-white px-4 pt-1 pb-3">
        {brandDraft ? (
          <div className="flex items-center gap-2 rounded-[6px] border border-[#b2ddff] bg-[#f5faff] px-2 py-1.5">
            <p className="min-w-0 flex-1 text-[11px] leading-4 text-[#175cd3]">
              Previewing — apply to keep this board.
            </p>
            <button
              type="button"
              onClick={cancelBrandPreview}
              className="text-[11px] font-medium text-[#344054] outline-none hover:text-[#101828] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyBrandSelection}
              className="rounded-[4px] bg-[#155eef] px-2 py-1 text-[11px] font-semibold text-white outline-none hover:bg-[#004eeb] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
            >
              Apply
            </button>
          </div>
        ) : null}
        {live && !liveExact && !brandDraft ? (
          <p className="text-[11px] leading-4 text-[#667085]">
            Customized — theme and type no longer match a built-in board.
          </p>
        ) : null}
      </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <section>
          <div className="flex flex-col gap-2">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                selected={liveExact === board.id}
                applied={!brandDraft && liveExact === board.id}
                onSelect={() => previewBrandSelection(selectionFromBoard(board))}
                onEdit={
                  board.origin === "custom"
                    ? () => {
                        setEditing(board)
                        setMode("edit")
                      }
                    : undefined
                }
                onRemove={
                  board.origin === "custom"
                    ? () => removeCustomBoard(board.id)
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        <section className="mt-5 border-t border-[#eaecf0] pt-5">
          <p className="text-xs font-medium leading-[18px] text-[#667085]">Font pairing</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#98a2b3]">
            Keep the colors. Change the type.
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {BRAND_TYPE_PAIRINGS.map((pairing) => {
              const selected = live?.typeId === pairing.id
              return (
                <button
                  key={pairing.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    previewBrandSelection({
                      boardId: live?.boardId ?? null,
                      themeId: live?.themeId ?? "harbor-studio",
                      typeId: pairing.id,
                    })
                  }
                  className={cn(
                    "flex items-center rounded-[6px] border px-2.5 py-1.5 text-left outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                    selected
                      ? "border-[#84adff] bg-[#f8fbff]"
                      : "border-[#eaecf0] bg-white hover:border-[#b2ddff]"
                  )}
                >
                  <TypeSpecimen type={pairing} compact />
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-4">
          <p className="text-xs font-medium leading-[18px] text-[#667085]">Theme</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#98a2b3]">
            Keep the type. Change the colors.
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {BRAND_THEMES.map((theme) => {
              const selected = live?.themeId === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    previewBrandSelection({
                      boardId: live?.boardId ?? null,
                      themeId: theme.id,
                      typeId: live?.typeId ?? "studio-sans",
                    })
                  }
                  className={cn(
                    "flex items-center gap-2.5 rounded-[6px] border px-2.5 py-1.5 text-left outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
                    selected
                      ? "border-[#84adff] bg-[#f8fbff]"
                      : "border-[#eaecf0] bg-white hover:border-[#b2ddff]"
                  )}
                >
                  <span className="w-[72px] shrink-0">
                    <Palette theme={theme} />
                  </span>
                  <span className="truncate text-xs font-medium text-[#344054]">{theme.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setMode("create")}
          className="mt-5 w-full rounded-[6px] border border-dashed border-[#d0d5dd] py-2 text-sm font-medium text-[#155eef] outline-none hover:border-[#84adff] hover:bg-[#f8fbff] focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
        >
          Create custom Brand Board
        </button>
      </div>
    </div>
  )
}

export type { BrandSelection }
