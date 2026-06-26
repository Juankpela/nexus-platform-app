import { MapPin, Radio, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { FieldMonitorLive } from "@/components/field-monitor/field-monitor-live"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import {
  EXECUTION_STATUS_LABELS,
  type ExecutionStatus,
} from "@/modules/field-execution/domain/execution"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import {
  WORK_ORDER_PRIORITY_LABELS,
  type WorkOrderPriority,
} from "@/modules/service/domain/work-order"

export const metadata: Metadata = { title: "Monitor de Campo" }

// Always render fresh: the client triggers router.refresh() on live updates.
export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<ExecutionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  on_site: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  working: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  unable_to_complete: "bg-destructive/10 text-destructive",
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-600 dark:text-blue-400",
  high: "text-amber-600 dark:text-amber-400",
  critical: "text-destructive font-semibold",
}

function relativeSince(iso: string | null): string {
  if (!iso) return ""
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return "hace instantes"
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  return `hace ${h} h ${mins % 60} min`
}

export default async function FieldMonitorPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const board = await getFieldMonitorBoard(context.tenantId)
  const active = board.entries.filter((e) => e.activeJob)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Radio className="size-5 text-primary" /> Monitor de Campo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} técnico{active.length === 1 ? "" : "s"} en actividad ·{" "}
            {board.entries.length} en total
          </p>
        </div>
        <FieldMonitorLive tenantId={context.tenantId} generatedAt={board.generatedAt} />
      </header>

      {board.entries.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="text-sm font-medium">Sin técnicos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aún no hay técnicos registrados en esta organización. Registra tu
            primer técnico para empezar a monitorear el trabajo en campo.
          </p>
          <Link
            href={`/app/${tenantSlug}/technicians`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Wrench className="size-3.5" /> Registrar técnico
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.entries.map((e) => {
            const job = e.activeJob
            return (
              <Link
                key={e.technicianId}
                href={`/app/${tenantSlug}/field-monitor/${e.technicianId}`}
                className="flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{e.technicianName}</p>
                  {job ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.executionStatus]}`}
                    >
                      {EXECUTION_STATUS_LABELS[job.executionStatus]}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Sin actividad
                    </span>
                  )}
                </div>

                {job ? (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{job.workOrderNumber}</span>
                      {job.priority ? (
                        <span
                          className={`ml-auto text-xs ${PRIORITY_STYLES[job.priority] ?? "text-muted-foreground"}`}
                        >
                          {WORK_ORDER_PRIORITY_LABELS[job.priority as WorkOrderPriority] ??
                            job.priority}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {job.workOrderSubject}
                    </p>
                    {job.companyName ? (
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {job.companyName}
                      </p>
                    ) : null}
                    <p className="pt-1 text-xs text-muted-foreground">
                      {EXECUTION_STATUS_LABELS[job.executionStatus]} · {relativeSince(job.since)}
                    </p>
                    {job.notes ? (
                      <p className="mt-1 rounded-md bg-muted/60 p-2 text-xs italic text-muted-foreground">
                        “{job.notes}”
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {e.completedToday > 0
                      ? `${e.completedToday} orden(es) cerrada(s) hoy`
                      : "Sin órdenes en ejecución"}
                  </p>
                )}

                {job && e.completedToday > 0 ? (
                  <p className="mt-auto pt-3 text-xs text-muted-foreground">
                    {e.completedToday} cerrada(s) hoy
                  </p>
                ) : null}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
