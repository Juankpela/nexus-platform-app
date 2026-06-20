import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import type { LifecycleMilestone } from "@/modules/service/domain/service-lifecycle"

/**
 * Tarjeta de "Operación activa" — Nexus está coordinando esto ahora. El ribbon de
 * hitos se deriva de la MISMA línea de vida canónica (`buildServiceLifecycle`) que
 * usan el seguimiento público y el detalle de WO — sin estados simulados ni
 * hardcode. Aquí se muestra en forma compacta (horizontal).
 */

export type ActiveOperationView = {
  technicianName: string
  workOrderNumber: string | null
  workOrderSubject: string | null
  companyName: string | null
  priority: string | null
  executionStatus: ExecutionStatus
}

// Etiquetas cortas para el ribbon compacto (la línea de vida completa vive en la WO).
const SHORT_LABEL: Record<string, string> = {
  reported: "Solicitud",
  coordinated: "Coordinado",
  accepted: "Aceptó",
  en_route: "En camino",
  on_site: "En sitio",
  working: "Ejecutando",
  completed: "Completado",
  invoiced: "Factura",
  paid: "Pago",
}

function dotTone(state: LifecycleMilestone["state"], key: string): { dot: string; text: string } {
  if (state === "done") return { dot: "bg-emerald-400", text: "text-emerald-400" }
  if (state === "blocked") return { dot: "bg-amber-400", text: "text-amber-500 dark:text-amber-400" }
  if (state === "current") {
    const accent = key === "en_route"
    return accent
      ? { dot: "bg-orange-400", text: "text-orange-500 dark:text-orange-400" }
      : { dot: "bg-blue-400", text: "text-blue-500 dark:text-blue-400" }
  }
  return { dot: "bg-muted-foreground/30", text: "text-muted-foreground/60" }
}

export function ActiveOperationCard({
  op,
  milestones,
}: {
  op: ActiveOperationView
  milestones: LifecycleMilestone[]
}) {
  const liveLabel =
    op.executionStatus === "working"
      ? "Trabajando"
      : op.executionStatus === "on_site"
        ? "En sitio"
        : "En camino"

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{op.technicianName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {op.companyName ?? "—"} · {op.workOrderSubject ?? ""}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
          <span className="size-1.5 rounded-full bg-blue-400" />
          {liveLabel}
          {op.workOrderNumber ? ` · ${op.workOrderNumber}` : ""}
        </span>
      </div>

      {/* Ribbon = línea de vida real (compacta). El hito ACTUAL late "en vivo"
          para que se sienta una operación avanzando, no una lista de estados. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {milestones.map((m, i) => {
          const { dot, text } = dotTone(m.state, m.key)
          const live = m.state === "current"
          return (
            <span key={m.key} className="inline-flex items-center">
              {i > 0 ? (
                <span
                  className={`mr-1 h-px w-3 ${
                    m.state === "done" || milestones[i - 1]?.state === "done"
                      ? "bg-emerald-400/40"
                      : "bg-border"
                  }`}
                />
              ) : null}
              <span className={`inline-flex items-center gap-1.5 text-xs ${text} ${live ? "font-semibold" : ""}`}>
                <span
                  className={`size-1.5 rounded-full ${dot} ${live ? "animate-pulse ring-2 ring-current/30" : ""}`}
                />
                {SHORT_LABEL[m.key] ?? m.label}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
