"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { StageMetrics } from "@/modules/forecasting/domain/revenue-metrics"

const STAGE_COLORS: Record<string, string> = {
  new:         "#64748b",
  discovery:   "#0ea5e9",
  proposal:    "#6366f1",
  negotiation: "#f59e0b",
}

function fmtM(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function PipelineFunnelChart({ stages }: { stages: StageMetrics[] }) {
  const chartData = stages.map(s => ({
    label:    s.label,
    status:   s.status,
    count:    s.count,
    revenue:  s.revenue,
    weighted: s.weightedRevenue,
    fill:     STAGE_COLORS[s.status] ?? "#94a3b8",
  }))

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Pipeline por Etapa</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribución de oportunidades activas</p>

      {/* Bar chart — revenue by stage */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtM}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value, name) => [
              name === "count" ? `${value} deals` : `$${Number(value).toLocaleString("es-CO")} COP`,
              name === "count" ? "Cantidad" : name === "revenue" ? "Revenue" : "Ponderado",
            ]}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <rect key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stage summary rows */}
      <div className="mt-4 space-y-2">
        {stages.map(s => (
          <div key={s.status} className="flex items-center gap-3 text-sm">
            <span
              className="size-2.5 rounded-full flex-shrink-0"
              style={{ background: STAGE_COLORS[s.status] ?? "#94a3b8" }}
            />
            <span className="w-28 text-muted-foreground">{s.label}</span>
            <span className="font-medium tabular-nums">{s.count} deals</span>
            <span className="ml-auto text-muted-foreground tabular-nums">{fmtM(s.revenue)}</span>
            {s.conversionRate != null && (
              <span className="text-xs text-muted-foreground w-16 text-right">
                → {s.conversionRate.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
