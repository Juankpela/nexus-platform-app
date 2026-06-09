"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"

import { buildBreadcrumbs } from "@/modules/platform/presentation/breadcrumbs"

export function Breadcrumbs({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname, tenantSlug)
  if (crumbs.length <= 1) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/50 px-4 text-xs text-muted-foreground sm:px-6"
    >
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1
        return (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 ? (
              <ChevronRight className="size-3 text-muted-foreground/40" />
            ) : null}
            {crumb.href && !last ? (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-foreground" : undefined}>
                {crumb.label}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
