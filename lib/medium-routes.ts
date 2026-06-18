import { getMediumById } from "@/lib/mediums-data"

/** Routes where medium create/edit runs without hub sidebar or payments top nav. */
export function isMediumEditorRoute(pathname: string): boolean {
  if (pathname === "/invoices/mediums/new") {
    return true
  }

  return /^\/invoices\/mediums\/[^/]+\/edit$/.test(pathname)
}

export function getMediumIdFromEditorPath(pathname: string): string | null {
  const match = pathname.match(/^\/invoices\/mediums\/([^/]+)\/edit$/)
  return match?.[1] ?? null
}

export function getMediumEditorHref(mediumId: string): string {
  return `/invoices/mediums/${mediumId}/edit`
}

export function getMediumEditorTitle(pathname: string): string {
  if (pathname === "/invoices/mediums/new") {
    return "New paper type"
  }

  const mediumId = getMediumIdFromEditorPath(pathname)
  if (mediumId) {
    return getMediumById(mediumId)?.name ?? "Edit paper type"
  }

  return "Paper type"
}
