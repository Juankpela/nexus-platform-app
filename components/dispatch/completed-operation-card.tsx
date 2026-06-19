import { Check } from "lucide-react"

/**
 * Tarjeta de "Operación completada" — refuerza el cierre del ciclo
 * Solicitud → Coordinación → Ejecución → Cobro, con datos ya existentes
 * (WO completada + su factura/pago). El tiempo de resolución se calcula de
 * actualStart→actualEnd y solo se muestra si ambos existen (si no, se omite).
 */

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export type CompletedOperationView = {
  workOrderNumber: string
  subject: string
  companyName: string | null
  actualStart: string | null
  actualEnd: string | null
  invoice: {
    invoiceNumber: string | null
    totalAmount: number
    balance: number
  } | null
}

function durationLabel(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const mins = Math.round(ms / 60000)
  if (mins < 1) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

export function CompletedOperationCard({ op }: { op: CompletedOperationView }) {
  // Solo una factura con monto real cuenta como facturada/cobrada; un borrador
  // en $0 no es un cierre de ciclo.
  const invoiced = op.invoice !== null && op.invoice.totalAmount > 0
  const paid = invoiced && op.invoice!.balance <= 0.01
  const stages: { label: string; done: boolean }[] = [
    { label: "Solicitud", done: true },
    { label: "Coordinación", done: true },
    { label: "Ejecución", done: true },
    { label: "Cobro", done: paid },
  ]
  const duration = durationLabel(op.actualStart, op.actualEnd)

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{op.companyName ?? "—"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {op.subject} · {op.workOrderNumber}
          </p>
        </div>
        {duration ? (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            Resuelto en {duration}
          </span>
        ) : null}
      </div>

      {/* Cierre macro del ciclo */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                s.done ? "text-emerald-400" : "text-muted-foreground/60"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${s.done ? "bg-emerald-400" : "bg-muted-foreground/30"}`}
              />
              {s.label}
            </span>
            {i < stages.length - 1 ? (
              <span className="text-muted-foreground/40">→</span>
            ) : null}
          </span>
        ))}
      </div>

      {invoiced ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {op.invoice!.invoiceNumber ?? "Factura"} ·{" "}
          <span className="font-medium text-foreground">{COP.format(op.invoice!.totalAmount)}</span>
          {paid ? " · Pagada" : " · Pendiente de cobro"}
        </p>
      ) : null}

      {paid ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2 text-sm font-medium text-emerald-400">
          <Check className="size-4" />
          Operación cerrada exitosamente
        </div>
      ) : null}
    </div>
  )
}
