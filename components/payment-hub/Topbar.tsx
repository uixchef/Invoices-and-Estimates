"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { InvoiceLayoutHeader } from "@/components/invoices/invoice-layout-header"
import { MediumsHeader } from "@/components/invoices/mediums-header"
import {
  Bell,
  ChevronDown,
  HelpCircle,
  Megaphone,
  Phone,
} from "lucide-react"
import {
  PAYMENTS_HUB_DEFAULTS,
  resolvePaymentsHubNavUrls,
  type PaymentsHubNavUrls,
} from "@/lib/payment-hub-nav"
import { cn } from "@/lib/utils"

const primaryTabs = [
  {
    id: "overview",
    label: "Overview",
    target: "overview" as const,
  },
  {
    id: "invoices",
    label: "Invoices & estimates",
    internalHref: "/invoices",
    trailingChevron: true,
  },
  { id: "docs", label: "Docs & contracts" },
  { id: "subscriptions", label: "Subscriptions", target: "subscriptions" as const },
  { id: "products", label: "Products" },
  { id: "integrations", label: "Integrations", target: "integrations" as const },
] as const

function primaryTabClassName(isActive: boolean, hasTrailingIcon = false) {
  return cn(
    "inline-flex h-10 shrink-0 items-center border-b-2 px-2 text-base leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40",
    hasTrailingIcon && "gap-1",
    isActive
      ? "border-[#004eeb] font-semibold text-[#004eeb]"
      : "border-transparent font-medium text-[#667085] hover:text-[#101828]"
  )
}

function getActiveTabId(pathname: string): (typeof primaryTabs)[number]["id"] {
  if (pathname === "/invoices" || pathname.startsWith("/invoices/")) {
    return "invoices"
  }

  return "overview"
}

export function Topbar() {
  const pathname = usePathname()
  const activeTabId = getActiveTabId(pathname)
  const [navUrls, setNavUrls] = useState<PaymentsHubNavUrls>({
    overview: PAYMENTS_HUB_DEFAULTS.overview,
    subscriptions: PAYMENTS_HUB_DEFAULTS.subscriptions,
    integrations: PAYMENTS_HUB_DEFAULTS.integrations,
  })

  useEffect(() => {
    setNavUrls(resolvePaymentsHubNavUrls("invoices"))
  }, [pathname])

  return (
    <header className="w-full min-w-0 bg-white">
      <div className="flex w-full min-w-0 flex-col gap-0">
        <div className="relative border-b border-[#d0d5dd] bg-white">
          <div className="flex w-full flex-col gap-3 px-4 py-2 md:h-10 md:flex-row md:items-stretch md:justify-between md:gap-12 md:py-0">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <h1 className="shrink-0 text-xl font-semibold leading-[30px] tracking-normal text-[#101828]">
                Payments
              </h1>
              <nav
                className="flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Payments sections"
              >
                {primaryTabs.map((tab) => {
                  const isActive = tab.id === activeTabId
                  const showTrailingChevron =
                    "trailingChevron" in tab && tab.trailingChevron === true
                  const label = (
                    <span className="whitespace-nowrap">{tab.label}</span>
                  )
                  const trailingIcon = showTrailingChevron ? (
                    <ChevronDown
                      className="size-4 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null

                  if ("internalHref" in tab && tab.internalHref) {
                    return (
                      <Link
                        key={tab.id}
                        href={tab.internalHref}
                        aria-current={isActive ? "page" : undefined}
                        className={primaryTabClassName(
                          isActive,
                          showTrailingChevron
                        )}
                      >
                        {label}
                        {trailingIcon}
                      </Link>
                    )
                  }

                  if ("target" in tab && tab.target) {
                    return (
                      <a
                        key={tab.id}
                        href={navUrls[tab.target]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={primaryTabClassName(
                          isActive,
                          showTrailingChevron
                        )}
                      >
                        {label}
                        {trailingIcon}
                      </a>
                    )
                  }

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={primaryTabClassName(
                        isActive,
                        showTrailingChevron
                      )}
                    >
                      {label}
                      {trailingIcon}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div
              className="flex h-full shrink-0 items-center gap-3"
              aria-label="Global header actions"
            >
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg p-1.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                aria-label="Phone"
              >
                <span className="relative flex size-5 items-center justify-center rounded-full bg-[#34d399]">
                  <Phone className="size-3 text-white" strokeWidth={2} />
                </span>
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg p-1.5 text-[#667085] hover:bg-slate-50 hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                aria-label="Announcements"
              >
                <Megaphone className="size-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg p-1.5 text-[#667085] hover:bg-slate-50 hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                aria-label="Help"
              >
                <HelpCircle className="size-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="relative flex size-8 items-center justify-center rounded-lg p-1.5 text-[#667085] hover:bg-slate-50 hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/40"
                aria-label="Notifications"
              >
                <Bell className="size-5" strokeWidth={2} />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#f56565]" />
              </button>
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d9d6fe] text-sm font-medium leading-5 text-[#475467]"
                aria-hidden
              >
                SG
              </div>
            </div>
          </div>
        </div>

        {pathname.startsWith("/invoices/mediums") ? (
          <MediumsHeader />
        ) : (
          <InvoiceLayoutHeader />
        )}
      </div>
    </header>
  )
}
