"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type DashTab = { label: string; href: string }

/**
 * Selector de pestañas del dashboard (Resumen / CRM / Servicio / Campo).
 * El Resumen (Inicio) da la vista global; cada pestaña profundiza. Solo
 * navegación: links existentes presentados como pestañas, con la activa marcada.
 */
export function DashboardTabs({ tabs }: { tabs: DashTab[] }) {
  const pathname = usePathname()
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "border-nexus-blue text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
