import { ArrowRight, CalendarDays } from "lucide-react"
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
import { greetingFor } from "@/modules/platform/presentation/mission-control"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Campo" }

const OPEN_STATUSES: ExecutionStatus[] = ["pending", "accepted", "on_site", "working"]

function NotLinked() {
  return (
    <div className="rounded-xl border border-dashed bg-card p-8 text-center">
      <p className="text-sm font-medium text-foreground">No estás vinculado como técnico</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Pide a tu supervisor que asocie tu usuario a un técnico para ver tu trabajo.
      </p>
    </div>
  )
}

export default async function WorkerHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.fieldRead)

  const technician = await resolveCurrentTechnician(context.tenantId, context.userId)
  if (!technician) return <NotLinked />

  const assignments = await listMyAssignments(context.tenantId, technician.id)
  const open = assignments.filter((a) => OPEN_STATUSES.includes(a.executionStatus))
  const done = assignments.length - open.length
  const next = open[0] ?? null
  const base = `/app/${tenantSlug}/worker`

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          {greetingFor(new Date().getUTCHours())}
        </h1>
        <p className="text-sm text-muted-foreground">Tu jornada de hoy</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-semibold tabular-nums">{open.length}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-semibold tabular-nums">{done}</p>
          <p className="text-xs text-muted-foreground">Cerradas</p>
        </div>
      </div>

      {next ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Tu próxima parada</p>
          <Link
            href={`${base}/${next.assignmentId}`}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{next.workOrderNumber}</p>
              <p className="truncate text-xs text-muted-foreground">
                {next.workOrderSubject} · {EXECUTION_STATUS_LABELS[next.executionStatus]}
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          No tienes asignaciones abiertas. ¡Buen trabajo!
        </p>
      )}

      <Link
        href={`${base}/schedule`}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary"
      >
        Ver toda mi agenda <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
