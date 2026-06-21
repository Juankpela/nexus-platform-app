import { CalendarClock, UserCheck } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { FieldMonitorLive } from "@/components/field-monitor/field-monitor-live"
import { LifecycleTimeline } from "@/components/service/lifecycle-timeline"
import { getPublicTracking } from "@/modules/service/composition"
import { formatWhen } from "@/modules/service/domain/service-lifecycle"

export const metadata: Metadata = { title: "Seguimiento de tu solicitud" }
export const dynamic = "force-dynamic"

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const view = await getPublicTracking(token)
  if (!view) notFound()

  // Marca de tiempo del render (la página es force-dynamic: se genera en cada
  // visita). El indicador en vivo refresca por broadcast + red de 30s.
  const generatedAt = new Date().toISOString()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        {/* Encabezado */}
        <div className="border-b pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {view.tenantName} · Seguimiento
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight text-foreground">
            {view.subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Folio <span className="font-medium tabular-nums text-foreground">{view.caseNumber}</span>
          </p>
        </div>

        {/* Lo que Nexus coordinó (técnico + horario) */}
        {view.technicianName || view.scheduledStart ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {view.technicianName ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Técnico asignado
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {view.technicianName}
                  </p>
                </div>
              </div>
            ) : null}
            {view.scheduledStart ? (
              <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <CalendarClock className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Visita agendada
                  </p>
                  <p className="truncate text-sm font-semibold capitalize text-foreground">
                    {formatWhen(view.scheduledStart)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Línea de vida */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Estado de tu solicitud</p>
            {/* Reutiliza el indicador del Monitor de Campo: broadcast + red de 30s. */}
            <FieldMonitorLive
              tenantId={view.tenantId}
              generatedAt={generatedAt}
              connectedLabel="Actualización en vivo"
              connectingLabel="Actualización automática"
              showClock={false}
            />
          </div>
          <LifecycleTimeline milestones={view.milestones} />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Esta página se actualiza sola. Guárdala para seguir el avance · Coordinado con NEXUS
      </p>
    </main>
  )
}
