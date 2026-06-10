"use client"

import { CalendarDays, Home, LogOut, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as React from "react"

import { NexusLogo } from "@/components/layout/nexus-logo"
import { logoutAction } from "@/modules/identity/presentation/actions"
import { cn } from "@/lib/utils"

const NAV = [
  { label: "Inicio", segment: "", icon: Home },
  { label: "Mi agenda", segment: "schedule", icon: CalendarDays },
  { label: "Perfil", segment: "profile", icon: User },
]

export function WorkerShell({
  tenantName,
  tenantSlug,
  children,
}: {
  tenantName: string
  tenantSlug: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const base = `/app/${tenantSlug}/worker`

  const isActive = (segment: string) => {
    const href = segment ? `${base}/${segment}` : base
    return segment ? pathname.startsWith(href) : pathname === base
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4">
        <Link href={base} className="flex items-center gap-2">
          <NexusLogo variant="icon" theme="light" className="h-7 w-auto" />
          <span className="text-sm font-semibold tracking-tight">Campo</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="max-w-32 truncate text-xs text-muted-foreground">
            {tenantName}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      {/* Bottom navigation (thumb-reachable) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md items-center justify-around border-t bg-background/95 px-2 py-2 backdrop-blur">
        {NAV.map((item) => {
          const href = item.segment ? `${base}/${item.segment}` : base
          const active = isActive(item.segment)
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-nexus-blue" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
