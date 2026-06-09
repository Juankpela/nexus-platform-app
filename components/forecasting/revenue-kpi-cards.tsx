import { ArrowDownRight, ArrowUpRight, DollarSign, Percent, Target, Timer, TrendingUp, Users } from "lucide-react"
import type { RevenueMetrics } from "@/modules/forecasting/domain/revenue-metrics"

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—"
  return `${n.toFixed(1)}%`
}

function fmtDays(n: number | null | undefined) {
  if (n == null) return "—"
  return `${Math.round(n)} días`
}

type KpiCardProps = {
  title:    string
  value:    string
  sub?:     string
  icon:     React.ReactNode
  accent:   "blue" | "emerald" | "orange" | "violet" | "slate" | "red"
  trend?:   "up" | "down" | "neutral"
}

const ACCENT = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/40",    icon: "text-blue-600 dark:text-blue-400",    border: "border-blue-200 dark:border-blue-800" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/40",  icon: "text-orange-600 dark:text-orange-400",  border: "border-orange-200 dark:border-orange-800" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/40",  icon: "text-violet-600 dark:text-violet-400",  border: "border-violet-200 dark:border-violet-800" },
  slate:   { bg: "bg-slate-50 dark:bg-slate-900/40",    icon: "text-slate-600 dark:text-slate-400",    border: "border-slate-200 dark:border-slate-700" },
  red:     { bg: "bg-red-50 dark:bg-red-950/40",        icon: "text-red-600 dark:text-red-400",        border: "border-red-200 dark:border-red-800" },
}

function KpiCard({ title, value, sub, icon, accent, trend }: KpiCardProps) {
  const a = ACCENT[accent]
  return (
    <div className={`rounded-xl border ${a.border} bg-card p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`rounded-lg p-2 ${a.bg}`}>
          <span className={`size-4 ${a.icon}`}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            {trend === "up"   && <ArrowUpRight   className="size-3 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight  className="size-3 text-red-500" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export function RevenueKpiCards({ metrics }: { metrics: RevenueMetrics }) {
  const winRateTrend = metrics.winRate >= 50 ? "up" : metrics.winRate >= 25 ? "neutral" : "down"

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      <KpiCard
        title="Revenue Esperado"
        value={fmt(metrics.expectedRevenue)}
        sub={`${metrics.openCount} oportunidades abiertas`}
        icon={<DollarSign className="size-4" />}
        accent="blue"
      />
      <KpiCard
        title="Revenue Ponderado"
        value={fmt(metrics.weightedRevenue)}
        sub="Weighted by probability"
        icon={<TrendingUp className="size-4" />}
        accent="violet"
      />
      <KpiCard
        title="Cerrado Ganado"
        value={fmt(metrics.closedWonRevenue)}
        sub={`${metrics.wonCount} deals ganados`}
        icon={<ArrowUpRight className="size-4" />}
        accent="emerald"
        trend="up"
      />
      <KpiCard
        title="Cerrado Perdido"
        value={fmt(metrics.closedLostRevenue)}
        sub={`${metrics.lostCount} deals perdidos`}
        icon={<ArrowDownRight className="size-4" />}
        accent="red"
        trend="down"
      />
      <KpiCard
        title="Win Rate"
        value={fmtPct(metrics.winRate)}
        sub={`${metrics.wonCount} / ${metrics.wonCount + metrics.lostCount} cerrados`}
        icon={<Percent className="size-4" />}
        accent={metrics.winRate >= 40 ? "emerald" : metrics.winRate >= 20 ? "orange" : "red"}
        trend={winRateTrend}
      />
      <KpiCard
        title="Ticket Promedio"
        value={fmt(metrics.avgDealSize)}
        sub="Promedio deals ganados"
        icon={<Target className="size-4" />}
        accent="orange"
      />
      <KpiCard
        title="Ciclo de Venta"
        value={fmtDays(metrics.avgSalesCycleDays)}
        sub="Promedio días hasta cierre"
        icon={<Timer className="size-4" />}
        accent="slate"
      />
      <KpiCard
        title="Deals Totales"
        value={String(metrics.totalCount)}
        sub={`${metrics.openCount} abiertos · ${metrics.wonCount + metrics.lostCount} cerrados`}
        icon={<Users className="size-4" />}
        accent="slate"
      />
    </div>
  )
}
