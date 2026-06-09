import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type * as React from "react"

/** A titled dashboard band with an optional "see all" link. */
export function MissionSection({
  title,
  description,
  href,
  hrefLabel = "Ver todo",
  children,
}: {
  title: string
  description?: string
  href?: string
  hrefLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {hrefLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}
