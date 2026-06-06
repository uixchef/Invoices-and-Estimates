"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Input } from "@/components/highrise/input-text"
import { Separator } from "@/components/ui/separator"
import {
  getSidebarNavHref,
  isSidebarNavItemActive,
  navGroupAfterPayments,
  navGroupBeforePayments,
} from "@/lib/payment-hub-sidebar-nav"
import { usePaymentsHubSidebarCollapsed } from "@/lib/payment-hub-sidebar"
import { cn } from "@/lib/utils"

const ICON = "/icons/sidebar"

function SidebarNavIcon({ file, active }: { file: string; active?: boolean }) {
  return (
    <Image
      src={`${ICON}/${file}`}
      alt=""
      width={24}
      height={24}
      unoptimized
      className={cn(
        "size-6 shrink-0 object-contain",
        active && "brightness-0 invert"
      )}
      aria-hidden
    />
  )
}

function NavRow({
  label,
  iconFile,
  href,
  active,
  collapsed,
}: {
  label: string
  iconFile: string
  href: string
  active?: boolean
  collapsed: boolean
}) {
  const className = cn(
    "flex w-full items-center gap-2 rounded-[8px] text-base font-medium leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    collapsed ? "h-10 shrink-0 justify-center p-2" : "p-2",
    active
      ? "bg-[#1d2939] text-white"
      : "text-[#d0d5dd] hover:bg-white/5 hover:text-white"
  )

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        title={collapsed ? label : undefined}
        className={className}
      >
        <SidebarNavIcon file={iconFile} active={active} />
        {collapsed ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate">{label}</span>
        )}
      </a>
    )
  }

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      <SidebarNavIcon file={iconFile} active={active} />
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggleCollapsed } = usePaymentsHubSidebarCollapsed()

  return (
    <aside
      className={cn(
        "relative shrink-0 overflow-visible transition-[width] duration-200 ease-out",
        collapsed ? "w-[56px] max-w-[56px]" : "w-[280px] max-w-[280px]"
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "flex h-screen flex-col gap-[20px] bg-[#101828] px-2 py-4 text-[#d0d5dd]",
          collapsed && "items-center"
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4",
            collapsed && "w-full items-center"
          )}
        >
          <div
            className={cn(
              "flex shrink-0 flex-col gap-2",
              collapsed && "w-full items-center"
            )}
          >
            <div
              className={cn(
                "flex h-10 items-center justify-center",
                collapsed ? "w-full max-w-[40px]" : "w-full"
              )}
            >
              <Image
                src="/payment-hub-logo.png"
                alt="Brand logo"
                width={160}
                height={40}
                unoptimized
                className={cn(
                  "h-10 w-auto max-w-full object-contain object-center",
                  collapsed && "max-h-10 max-w-[40px]"
                )}
                priority
              />
            </div>

            {collapsed ? (
              <button
                type="button"
                className="flex w-full max-w-[40px] items-center justify-center rounded-[8px] bg-[#344054] p-2 hover:bg-[#344054]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Switch subaccount"
              >
                <Image
                  src={`${ICON}/chevron-right.svg`}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 shrink-0"
                  aria-hidden
                />
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[8px] bg-[#344054] p-2 text-left text-sm font-medium leading-none text-white hover:bg-[#344054]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <span className="min-w-0 flex-1 truncate opacity-[0.71]">
                  Headquarters 1800-PLUMBER-200..
                </span>
                <Image
                  src={`${ICON}/chevron-right.svg`}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 shrink-0"
                  aria-hidden
                />
              </button>
            )}
          </div>

          {collapsed ? (
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                className="flex w-full items-center justify-center rounded-[8px] border border-[#344054] p-1 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Search"
              >
                <Image
                  src={`${ICON}/search-md.svg`}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 shrink-0"
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center rounded-[8px] bg-[#344054] px-[11px] py-1.5 hover:bg-[#3d4a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Quick actions"
              >
                <Image
                  src={`${ICON}/icon_quickact.svg`}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="size-5"
                  aria-hidden
                />
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 gap-2">
              <div className="flex min-h-9 min-w-0 flex-1 items-center justify-between rounded-[8px] border border-[#344054] py-1 pl-2 pr-1">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Image
                    src={`${ICON}/search-md.svg`}
                    alt=""
                    width={16}
                    height={16}
                    unoptimized
                    className="size-4 shrink-0"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Search"
                    aria-label="Search"
                    className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-base leading-6 text-white placeholder:text-[#98a2b3] focus-visible:ring-0"
                  />
                </div>
                <kbd className="shrink-0 rounded border border-[#344054] bg-[#344054] px-1 py-0.5 text-xs font-normal leading-5 text-[#d0d5dd]">
                  ⌘K
                </kbd>
              </div>
              <button
                type="button"
                className="flex shrink-0 items-center justify-center rounded-[8px] bg-[#344054] px-[11px] py-1.5 hover:bg-[#3d4a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Quick actions"
              >
                <Image
                  src={`${ICON}/icon_quickact.svg`}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="size-5"
                  aria-hidden
                />
              </button>
            </div>
          )}

          <nav
            className={cn(
              "flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden",
              collapsed && "items-center"
            )}
            aria-label="Product areas"
          >
            <div
              className={cn(
                "flex w-full flex-col gap-1",
                collapsed && "items-center"
              )}
            >
              {navGroupBeforePayments.map((item) => (
                <NavRow
                  key={item.label}
                  label={item.label}
                  iconFile={item.file}
                  href={getSidebarNavHref(item.label)}
                  active={isSidebarNavItemActive(pathname, item.label)}
                  collapsed={collapsed}
                />
              ))}
            </div>

            <Separator
              className={cn(
                "bg-[#eaecf0]",
                collapsed && "h-px w-10 shrink-0 self-center"
              )}
            />

            <div
              className={cn(
                "flex w-full flex-col gap-1",
                collapsed && "items-center"
              )}
            >
              {navGroupAfterPayments.map((item) => (
                <NavRow
                  key={item.label}
                  label={item.label}
                  iconFile={item.file}
                  href={getSidebarNavHref(item.label)}
                  active={isSidebarNavItemActive(pathname, item.label)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </nav>
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col gap-2",
            collapsed && "w-full items-center"
          )}
        >
          <Separator
            className={cn(
              "bg-[#eaecf0]",
              collapsed ? "h-px w-10 self-center" : "w-full"
            )}
          />
          <NavRow
            label="Settings"
            iconFile="settings-01.svg"
            href={getSidebarNavHref("Settings")}
            active={isSidebarNavItemActive(pathname, "Settings")}
            collapsed={collapsed}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute bottom-6 -right-3 flex size-6 items-center justify-center overflow-hidden rounded-xl border-0 bg-[#73e2a3] p-0 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_1px_2px_rgba(16,24,40,0.06)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]"
      >
        <Image
          src={`${ICON}/chevron-left.svg`}
          alt=""
          width={16}
          height={16}
          unoptimized
          className={cn(
            "block size-4 transition-transform duration-200",
            collapsed && "rotate-180"
          )}
        />
      </button>
    </aside>
  )
}
