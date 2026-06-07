import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Accent = "blue" | "emerald" | "orange" | "silver"

const ACCENT: Record<Accent, string> = {
  blue: "bg-nexus-blue/10 text-nexus-blue",
  emerald: "bg-nexus-emerald/10 text-nexus-emerald",
  orange: "bg-nexus-orange/10 text-nexus-orange",
  silver: "bg-nexus-silver/10 text-nexus-silver",
}

/** Executive KPI tile. Presentational — value/trend are supplied by the caller. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  hint,
  trend,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  accent?: Accent
  hint?: string
  trend?: { value: string; positive?: boolean }
}) {
  return (
    <Card interactive className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            ACCENT[accent],
          )}
        >
          <Icon className="size-5" />
        </span>
        {trend ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.positive
                ? "bg-nexus-emerald/10 text-nexus-emerald"
                : "bg-nexus-orange/10 text-nexus-orange",
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>
      ) : null}
    </Card>
  )
}
