import { Building2, Clock, Navigation, TriangleAlert, Wrench } from "lucide-react"

import { EtaCountdown } from "@/components/service/eta-countdown"

/**
 * Cabecera operacional del trabajo (Worker Mobile V2): el contexto que el técnico
 * necesita SIEMPRE a la vista — WO, cliente, problema, tipo de daño, prioridad y
 * SLA. Solo lectura (el técnico no la muta). El SLA es una foto al cargar, no un
 * cronómetro vivo. Reutiliza tokens de marca; sin identidad propia.
 */

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
}

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
}

/** Cuenta atrás de SLA (foto al render). Devuelve etiqueta + tono de urgencia. */
function slaView(slaDueAt: string | null): { label: string; tone: string } | null {
  if (!slaDueAt) return null
  const diffMs = new Date(slaDueAt).getTime() - Date.now()
  if (Number.isNaN(diffMs)) return null
  if (diffMs <= 0) return { label: "SLA vencido", tone: "text-red-600 dark:text-red-400" }
  const mins = Math.round(diffMs / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const left = h > 0 ? `${h}h ${m}m` : `${m}m`
  const tone =
    mins <= 120
      ? "text-orange-600 dark:text-orange-400"
      : "text-muted-foreground"
  return { label: `SLA vence en ${left}`, tone }
}

export function WorkerOperationalHeader({
  workOrderNumber,
  companyName,
  subject,
  issueTypeLabel,
  priority,
  slaDueAt,
  enRoute = null,
}: {
  workOrderNumber: string | null
  companyName: string | null
  subject: string | null
  issueTypeLabel: string | null
  priority: string | null
  slaDueAt: string | null
  /**
   * ETA (FASE 3): cuando el técnico va en camino, esta línea muestra la cuenta
   * regresiva viva hacia la llegada estimada. `arrivalAtIso` alimenta el contador
   * de cliente (`EtaCountdown`); `etaLabel` es el texto estable de respaldo.
   */
  enRoute?: { etaLabel: string; arrivalLabel?: string | null; arrivalAtIso?: string | null } | null
}) {
  const sla = slaView(slaDueAt)
  const priorityTone = priority ? PRIORITY_TONE[priority] ?? "bg-muted text-muted-foreground" : null

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{workOrderNumber ?? "—"}</span>
        {priority ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityTone}`}>
            Prioridad {PRIORITY_LABEL[priority] ?? priority}
          </span>
        ) : null}
      </div>

      <h1 className="mt-1 text-lg font-semibold leading-tight tracking-tight text-foreground">
        {subject ?? "Trabajo de campo"}
      </h1>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="size-4 shrink-0" /> {companyName ?? "—"}
        </p>
        {issueTypeLabel ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Wrench className="size-4 shrink-0" /> {issueTypeLabel}
          </p>
        ) : null}
        {sla ? (
          <p className={`flex items-center gap-2 font-medium ${sla.tone}`}>
            {sla.tone.includes("red") || sla.tone.includes("orange") ? (
              <TriangleAlert className="size-4 shrink-0" />
            ) : (
              <Clock className="size-4 shrink-0" />
            )}
            {sla.label}
          </p>
        ) : null}
        {/* ETA (FASE 3): "En camino" + cuenta regresiva viva + llegada estimada. */}
        {enRoute ? (
          <p className="flex items-center gap-2 font-medium text-nexus-blue">
            <Navigation className="size-4 shrink-0" />
            <span>
              En camino ·{" "}
              {enRoute.arrivalAtIso ? (
                <EtaCountdown arrivalAt={enRoute.arrivalAtIso} fallback={enRoute.etaLabel} />
              ) : (
                enRoute.etaLabel
              )}
              {enRoute.arrivalLabel ? ` · llega ${enRoute.arrivalLabel}` : ""}
            </span>
          </p>
        ) : null}
      </div>
    </section>
  )
}
