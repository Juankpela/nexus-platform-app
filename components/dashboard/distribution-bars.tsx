import type { LucideIcon } from "lucide-react"

type Tone = "blue" | "emerald" | "orange" | "silver" | "red"

const BAR: Record<Tone, string> = {
  blue: "bg-nexus-blue",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  silver: "bg-muted-foreground/40",
  red: "bg-red-500",
}

export type DistRow = { label: string; value: number; tone?: Tone }

/**
 * Barras de distribución proporcionales (reutilizable). Reemplaza las listas
 * planas de dos columnas por una lectura visual del peso de cada categoría.
 * Solo presentación: recibe filas ya calculadas (sin consultas).
 */
export function DistributionBars({
  title,
  icon: Icon,
  rows,
  format,
}: {
  title: string
  icon?: LucideIcon
  rows: DistRow[]
  /** Formateador opcional del valor mostrado (p. ej. dinero). El % usa el crudo. */
  format?: (value: number) => string
}) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        {Icon ? (
          <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue">
            <Icon className="size-4" />
          </span>
        ) : null}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">{total} en total</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.value / total) * 100) : 0
          return (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 truncate text-muted-foreground">{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${BAR[r.tone ?? "blue"]}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right tabular-nums font-medium text-foreground">
                {format ? format(r.value) : r.value} <span className="text-muted-foreground">·{pct}%</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
