import { ArrowLeft, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FieldMonitorLive } from "@/components/field-monitor/field-monitor-live"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getTechnicianFieldDetail } from "@/modules/field-execution/composition"
import {
  EXECUTION_STATUS_LABELS,
  type ExecutionStatus,
} from "@/modules/field-execution/domain/execution"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Técnico — Monitor de Campo" }
export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<ExecutionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  on_site: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  working: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  unable_to_complete: "bg-destructive/10 text-destructive",
}

const OPEN: ExecutionStatus[] = ["pending", "accepted", "on_site", "working"]

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
}

export default async function TechnicianMonitorPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; technicianId: string }>
}) {
  const { tenantSlug, technicianId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const { technician, assignments } = await getTechnicianFieldDetail(
    context.tenantId,
    technicianId,
  )
  if (!technician) notFound()

  const open = assignments.filter((a) => OPEN.includes(a.executionStatus))
  const closed = assignments.filter((a) => !OPEN.includes(a.executionStatus))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/${tenantSlug}/field-monitor`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Monitor de Campo
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{technician.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {open.length} activa(s) · {closed.length} cerrada(s) · {assignments.length} en total
          </p>
        </div>
        <FieldMonitorLive
          tenantId={context.tenantId}
          generatedAt={new Date().toISOString()}
        />
      </header>

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="text-sm font-medium">Sin órdenes asignadas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: "En curso", items: open },
            { title: "Cerradas", items: closed },
          ].map((group) =>
            group.items.length > 0 ? (
              <section key={group.title} className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {group.title}
                </h2>
                <ul className="space-y-2">
                  {group.items.map((a) => (
                    <li key={a.assignmentId}>
                      <Link
                        href={`/app/${tenantSlug}/work-orders/${a.workOrderId}`}
                        className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">
                              {a.workOrderNumber}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[a.executionStatus]}`}
                            >
                              {EXECUTION_STATUS_LABELS[a.executionStatus]}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.workOrderSubject}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {a.companyName ?? "—"} · {fmt(a.scheduledStart)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
