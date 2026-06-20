import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import type { LifecycleMilestone } from "@/modules/service/domain/service-lifecycle"

/**
 * Fila de "Operación activa" del stream N2 — Nexus está coordinando esto ahora.
 * Línea de vida operacional FULL-WIDTH (9 hitos) derivada de la MISMA función
 * canónica (`buildServiceLifecycle`): verde = recorrido, punteado teal = entrando
 * al hito actual (que late), gris = pendiente. Diseño de referencia oficial.
 */

export type ActiveOperationView = {
  technicianName: string
  workOrderNumber: string | null
  workOrderSubject: string | null
  companyName: string | null
  priority: string | null
  executionStatus: ExecutionStatus
}

const SHORT_LABEL: Record<string, string> = {
  reported: "Reporte",
  coordinated: "Coordinado",
  accepted: "Confirmó",
  en_route: "En camino",
  on_site: "En sitio",
  working: "En curso",
  completed: "Completado",
  invoiced: "Factura",
  paid: "Pago",
}

const PILL_LABEL: Record<string, string> = {
  reported: "Reportado",
  coordinated: "Coordinado",
  accepted: "Confirmado",
  en_route: "En camino",
  on_site: "En sitio",
  working: "Trabajando",
  completed: "Completado",
  invoiced: "Factura emitida",
  paid: "Pagado",
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

/** Color del segmento de línea entre el hito a (izq) y b (der). */
function segTone(a: LifecycleMilestone | undefined, b: LifecycleMilestone | undefined): string {
  if (!a || !b) return "opacity-0"
  if (b.state === "current") return "border-t-2 border-dashed border-teal-400/70"
  if (a.state === "done") return "h-0.5 bg-emerald-400/60"
  return "h-0.5 bg-border"
}

export function ActiveOperationCard({
  op,
  milestones,
}: {
  op: ActiveOperationView
  milestones: LifecycleMilestone[]
}) {
  const current =
    milestones.find((m) => m.state === "current") ??
    [...milestones].reverse().find((m) => m.state === "done") ??
    milestones[0]
  const pill = current ? PILL_LABEL[current.key] ?? current.label : null
  const pillLive = current && ["accepted", "en_route", "on_site", "working"].includes(current.key)
  const pillDone = current && ["completed", "invoiced", "paid"].includes(current.key)

  return (
    <div className="grid items-center gap-4 px-4 py-3.5 lg:grid-cols-[minmax(160px,1.1fr)_5fr_minmax(130px,1fr)]">
      {/* Cliente / Técnico */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-foreground">{op.companyName ?? "—"}</p>
          {op.workOrderNumber ? (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{op.workOrderNumber}</span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{op.workOrderSubject ?? ""}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-nexus-blue to-emerald-500 text-[10px] font-bold text-white">
            {initials(op.technicianName)}
          </span>
          <span className="truncate text-xs text-foreground">{op.technicianName}</span>
        </div>
      </div>

      {/* Línea de vida operacional · 9 hitos */}
      <div className="flex items-start">
        {milestones.map((m, i) => {
          const isCurrent = m.state === "current"
          const isDone = m.state === "done"
          const dot = isCurrent
            ? "size-3.5 bg-nexus-blue ring-4 ring-nexus-blue/20 animate-pulse"
            : isDone
              ? "size-2.5 bg-emerald-400"
              : "size-2.5 border-2 border-muted-foreground/30 bg-card"
          const text = isCurrent
            ? "font-semibold text-nexus-blue"
            : isDone
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground/60"
          return (
            <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span className={`flex-1 ${i === 0 ? "opacity-0" : segTone(milestones[i - 1], m)}`} />
                <span className={`shrink-0 rounded-full ${dot}`} />
                <span
                  className={`flex-1 ${
                    i === milestones.length - 1 ? "opacity-0" : segTone(m, milestones[i + 1])
                  }`}
                />
              </div>
              <span className={`mt-1.5 truncate text-[10px] ${text}`} title={SHORT_LABEL[m.key] ?? m.label}>
                {SHORT_LABEL[m.key] ?? m.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Momento actual */}
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            pillDone
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : pillLive
                ? "bg-nexus-blue/10 text-nexus-blue"
                : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              pillDone ? "bg-emerald-500" : pillLive ? "bg-nexus-blue animate-pulse" : "bg-muted-foreground/50"
            }`}
          />
          {pill}
        </span>
        {current ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            hito: {SHORT_LABEL[current.key] ?? current.label}
          </span>
        ) : null}
      </div>
    </div>
  )
}
