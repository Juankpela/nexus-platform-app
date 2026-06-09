import { Camera, TrendingUp } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AiInsightsPanel } from "@/components/forecasting/ai-insights-panel"
import { ForecastSnapshotsTable } from "@/components/forecasting/forecast-snapshots-table"
import { PipelineFunnelChart } from "@/components/forecasting/pipeline-funnel-chart"
import { RepPerformanceTable } from "@/components/forecasting/rep-performance-table"
import { RevenueKpiCards } from "@/components/forecasting/revenue-kpi-cards"
import { RevenueTrendChart } from "@/components/forecasting/revenue-trend-chart"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FORECASTING_PERMISSIONS, hasPermission } from "@/modules/authorization/domain/permission"
import {
  getTenantPipelineAnalytics,
  getTenantRepPerformance,
  getTenantRevenueMetrics,
  getTenantRevenueTrend,
  listTenantForecastSnapshots,
} from "@/modules/forecasting/composition"
import type { ForecastPeriod } from "@/modules/forecasting/domain/revenue-metrics"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Forecasting" }

const VALID_TABS = ["overview", "pipeline", "snapshots"] as const
type Tab = (typeof VALID_TABS)[number]

const VALID_PERIODS: ForecastPeriod[] = ["this_month", "this_quarter", "this_year", "all_time"]

const PERIOD_LABELS: Record<ForecastPeriod, string> = {
  this_month:   "Este mes",
  this_quarter: "Este trimestre",
  this_year:    "Este año",
  all_time:     "Todo",
}

function parseTab(v?: string): Tab {
  return (VALID_TABS as readonly string[]).includes(v ?? "") ? (v as Tab) : "overview"
}

function parsePeriod(v?: string): ForecastPeriod {
  return VALID_PERIODS.includes(v as ForecastPeriod) ? (v as ForecastPeriod) : "this_quarter"
}

export default async function ForecastingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ tab?: string; period?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)

  requirePermission(context.effectivePermissions, FORECASTING_PERMISSIONS.read)

  const canWrite = hasPermission(context.effectivePermissions, FORECASTING_PERMISSIONS.write)

  const tab    = parseTab(sp.tab)
  const period = parsePeriod(sp.period)

  const basePath = `/app/${tenantSlug}/forecasting`

  function tabHref(t: Tab) {
    const p = new URLSearchParams()
    p.set("tab", t)
    p.set("period", period)
    return `${basePath}?${p.toString()}`
  }

  function periodHref(per: ForecastPeriod) {
    const p = new URLSearchParams()
    p.set("tab", tab)
    p.set("period", per)
    return `${basePath}?${p.toString()}`
  }

  // Fetch data in parallel
  const [metrics, stages, reps, trend, snapshots] = await Promise.all([
    getTenantRevenueMetrics(context.tenantId, period),
    getTenantPipelineAnalytics(context.tenantId),
    getTenantRepPerformance(context.tenantId, period),
    getTenantRevenueTrend(context.tenantId),
    listTenantForecastSnapshots(context.tenantId, 20),
  ])

  const tabClass = (t: Tab) =>
    cn(
      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      tab === t
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    )

  return (
    <>
      <PageHeader
        title="Forecasting"
        description="Análisis de revenue y performance del pipeline de ventas."
      />

      <div className="space-y-6 px-5 py-6 sm:px-8">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Link href={tabHref("overview")}  className={tabClass("overview")}>
              <TrendingUp className="size-3.5" /> Overview
            </Link>
            <Link href={tabHref("pipeline")}  className={tabClass("pipeline")}>
              Pipeline
            </Link>
            <Link href={tabHref("snapshots")} className={tabClass("snapshots")}>
              Snapshots
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period filter */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
              {VALID_PERIODS.map(p => (
                <Link key={p} href={periodHref(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    period === p
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PERIOD_LABELS[p]}
                </Link>
              ))}
            </div>

            {/* Snapshot button */}
            {canWrite && (
              <form action={`/api/${tenantSlug}/forecasting/snapshot`} method="POST">
                <input type="hidden" name="period" value={period} />
                <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                  <Camera className="size-3.5" /> Guardar snapshot
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <RevenueKpiCards metrics={metrics} />
            <div className="grid gap-5 lg:grid-cols-2">
              <RevenueTrendChart data={trend} />
              <AiInsightsPanel tenantSlug={tenantSlug} />
            </div>
          </div>
        )}

        {/* ── Pipeline Tab ── */}
        {tab === "pipeline" && (
          <div className="space-y-6">
            <PipelineFunnelChart stages={stages} />
            <RepPerformanceTable reps={reps} />
          </div>
        )}

        {/* ── Snapshots Tab ── */}
        {tab === "snapshots" && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Estado actual del forecast</h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                Período: <strong>{PERIOD_LABELS[period]}</strong>
              </p>
              <RevenueKpiCards metrics={metrics} />
            </div>
            <ForecastSnapshotsTable snapshots={snapshots} />
          </div>
        )}

      </div>
    </>
  )
}
