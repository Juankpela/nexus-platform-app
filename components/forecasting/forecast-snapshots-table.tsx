import type { ForecastSnapshot } from "@/modules/forecasting/domain/forecast-snapshot"

function fmt(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

const PERIOD_LABELS: Record<string, string> = {
  month:   "Mes",
  quarter: "Trimestre",
  year:    "Año",
}

export function ForecastSnapshotsTable({ snapshots }: { snapshots: ForecastSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">Sin snapshots guardados</p>
        <p className="text-xs text-muted-foreground mt-1">
          Toma un snapshot desde el Dashboard para guardar el estado actual del forecast.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold">Historial de Snapshots</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Comparativa del forecast en el tiempo</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Período</th>
              <th className="px-4 py-3 text-right font-medium">Esperado</th>
              <th className="px-4 py-3 text-right font-medium">Ponderado</th>
              <th className="px-4 py-3 text-right font-medium">Ganado</th>
              <th className="px-4 py-3 text-right font-medium">Win Rate</th>
              <th className="px-4 py-3 text-right font-medium">Deals</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {snapshots.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.snapshotDate)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{PERIOD_LABELS[s.periodType]}</span>
                    <span className="font-mono text-xs font-medium text-foreground">{s.periodLabel}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{fmt(s.expectedRevenue)}</td>
                <td className="px-4 py-3 text-right text-violet-600 dark:text-violet-400 tabular-nums">{fmt(s.weightedRevenue)}</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(s.closedWonRevenue)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.winRate >= 50 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : s.winRate >= 25 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}>
                    {s.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {s.openCount + s.wonCount + s.lostCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
