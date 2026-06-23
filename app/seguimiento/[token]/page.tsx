import { CalendarClock, Clock3, Navigation, TriangleAlert, UserCheck } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EtaCountdown } from "@/components/service/eta-countdown"
import { FieldMonitorLive } from "@/components/field-monitor/field-monitor-live"
import { LifecycleTimeline } from "@/components/service/lifecycle-timeline"
import { TrackingCustomerActions } from "@/components/service/tracking-customer-actions"
import { getPublicTracking } from "@/modules/service/composition"
import { formatWhen, type LifecycleMilestone } from "@/modules/service/domain/service-lifecycle"

export const metadata: Metadata = { title: "Seguimiento de tu solicitud" }
export const dynamic = "force-dynamic"

/**
 * R3 — señal anti-zombie: traduce el hito actual (o bloqueado) en un mensaje
 * humano de "qué estamos esperando", para que un hito vacío (ej. "Técnico
 * confirmó") no deje al cliente sin saber qué pasa. Reutiliza los estados de
 * `buildServiceLifecycle`; no consulta nada nuevo.
 */
const WAITING_BY_KEY: Record<string, string> = {
  coordinated: "Estamos coordinando tu visita. En breve te confirmamos el técnico y el horario.",
  accepted: "Esperando que el técnico confirme tu visita. Apenas confirme, te avisamos.",
  en_route: "Visita confirmada. Tu técnico saldrá pronto hacia el sitio.",
  on_site: "Tu técnico va en camino.",
  working: "Tu técnico llegó y está por iniciar el trabajo.",
  completed: "El trabajo está en curso.",
  invoiced: "Trabajo completado. Estamos preparando tu factura.",
  paid: "Trabajo facturado. Pendiente el cierre del pago.",
}

function waitingBanner(
  milestones: LifecycleMilestone[],
): { tone: "blue" | "amber" | "emerald"; text: string } | null {
  const blocked = milestones.find((m) => m.state === "blocked")
  if (blocked) {
    return {
      tone: "amber",
      text:
        blocked.detail ??
        "Hubo una novedad con tu visita. Estamos reorganizándola y te mantendremos al tanto.",
    }
  }
  const current = milestones.find((m) => m.state === "current")
  if (current) {
    return { tone: "blue", text: WAITING_BY_KEY[current.key] ?? "Tu solicitud está en proceso." }
  }
  const allDone = milestones.length > 0 && milestones.every((m) => m.state === "done")
  if (allDone) return { tone: "emerald", text: "¡Listo! Tu solicitud quedó completada. Gracias por confiar en nosotros." }
  return null
}

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
  const banner = waitingBanner(view.milestones)
  const bannerTone = banner
    ? {
        blue: "border-blue-500/25 bg-blue-500/[0.07] text-blue-700 dark:text-blue-300",
        amber: "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300",
        emerald: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300",
      }[banner.tone]
    : ""

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
            {view.workOrderNumber ? (
              <>
                Orden{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {view.workOrderNumber}
                </span>
                <span className="opacity-60"> · Folio {view.caseNumber}</span>
              </>
            ) : (
              <>
                Folio{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {view.caseNumber}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Contador de desplazamiento — el mismo dato que ve el admin: cuenta viva
            hacia la hora estimada de llegada mientras el técnico va en camino. */}
        {view.etaArrivalAt ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-500/25 bg-blue-500/[0.07] p-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Navigation className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tu técnico va en camino
              </p>
              <p className="text-sm font-semibold text-foreground">
                Llega en{" "}
                <EtaCountdown
                  arrivalAt={view.etaArrivalAt}
                  fallback={view.etaDurationMinutes ? `~${view.etaDurationMinutes} min` : "—"}
                />
              </p>
            </div>
          </div>
        ) : null}

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

        {/* R3 — qué estamos esperando ahora (no dejar hitos vacíos sin explicar) */}
        {banner ? (
          <div className={`mt-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm font-medium ${bannerTone}`}>
            {banner.tone === "amber" ? (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Clock3 className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{banner.text}</span>
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

        {/* Acciones del cliente: comentario al técnico + solicitar reagendar/cancelar. */}
        <TrackingCustomerActions token={token} />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Esta página se actualiza sola. Guárdala para seguir el avance · Coordinado con NEXUS
      </p>
    </main>
  )
}
