"use client"

import { useCallback, useSyncExternalStore } from "react"

export const PAYMENTS_HUB_SIDEBAR_COLLAPSED_KEY =
  "payments-hub-sidebar-collapsed"

export const PAYMENTS_HUB_NARROW_QUERY = "(max-width: 1023px)"

export function readSidebarCollapsed(): boolean | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.sessionStorage.getItem(PAYMENTS_HUB_SIDEBAR_COLLAPSED_KEY)
    if (raw === "true") return true
    if (raw === "false") return false
    return null
  } catch {
    return null
  }
}

export function writeSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.setItem(
      PAYMENTS_HUB_SIDEBAR_COLLAPSED_KEY,
      String(collapsed)
    )
    window.dispatchEvent(new Event("payments-hub-sidebar-change"))
  } catch {
    // Ignore storage failures in the prototype.
  }
}

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {}

  const handler = () => onStoreChange()
  window.addEventListener("payments-hub-sidebar-change", handler)
  window.addEventListener("storage", handler)

  const mq = window.matchMedia(PAYMENTS_HUB_NARROW_QUERY)
  mq.addEventListener("change", handler)

  return () => {
    window.removeEventListener("payments-hub-sidebar-change", handler)
    window.removeEventListener("storage", handler)
    mq.removeEventListener("change", handler)
  }
}

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") return false

  const stored = readSidebarCollapsed()
  if (stored !== null) return stored

  return window.matchMedia(PAYMENTS_HUB_NARROW_QUERY).matches
}

function getSidebarCollapsedServerSnapshot() {
  return false
}

export function usePaymentsHubSidebarCollapsed() {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot
  )

  const toggleCollapsed = useCallback(() => {
    writeSidebarCollapsed(!getSidebarCollapsedSnapshot())
  }, [])

  return { collapsed, toggleCollapsed }
}
