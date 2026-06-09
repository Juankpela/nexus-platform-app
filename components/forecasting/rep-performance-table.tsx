import type { RepPerformance } from "@/modules/forecasting/domain/revenue-metrics"

function fmt(n: number | null) {
  if (n == null) return "—"
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function WinRateBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 50 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    : rate >= 25 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {rate.toFixed(1)}%
    </span>
  )
}

export function RepPerformanceTable({ reps }: { reps: RepPerformance[] }) {
  if (reps.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Sin datos de vendedores para el período seleccionado.
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold">Performance por Vendedor</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Revenue ganado · Win rate · Pipeline activo</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Vendedor</th>
              <th className="px-4 py-3 text-right font-medium">Revenue Ganado</th>
              <th className="px-4 py-3 text-right font-medium">Win Rate</th>
              <th className="px-4 py-3 text-right font-medium">Ticket Prom.</th>
              <th className="px-4 py-3 text-right font-medium">Ganados</th>
              <th className="px-4 py-3 text-right font-medium">Abiertos</th>
              <th className="px-4 py-3 text-right font-medium">Perdidos</th>
              <th className="px-4 py-3 text-right font-medium">Pipeline</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reps.map((rep, i) => (
              <tr key={rep.ownerId} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                <td className="px-4 py-3 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="size-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {rep.ownerName.charAt(0).toUpperCase()}
                    </span>
                    {rep.ownerName}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmt(rep.revenueWon)}
                </td>
                <td className="px-4 py-3 text-right">
                  <WinRateBadge rate={rep.winRate} />
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmt(rep.avgDealSize)}</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">{rep.wonCount}</td>
                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 tabular-nums">{rep.openCount}</td>
                <td className="px-4 py-3 text-right text-red-500 dark:text-red-400 tabular-nums">{rep.lostCount}</td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmt(rep.weightedRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
