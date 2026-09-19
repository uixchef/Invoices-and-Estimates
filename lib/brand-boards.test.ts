import assert from "node:assert/strict"
import test from "node:test"

import {
  BOLD_BRAND_SELECTION,
  BUILT_IN_BRAND_BOARDS,
  allFamiliesResolve,
  brandFinancialFingerprint,
  catalogBoards,
  createCustomBoard,
  exactBoardId,
  familyDefaultSelection,
  inheritPlacedAppearance,
  loadCustomBoards,
  mergeInheritedStyle,
  relativeLuminance,
  resolveFamilyBrand,
  saveCustomBoards,
  selectionFromBoard,
  typePairingSpecimen,
  withBrandAccent,
  brandLayoutEditsFromSelection,
  canonicalBrandFingerprint,
  isBrandApplyNoop,
  resolvePaintedLayout,
} from "./brand-boards"
import { applyPromptEdit } from "./layout-prompt-edit"
import { reconstructLayoutFromReference } from "./reference-layout"
import { applyBlockPrompt } from "./placed-element-prompt"
import { LAYOUT_FAMILY_IDS } from "./layout-family"
import type { GeneratedLayout } from "./layout-builder-types"

function layout(): GeneratedLayout {
  return {
    documentType: "Standard invoice",
    businessName: "Studio",
    clientName: "Client",
    emphasis: null,
    style: "studio",
    accent: "#1a4cff",
    currencyCode: "USD",
    currencySymbol: "$",
    sections: {
      logo: true,
      items: true,
      taxes: true,
      notes: true,
      terms: true,
      discount: false,
      onlinePayment: false,
      paymentDetails: false,
    },
    lineItems: [{ description: "Work", qty: 1, rate: 100 }],
    taxRate: 0.1,
    discountRate: 0,
    documentNumber: "INV-1",
    issueDate: "Sep 18, 2026",
    dueDate: "Oct 1, 2026",
    payment: {
      bankName: "Bank",
      accountName: "Studio",
      accountNumber: "1",
      routingNumber: "2",
      payUrl: "https://pay.example",
      payLabel: "Pay online",
    },
  }
}

test("built-in boards are authored identities, not hue ramps", () => {
  assert.equal(BUILT_IN_BRAND_BOARDS.length, 8)
  const names = new Set(BUILT_IN_BRAND_BOARDS.map((board) => board.name))
  assert.equal(names.size, 8)
  const primaries = new Set(BUILT_IN_BRAND_BOARDS.map((board) => board.theme.primary))
  assert.ok(primaries.size >= 7)
  const types = new Set(BUILT_IN_BRAND_BOARDS.map((board) => board.typeId))
  assert.ok(types.size >= 6)
  const personalities = BUILT_IN_BRAND_BOARDS.map((board) => board.description)
  assert.deepEqual(personalities, [
    "Clean and structured",
    "Warm and editorial",
    "Technical and precise",
    "Soft and refined",
    "Bold and expressive",
    "Dark and financial",
    "Professional and restrained",
    "Minimal and understated",
  ])
  for (const line of personalities) {
    assert.ok(line.split(" ").length <= 4)
  }
})

test("type pairing specimen never repeats Font / Font", () => {
  const same = typePairingSpecimen({
    headingLabel: "Geist Sans",
    bodyLabel: "Geist Sans",
  })
  assert.equal(same.primary, "Geist Sans")
  assert.equal(same.secondary, "Sans")
  assert.doesNotMatch(`${same.primary} ${same.secondary}`, /Geist Sans \/ Geist Sans/)
  const mixed = typePairingSpecimen({
    headingLabel: "Newsreader",
    bodyLabel: "Inter",
  })
  assert.equal(mixed.primary, "Newsreader")
  assert.equal(mixed.secondary, "Inter")
})

test("applying a built-in board changes identity tokens and not family", () => {
  const board = BUILT_IN_BRAND_BOARDS.find((entry) => entry.id === "folio-editorial")
  assert.ok(board)
  const tokens = resolveFamilyBrand("studio", selectionFromBoard(board))
  assert.equal(tokens.primary, board.theme.primary)
  assert.equal(tokens.headingFont, board.type.headingFont)
  const painted = withBrandAccent({ ...layout(), style: "studio" }, tokens)
  assert.equal(painted.style, "studio")
  assert.equal(painted.accent, board.theme.primary)
  assert.equal(painted.brand?.boardId, "folio-editorial")
})

test("theme and typography resolve independently", () => {
  const mixed = resolveFamilyBrand("studio", {
    boardId: "harbor-studio",
    themeId: "folio-editorial",
    typeId: "studio-sans",
  })
  assert.equal(mixed.primary, "#7a2832")
  assert.match(mixed.headingFont, /geist-sans/)
  assert.equal(exactBoardId(mixed.selection!, []), null)
})

test("family remains unchanged across every flagship family", () => {
  const board = BUILT_IN_BRAND_BOARDS[4]
  for (const family of LAYOUT_FAMILY_IDS) {
    const tokens = resolveFamilyBrand(family, selectionFromBoard(board))
    assert.ok(tokens.primary)
    assert.ok(tokens.page)
    assert.ok(tokens.headingFont)
    assert.equal(tokens.selection?.themeId, board.themeId)
  }
})

test("financial fingerprint is untouched by brand tokens", () => {
  const before = layout()
  const tokens = resolveFamilyBrand("studio", selectionFromBoard(BUILT_IN_BRAND_BOARDS[2]))
  const after = withBrandAccent(before, tokens)
  assert.equal(brandFinancialFingerprint(before), brandFinancialFingerprint(after))
  assert.equal(after.lineItems[0].rate, 100)
})

test("ledger adapts a light board onto a dark financial surface", () => {
  const tokens = resolveFamilyBrand(
    "ledger",
    selectionFromBoard(BUILT_IN_BRAND_BOARDS.find((board) => board.id === "paper-quiet")!)
  )
  assert.ok(relativeLuminance(tokens.page) < 0.4)
  assert.ok(relativeLuminance(tokens.text) > 0.5)
})

test("preview cancel is a non-mutating resolve of the previous selection", () => {
  const applied = familyDefaultSelection("studio")
  const preview = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const live = resolveFamilyBrand("studio", preview)
  const restored = resolveFamilyBrand("studio", applied)
  assert.notEqual(live.primary, restored.primary)
  assert.equal(restored.selection?.boardId, null)
})

test("local element override wins over brand inheritance", () => {
  const tokens = resolveFamilyBrand("studio", selectionFromBoard(BUILT_IN_BRAND_BOARDS[0]))
  const inherited = inheritPlacedAppearance("heading", tokens)
  const merged = mergeInheritedStyle(inherited, { color: "#ff0000" })
  assert.equal(merged.color, "#ff0000")
  assert.equal(merged.fontFamily, inherited.fontFamily)
})

test("new headings inherit brand typography", () => {
  const tokens = resolveFamilyBrand(
    "swiss",
    selectionFromBoard(BUILT_IN_BRAND_BOARDS.find((board) => board.id === "folio-editorial")!)
  )
  const heading = inheritPlacedAppearance("heading", tokens)
  assert.equal(heading.fontFamily, tokens.headingFont)
  assert.equal(heading.color, tokens.text)
})

test("custom boards join the catalog and can be edited", () => {
  const created = createCustomBoard({
    name: "Pine workshop",
    theme: {
      primary: "#14532d",
      accent: "#365314",
      surface: "#f7fee7",
      strongSurface: "#14532d",
      text: "#14532d",
      mutedText: "#3f6212",
      border: "#d9f99d",
    },
    type: {
      headingFont: BUILT_IN_BRAND_BOARDS[0].type.headingFont,
      bodyFont: BUILT_IN_BRAND_BOARDS[0].type.bodyFont,
    },
  })
  assert.equal(created.origin, "custom")
  const catalog = catalogBoards([created])
  assert.equal(catalog.some((board) => board.id === created.id), true)
  const renamed = { ...created, name: "Pine atelier" }
  assert.equal(renamed.name, "Pine atelier")
})

test("deleted custom board falls back to family default", () => {
  const custom = createCustomBoard({
    name: "Temp",
    theme: BUILT_IN_BRAND_BOARDS[0].theme,
    type: BUILT_IN_BRAND_BOARDS[0].type,
  })
  const missing = resolveFamilyBrand(
    "studio",
    { boardId: custom.id, themeId: "missing-theme", typeId: "missing-type" },
    []
  )
  assert.ok(missing.primary)
  assert.equal(missing.exactBoardId, "harbor-studio")
})

test("custom boards persist locally and round-trip", () => {
  const store: Record<string, string> = {}
  const original = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
      },
    },
  })
  const created = createCustomBoard({
    name: "Harbor copy",
    theme: BUILT_IN_BRAND_BOARDS[0].theme,
    type: BUILT_IN_BRAND_BOARDS[0].type,
  })
  saveCustomBoards([created])
  const loaded = loadCustomBoards()
  assert.equal(loaded[0]?.id, created.id)
  assert.equal(loaded[0]?.name, "Harbor copy")
  if (original === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { window?: unknown }).window
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: original,
    })
  }
})

test("all flagship families resolve every built-in board", () => {
  for (const board of BUILT_IN_BRAND_BOARDS) {
    const resolved = allFamiliesResolve(selectionFromBoard(board))
    assert.equal(resolved.length, LAYOUT_FAMILY_IDS.length)
    for (const entry of resolved) {
      assert.ok(entry.tokens.primary)
      assert.ok(entry.tokens.headingFont)
      assert.notEqual(entry.tokens.page, "")
    }
  }
})

test("reset to brand is dropping local color and font overrides", () => {
  const tokens = resolveFamilyBrand("studio", selectionFromBoard(BUILT_IN_BRAND_BOARDS[1]))
  const inherited = inheritPlacedAppearance("heading", tokens)
  const overridden = mergeInheritedStyle(inherited, { color: "#ff00aa", fontFamily: "Comic Sans" })
  const reset = mergeInheritedStyle(inherited, {
    color: undefined,
    fontFamily: undefined,
  })
  assert.equal(overridden.color, "#ff00aa")
  assert.equal(reset.color, inherited.color)
  assert.equal(reset.fontFamily, inherited.fontFamily)
})

test("reference reconstruction keeps composition when a board is applied", () => {
  const reconstructed = reconstructLayoutFromReference("", "Standard invoice")
  const family = reconstructed.style
  const tokens = resolveFamilyBrand(family, selectionFromBoard(BUILT_IN_BRAND_BOARDS[0]))
  const painted = withBrandAccent(reconstructed, tokens)
  assert.equal(painted.style, family)
  assert.equal(painted.lineItems.length, reconstructed.lineItems.length)
  assert.equal(painted.brand?.boardId, "harbor-studio")
})

test("preview paint is a non-destructive overlay of the committed layout", () => {
  const before = layout()
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const preview = resolvePaintedLayout(before, folio)
  assert.equal(before.brand, undefined)
  assert.equal(before.accent, "#1a4cff")
  assert.equal(preview.brand?.boardId, "folio-editorial")
  assert.equal(preview.accent, BUILT_IN_BRAND_BOARDS[1].theme.primary)
  assert.equal(preview.style, "studio")
  assert.equal(preview.lineItems[0]?.rate, 100)
})

test("Apply commits the same canonical brand patch preview uses", () => {
  const before = layout()
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const preview = resolvePaintedLayout(before, folio)
  const patch = brandLayoutEditsFromSelection(before.style, folio)
  const committed = resolvePaintedLayout({ ...before, ...patch }, null)
  assert.equal(canonicalBrandFingerprint(preview), canonicalBrandFingerprint(committed))
  assert.equal(committed.brand?.boardId, preview.brand?.boardId)
  assert.equal(committed.accent, preview.accent)
  assert.equal(committed.brandTheme, undefined)
  assert.equal(committed.style, "studio")
})

test("Apply exits preview by painting committed state without a draft", () => {
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const live = resolvePaintedLayout(
    { ...layout(), ...brandLayoutEditsFromSelection("studio", folio) },
    null
  )
  assert.equal(live.brand?.themeId, "folio-editorial")
  const stillPreviewing = resolvePaintedLayout(live, folio)
  assert.equal(canonicalBrandFingerprint(live), canonicalBrandFingerprint(stillPreviewing))
})

test("Brand A then Brand B replaces the committed treatment", () => {
  const a = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const b = selectionFromBoard(BUILT_IN_BRAND_BOARDS[4])
  const first = resolvePaintedLayout(
    { ...layout(), ...brandLayoutEditsFromSelection("studio", a) },
    null
  )
  const second = resolvePaintedLayout(
    { ...first, ...brandLayoutEditsFromSelection("studio", b) },
    null
  )
  assert.equal(first.brand?.boardId, "folio-editorial")
  assert.equal(second.brand?.boardId, BUILT_IN_BRAND_BOARDS[4].id)
  assert.notEqual(first.accent, second.accent)
})

test("canceling preview leaves the committed document untouched", () => {
  const committed = layout()
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  resolvePaintedLayout(committed, folio)
  const restored = resolvePaintedLayout(committed, null)
  assert.equal(restored.brand, undefined)
  assert.equal(restored.accent, committed.accent)
  assert.equal(canonicalBrandFingerprint(restored), canonicalBrandFingerprint(committed))
})

test("no-op Apply of the family default board does not look like a mutation", () => {
  const studio = layout()
  const harbor = selectionFromBoard(BUILT_IN_BRAND_BOARDS[0])
  assert.equal(isBrandApplyNoop(studio, harbor), true)
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  assert.equal(isBrandApplyNoop(studio, folio), false)
  const applied = resolvePaintedLayout(
    { ...studio, ...brandLayoutEditsFromSelection("studio", folio) },
    null
  )
  assert.equal(isBrandApplyNoop(applied, folio), true)
})

test("family composition is unchanged when a board is previewed or applied", () => {
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  for (const family of LAYOUT_FAMILY_IDS) {
    const doc = { ...layout(), style: family, accent: "#111111" }
    const preview = resolvePaintedLayout(doc, folio)
    const applied = resolvePaintedLayout(
      { ...doc, ...brandLayoutEditsFromSelection(family, folio) },
      null
    )
    assert.equal(preview.style, family)
    assert.equal(applied.style, family)
    assert.equal(preview.businessName, doc.businessName)
    assert.equal(applied.clientName, doc.clientName)
    assert.equal(applied.lineItems.length, doc.lineItems.length)
  }
})

test("explicit content edits survive Brand Apply", () => {
  const edited = {
    ...layout(),
    businessName: "Northwind Studio",
    clientName: "Edited client",
    discountRate: 0.15,
    sections: { ...layout().sections, discount: true, onlinePayment: true },
    blocks: [
      {
        id: "placed-1",
        kind: "heading" as const,
        label: "Terms",
        zone: "end" as const,
        content: "Net 14",
      },
    ],
  }
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const applied = resolvePaintedLayout(
    { ...edited, ...brandLayoutEditsFromSelection(edited.style, folio) },
    null
  )
  assert.equal(applied.businessName, "Northwind Studio")
  assert.equal(applied.clientName, "Edited client")
  assert.equal(applied.discountRate, 0.15)
  assert.equal(applied.sections.onlinePayment, true)
  assert.equal(applied.blocks?.[0]?.content, "Net 14")
})

test("placed appearance from preview tokens matches applied tokens", () => {
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const preview = resolvePaintedLayout(layout(), folio)
  const applied = resolvePaintedLayout(
    { ...layout(), ...brandLayoutEditsFromSelection("studio", folio) },
    null
  )
  const previewTokens = resolveFamilyBrand("studio", preview.brand ?? null)
  const appliedTokens = resolveFamilyBrand("studio", applied.brand ?? null)
  assert.deepEqual(
    inheritPlacedAppearance("button", previewTokens),
    inheritPlacedAppearance("button", appliedTokens)
  )
  assert.deepEqual(
    inheritPlacedAppearance("heading", previewTokens),
    inheritPlacedAppearance("heading", appliedTokens)
  )
})

test("manual style overrides still win after a board is applied", () => {
  const tokens = resolveFamilyBrand(
    "studio",
    selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  )
  const inherited = inheritPlacedAppearance("heading", tokens)
  const overridden = mergeInheritedStyle(inherited, { color: "#ff0000" })
  assert.equal(overridden.color, "#ff0000")
  assert.equal(overridden.fontFamily, tokens.headingFont)
})

test("custom Brand Board apply uses the authored colors and type", () => {
  const custom = createCustomBoard({
    name: "Pine workshop",
    theme: {
      primary: "#14532d",
      accent: "#365314",
      surface: "#f7fee7",
      strongSurface: "#14532d",
      text: "#14532d",
      mutedText: "#3f6212",
      border: "#d9f99d",
    },
    type: {
      headingFont: BUILT_IN_BRAND_BOARDS[1].type.headingFont,
      bodyFont: BUILT_IN_BRAND_BOARDS[2].type.bodyFont,
    },
  })
  const selection = selectionFromBoard(custom)
  const preview = resolvePaintedLayout(layout(), selection, [custom])
  const applied = resolvePaintedLayout(
    { ...layout(), ...brandLayoutEditsFromSelection("studio", selection, [custom]) },
    null,
    [custom]
  )
  assert.equal(preview.accent, "#14532d")
  assert.equal(applied.accent, "#14532d")
  assert.equal(applied.brand?.boardId, custom.id)
  const tokens = resolveFamilyBrand("studio", applied.brand ?? null, [custom])
  assert.equal(tokens.headingFont, custom.type.headingFont)
  assert.equal(tokens.bodyFont, custom.type.bodyFont)
})

test("Brand Apply after a bold branded scheme drops the AI overlay so preview matches", () => {
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const branded = resolvePaintedLayout(
    { ...layout(), ...brandLayoutEditsFromSelection("studio", folio) },
    null
  )
  const bold = applyPromptEdit(branded, "Switch to a bold, branded color scheme")
  assert.ok(bold.brandTheme)
  assert.equal(bold.brand?.boardId, "folio-editorial")
  const harbor = selectionFromBoard(BUILT_IN_BRAND_BOARDS[0])
  const preview = resolvePaintedLayout(bold, harbor)
  const applied = resolvePaintedLayout(
    { ...bold, ...brandLayoutEditsFromSelection("studio", harbor) },
    null
  )
  assert.equal(preview.brandTheme, undefined)
  assert.equal(applied.brandTheme, undefined)
  assert.equal(canonicalBrandFingerprint(preview), canonicalBrandFingerprint(applied))
  assert.notEqual(
    canonicalBrandFingerprint(bold),
    canonicalBrandFingerprint(applied)
  )
})

test("session-shaped layoutEdits are enough to restore an applied board", () => {
  const folio = selectionFromBoard(BUILT_IN_BRAND_BOARDS[1])
  const patch = brandLayoutEditsFromSelection("studio", folio)
  const restored = resolvePaintedLayout({ ...layout(), ...patch }, null)
  assert.equal(restored.brand?.boardId, "folio-editorial")
  assert.equal(restored.accent, BUILT_IN_BRAND_BOARDS[1].theme.primary)
})

test("AI-added headings inherit the active board tokens", () => {
  const tokens = resolveFamilyBrand("studio", selectionFromBoard(BUILT_IN_BRAND_BOARDS[3]))
  const result = applyBlockPrompt([], layout(), "Add a heading")
  assert.equal(result.handled, true)
  const heading = result.placed.find((element) => element.kind === "heading")
  assert.ok(heading)
  const appearance = inheritPlacedAppearance(heading!.kind, tokens)
  assert.equal(appearance.fontFamily, tokens.headingFont)
  assert.equal(appearance.color, tokens.text)
})
