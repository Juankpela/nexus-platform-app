"use client"

import { AlertTriangle, ArrowRight, CheckCircle, Info, Lightbulb, Loader2, Sparkles, XCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { formatDateTime } from "@/lib/format/datetime"
import type { AiInsight, AiRevenueInsights } from "@/modules/forecasting/domain/ai-insight"
import { Button } from "@/components/ui/button"

const SEVERITY_CONFIG = {
  critical: {
    icon: XCircle,
    bg:   "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon_class: "text-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    bg:   "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon_class: "text-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  info: {
    icon: Info,
    bg:   "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    icon_class: "text-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  positive: {
    icon: CheckCircle,
    bg:   "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon_class: "text-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
}

function ScoreGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative size-14">
        <svg viewBox="0 0 36 36" className="size-14 -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="hsl(var(--muted))" strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${value}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {value}
        </span>
      </div>
    </div>
  )
}

function InsightCard({ insight, tenantSlug }: { insight: AiInsight; tenantSlug: string }) {
  const cfg = SEVERITY_CONFIG[insight.severity]
  const Icon = cfg.icon
  const oppHref = insight.opportunityId
    ? `/app/${tenantSlug}/opportunities/${insight.opportunityId}`
    : null

  return (
    <div className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`size-4 mt-0.5 flex-shrink-0 ${cfg.icon_class}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{insight.title}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${cfg.badge}`}>
              {insight.severity}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
          {insight.opportunityName && (
            <p className="mt-1 text-xs font-medium text-foreground">📋 {insight.opportunityName}</p>
          )}
          {insight.estimatedImpact != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Impacto estimado: <span className="font-semibold text-foreground">${insight.estimatedImpact.toLocaleString("es-CO")} COP</span>
            </p>
          )}
          {oppHref && (
            <Button asChild variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1">
              <Link href={oppHref}>
                {insight.actionLabel ?? "Ver oportunidad"}
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

type Props = {
  tenantSlug: string
  initialInsights?: AiRevenueInsights | null
}

export function AiInsightsPanel({ tenantSlug, initialInsights }: Props) {
  const [insights, setInsights] = useState<AiRevenueInsights | null>(initialInsights ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/app/${tenantSlug}/api/forecasting/ai-insights`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Error generando insights (${res.status})`)
      }
      const data = await res.json() as AiRevenueInsights
      setInsights(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-100 dark:bg-violet-900/40 p-1.5">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Revenue Insights</h3>
            <p className="text-xs text-muted-foreground">Análisis inteligente del pipeline · Claude</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={loading}
          className="gap-1.5"
        >
          {loading
            ? <><Loader2 className="size-3.5 animate-spin" /> Analizando...</>
            : <><Sparkles className="size-3.5" /> {insights ? "Regenerar" : "Analizar Pipeline"}</>
          }
        </Button>
      </div>

      <div className="p-5">
        {!insights && !loading && !error && (
          <div className="py-8 text-center">
            <Lightbulb className="size-8 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">Sin análisis generado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Haz clic en &quot;Analizar Pipeline&quot; para obtener insights de IA sobre tu pipeline.
            </p>
          </div>
        )}

        {loading && (
          <div className="py-8 text-center">
            <Loader2 className="size-6 mx-auto animate-spin text-violet-500 mb-3" />
            <p className="text-sm text-muted-foreground">Claude está analizando tu pipeline...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {insights && !loading && (
          <div className="space-y-4">
            {/* Scores */}
            <div className="flex items-center justify-center gap-8 py-2">
              <ScoreGauge label="Forecast Score" value={insights.forecastScore} color="#2563eb" />
              <div className="text-center px-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {formatDateTime(insights.generatedAt, { year: undefined })}
                </p>
                <p className="text-xs text-muted-foreground">{insights.insights.length} insights</p>
              </div>
              <ScoreGauge label="Risk Score" value={insights.riskScore} color="#ef4444" />
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-foreground leading-relaxed">
              {insights.summary}
            </div>

            {/* Insights */}
            <div className="space-y-2">
              {insights.insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} tenantSlug={tenantSlug} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
