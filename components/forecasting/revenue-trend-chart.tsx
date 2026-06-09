"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { RevenueTrendPoint } from "@/modules/forecasting/domain/revenue-metrics"

function fmtAxis(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function fmtFull(n: number) {
  return `$${n.toLocaleString("es-CO")} COP`
}

export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Trend — {new Date().getFullYear()}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradWeighted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtAxis}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value, name) => [
              fmtFull(Number(value)),
              name === "expectedRevenue" ? "Esperado"
                : name === "weightedRevenue" ? "Ponderado"
                : "Ganado",
            ]}
          />
          <Area type="monotone" dataKey="expectedRevenue"  stroke="#2563eb" fill="url(#gradExpected)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="weightedRevenue"  stroke="#8b5cf6" fill="url(#gradWeighted)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="closedWon"        stroke="#10b981" fill="url(#gradWon)"      strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-500" />Esperado</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-500" />Ponderado</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" />Ganado</span>
      </div>
    </div>
  )
}
