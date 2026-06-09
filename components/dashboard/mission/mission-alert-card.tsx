import { AlertTriangle, ArrowRight, Info, XCircle } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import type { AttentionSeverity } from "@/modules/platform/presentation/mission-control"

const CONFIG: Record<
  AttentionSeverity,
  { icon: typeof XCircle; box: string; chip: string; iconColor: string }
> = {
  critical: {
    icon: XCircle,
    box: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    box: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    box: "border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    iconColor: "text-sky-500",
  },
}

/** A single "requires attention" tile: severity, count and a jump-to link. */
export function MissionAlertCard({
  label,
  count,
  severity,
  href,
}: {
  label: string
  count: number
  severity: AttentionSeverity
  href: string
}) {
  const cfg = CONFIG[severity]
  const Icon = cfg.icon
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-4 transition-transform hover:-translate-y-0.5",
        cfg.box,
      )}
    >
      <Icon className={cn("size-5 shrink-0", cfg.iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <span
          className={cn(
            "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
            cfg.chip,
          )}
        >
          {count}
        </span>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

/** Empty state when nothing needs attention. */
export function MissionAllClear() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        ✓
      </span>
      <p className="text-sm font-medium text-foreground">
        Todo en orden — no hay elementos que requieran atención inmediata.
      </p>
    </div>
  )
}
