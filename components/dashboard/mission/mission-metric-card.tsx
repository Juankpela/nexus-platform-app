import type { LucideIcon } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export type MissionAccent = "blue" | "emerald" | "orange" | "silver" | "violet"

const ACCENT: Record<MissionAccent, string> = {
  blue: "text-nexus-blue bg-nexus-blue/10",
  emerald: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  orange: "text-orange-600 bg-orange-500/10 dark:text-orange-400",
  silver: "text-slate-500 bg-slate-500/10 dark:text-slate-300",
  violet: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
}

/** Compact, scannable KPI tile. Becomes a link when `href` is provided. */
export function MissionMetricCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  hint,
  href,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  accent?: MissionAccent
  hint?: string
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-7 place-items-center rounded-lg", ACCENT[accent])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </>
  )

  const className = cn(
    "rounded-xl border bg-card p-4 transition-colors",
    href && "hover:border-primary/40",
  )

  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  )
}
