"use client"

import {
  CalendarClock,
  ClipboardList,
  HardHat,
  LifeBuoy,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NexusLogo } from "@/components/layout/nexus-logo"
import { cn } from "@/lib/utils"
import { hasPermission } from "@/modules/authorization/domain/permission"
import { workspaceNavigation } from "@/modules/platform/presentation/navigation"

// Visual-only preview of the upcoming operational modules (Field Service line).
// No routes yet — these communicate the product roadmap inside the UI.
const FUTURE_MODULES: { label: string; icon: LucideIcon }[] = [
  { label: "Assets", icon: Wrench },
  { label: "Cases", icon: LifeBuoy },
  { label: "Work Orders", icon: ClipboardList },
  { label: "Technicians", icon: HardHat },
  { label: "Scheduling", icon: CalendarClock },
]

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
  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!item.group) return acc
    ;(acc[item.group] ??= []).push(item)
    return acc
  }, {})

  const renderItem = (item: (typeof items)[number]) => {
    const href = `/app/${tenantSlug}/${item.segment}`
    const active = pathname === href
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
    <aside className="sidebar-gradient hidden w-64 shrink-0 flex-col text-sidebar-foreground md:flex">
      <Link
        href={`/app/${tenantSlug}/dashboard`}
        aria-label="Nexus — Where Operations Connect."
        className="flex h-[76px] items-center justify-center border-b border-white/10 bg-white px-4"
      >
        <NexusLogo
          variant="full"
          theme="light"
          className="h-14 w-auto object-contain"
        />
      </Link>

      <div className="px-4 pb-2 pt-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
          {tenantName}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {ungrouped.map(renderItem)}
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group} className="pt-5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
              {group}
            </p>
            <div className="space-y-1">{groupItems.map(renderItem)}</div>
          </div>
        ))}

        <div className="pt-6">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
            Operations
          </p>
          <div className="space-y-1">
            {FUTURE_MODULES.map((mod) => (
              <div
                key={mod.label}
                aria-disabled
                title="Coming soon"
                className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/35"
              >
                <mod.icon className="size-4" />
                <span className="flex-1">{mod.label}</span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 px-5 py-3.5 text-[11px] text-sidebar-foreground/50">
        Where Operations Connect.
      </div>
    </aside>
  )
}
