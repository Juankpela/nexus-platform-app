import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  listMyAssignments,
  resolveCurrentTechnician,
} from "@/modules/field-execution/composition"
import {
  EXECUTION_STATUS_LABELS,
  type ExecutionStatus,
} from "@/modules/field-execution/domain/execution"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Mi agenda" }

const statusStyles: Record<ExecutionStatus, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  accepted: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  on_site: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  working: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unable_to_complete: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
}

export default async function WorkerSchedulePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.fieldRead)

  const technician = await resolveCurrentTechnician(context.tenantId, context.userId)
  if (!technician) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        No estás vinculado como técnico.
      </div>
    )
  }

  const assignments = await listMyAssignments(context.tenantId, technician.id)
  const base = `/app/${tenantSlug}/worker`

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Mi agenda</h1>

      {assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          No tienes asignaciones.
        </p>
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => (
            <li key={a.assignmentId}>
              <Link
                href={`${base}/${a.assignmentId}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {a.workOrderNumber}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[a.executionStatus]}`}
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
      )}
    </div>
  )
}
