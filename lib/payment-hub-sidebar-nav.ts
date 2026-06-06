/**
 * Sidebar route + active-state wiring for the Invoice Layouts Payment Hub app.
 */

export type SidebarNavItem = {
  label: string
  file: string
}

export const navGroupBeforePayments: SidebarNavItem[] = [
  { label: "Launchpad", file: "arrow-circle-up.svg" },
  { label: "Dashboard", file: "layout-alt-04.svg" },
  { label: "Conversations", file: "message-circle-02.svg" },
  { label: "Calendars", file: "calendar.svg" },
  { label: "Contacts", file: "user-square.svg" },
  { label: "Opportunities", file: "custom-opportunities.svg" },
  { label: "Payments", file: "credit-card-02.svg" },
]

export const navGroupAfterPayments: SidebarNavItem[] = [
  { label: "Marketing", file: "send-03.svg" },
  { label: "Automation", file: "repeat-03.svg" },
  { label: "Sites", file: "globe-06.svg" },
  { label: "Memberships", file: "memberships.svg" },
  { label: "Media storage", file: "photo_size_select_actual.svg" },
  { label: "Reputation", file: "star-01.svg" },
  { label: "Reporting", file: "line-chart-up-02.svg" },
  { label: "App marketplace", file: "grid-01.svg" },
  { label: "Mobile app", file: "tablet_mac.svg" },
]

const PAYMENTS_ROUTE_PREFIX = "/invoices"

export function getSidebarNavHref(label: string): string {
  if (label === "Payments") {
    return PAYMENTS_ROUTE_PREFIX
  }

  return "#"
}

export function isSidebarNavItemActive(pathname: string, label: string): boolean {
  if (label === "Payments") {
    return (
      pathname === PAYMENTS_ROUTE_PREFIX ||
      pathname.startsWith(`${PAYMENTS_ROUTE_PREFIX}/`)
    )
  }

  return false
}
