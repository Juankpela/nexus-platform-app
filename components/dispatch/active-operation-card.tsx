import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"

/**
 * Tarjeta de "Operación activa" — Nexus está coordinando esto ahora. El ribbon
 * de estado se deriva EXCLUSIVAMENTE del executionStatus que ya provee
 * getFieldMonitorBoard (accepted/on_site/working). La confirmación al cliente se
 * auto-emite al aceptar (confirmCustomerOnAcceptance), por eso "Cliente
 * informado" es derivable sin consultas extra. Sin datos nuevos.
 */

export type ActiveOperationView = {
  technicianName: string
  workOrderNumber: string | null
  workOrderSubject: string | null
  companyName: string | null
  priority: string | null
  executionStatus: ExecutionStatus
}

const MILESTONES = [
  { label: "Técnico aceptó", pendingLabel: "Técnico aceptó" },
  { label: "Cliente informado", pendingLabel: "Cliente informado" },
  { label: "En camino", pendingLabel: "En camino" },
  { label: "Trabajando", pendingLabel: "Trabajando" },
  { label: "Evidencia recibida", pendingLabel: "Evidencia pendiente" },
  { label: "Factura emitida", pendingLabel: "Factura pendiente" },
  { label: "Pago recibido", pendingLabel: "Pago pendiente" },
] as const

// Índice del hito "en curso" según el estado de ejecución real.
function currentIndex(status: ExecutionStatus): number {
  switch (status) {
    case "accepted":
      return 2 // técnico aceptó + cliente informado hechos → "En camino" en curso
    case "on_site":
    case "working":
      return 3 // → "Trabajando" en curso
    default:
      return 3
  }
}

export function ActiveOperationCard({ op }: { op: ActiveOperationView }) {
  const cur = currentIndex(op.executionStatus)

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
          {op.executionStatus === "working"
            ? "Trabajando"
            : op.executionStatus === "on_site"
              ? "En sitio"
              : "En camino"}
          {op.workOrderNumber ? ` · ${op.workOrderNumber}` : ""}
        </span>
      </div>

      {/* Ribbon de estado operacional */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {MILESTONES.map((m, i) => {
          const done = i < cur
          const current = i === cur
          const dot = done
            ? "bg-emerald-400"
            : current
              ? i === 2
                ? "bg-orange-400"
                : "bg-blue-400"
              : "bg-muted-foreground/30"
          const text = done
            ? "text-emerald-400"
            : current
              ? i === 2
                ? "text-orange-400"
                : "text-blue-400"
              : "text-muted-foreground/60"
          return (
            <span key={m.label} className={`inline-flex items-center gap-1.5 text-xs ${text}`}>
              <span className={`size-1.5 rounded-full ${dot}`} />
              {done ? m.label : current ? m.label : m.pendingLabel}
            </span>
          )
        })}
      </div>
    </div>
  )
}
