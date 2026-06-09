"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { NexusLogo } from "@/components/layout/nexus-logo"
import { cn } from "@/lib/utils"
import { hasPermission } from "@/modules/authorization/domain/permission"
import {
  NAVIGATION_GROUP_ORDER,
  workspaceNavigation,
  type NavigationItem,
} from "@/modules/platform/presentation/navigation"

export function AppSidebar({
  tenantName,
  tenantSlug,
  permissions,
}: {
  tenantName: string
  tenantSlug: string
  permissions: readonly string[]
}) {
  const pathname = usePathname()
  const items = workspaceNavigation.filter((item) =>
    hasPermission(permissions, item.permission),
  )
  const ungrouped = items.filter((item) => !item.group)

  const isActive = (segment: string) => {
    const href = `/app/${tenantSlug}/${segment}`
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const renderItem = (item: NavigationItem) => {
    const href = `/app/${tenantSlug}/${item.segment}`
    const active = isActive(item.segment)
    return (
      <Link
        key={item.segment}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        {active ? (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-nexus-blue" />
        ) : null}
        <item.icon
          className={cn(
            "size-4 transition-colors",
            active ? "text-nexus-blue" : "text-sidebar-foreground/60",
          )}
        />
        {item.label}
      </Link>
    )
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <Link
        href={`/app/${tenantSlug}/dashboard`}
        aria-label="Nexus — Where Operations Connect."
        className="flex h-[76px] items-center justify-center border-b border-sidebar-border bg-white px-4"
      >
        <NexusLogo variant="full" theme="light" className="h-14 w-auto object-contain" />
      </Link>

      <div className="px-4 pb-2 pt-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
          {tenantName}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {ungrouped.map(renderItem)}

        {NAVIGATION_GROUP_ORDER.map((group) => {
          const groupItems = items.filter((i) => i.group === group)
          if (groupItems.length === 0) return null
          const groupActive = groupItems.some((i) => isActive(i.segment))
          return (
            <NavGroup
              key={group}
              title={group}
              defaultOpen={groupActive}
              hasActive={groupActive}
            >
              {groupItems.map(renderItem)}
            </NavGroup>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3.5 text-[11px] text-sidebar-foreground/50">
        Where Operations Connect.
      </div>
    </aside>
  )
}

function NavGroup({
  title,
  defaultOpen,
  hasActive,
  children,
}: {
  title: string
  defaultOpen: boolean
  hasActive: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
          hasActive
            ? "text-sidebar-foreground/80"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80",
        )}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open ? "" : "-rotate-90")}
        />
      </button>
      {open ? <div className="mt-1 space-y-1">{children}</div> : null}
    </div>
  )
}
