"use client"

import { Boxes } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { hasPermission } from "@/modules/authorization/domain/permission"
import { workspaceNavigation } from "@/modules/platform/presentation/navigation"

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

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Boxes className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">Nexus</span>
      </div>
      <div className="px-3 py-4">
        <p className="truncate px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tenantName}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const href = `/app/${tenantSlug}/${item.segment}`
          const active = pathname === href
          return (
            <Link
              key={item.segment}
              href={href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        Enterprise workspace
      </div>
    </aside>
  )
}
