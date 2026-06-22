import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"

import { formatDateTime } from "@/lib/format/datetime"
import type {
  SlaAlertBoard,
  SlaAlertItem,
} from "@/modules/scheduling/domain/sla-alert-board"

const MAX_PER_GROUP = 6

function fmtDeadline(iso: string): string {
  return formatDateTime(iso, { month: "2-digit", year: undefined })
}

function AlertRow({
  item,
  tenantSlug,
  verb,
}: {
  item: SlaAlertItem
  tenantSlug: string
  verb: string
}) {
  return (
    <Link
      href={`/app/${tenantSlug}/work-orders/${item.workOrderId}`}
      className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs hover:bg-muted/40"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="font-medium text-foreground">{item.workOrderNumber}</span>
        <span className="truncate text-muted-foreground">{item.subject}</span>
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {verb} {fmtDeadline(item.slaDueAt)}
      </span>
    </Link>
  )
}

function Group({
  items,
  tenantSlug,
  verb,
}: {
  items: SlaAlertItem[]
  tenantSlug: string
  verb: string
}) {
  const shown = items.slice(0, MAX_PER_GROUP)
  const rest = items.length - shown.length
  return (
    <div className="space-y-1.5">
      {shown.map((item) => (
        <AlertRow key={item.workOrderId} item={item} tenantSlug={tenantSlug} verb={verb} />
      ))}
      {rest > 0 ? (
        <p className="px-1 text-[11px] text-muted-foreground">+{rest} más</p>
      ) : null}
    </div>
  )
}

/**
 * Live, stateless SLA-alert card. The board is computed in-request from the
 * domain classifier; this component only renders. No cursor/audit dependency.
 */
export function SlaAlertsCard({
  board,
  tenantSlug,
}: {
  board: SlaAlertBoard
  tenantSlug: string
}) {
  const healthy = board.criticalCount === 0 && board.atRiskCount === 0

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="size-4 text-amber-500" />
          Alertas de SLA
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            {board.criticalCount} vencidas
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            {board.atRiskCount} en riesgo
          </span>
        </div>
      </div>

      {healthy ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          Sin órdenes vencidas ni próximas a incumplir SLA.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {board.criticalCount > 0 ? (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="size-3.5" /> Vencidas
              </p>
              <Group items={board.critical} tenantSlug={tenantSlug} verb="Venció" />
            </div>
          ) : null}
          {board.atRiskCount > 0 ? (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Clock className="size-3.5" /> En riesgo
              </p>
              <Group items={board.atRisk} tenantSlug={tenantSlug} verb="Vence" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
