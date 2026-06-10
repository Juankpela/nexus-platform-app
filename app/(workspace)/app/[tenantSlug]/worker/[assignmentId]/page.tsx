import { ArrowLeft, Building2, Cpu, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ExecutionActions } from "@/components/worker/execution-actions"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  getMyAssignment,
  resolveCurrentTechnician,
} from "@/modules/field-execution/composition"
import { EXECUTION_STATUS_LABELS } from "@/modules/field-execution/domain/execution"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Asignación" }

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
}

export default async function WorkerAssignmentDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; assignmentId: string }>
}) {
  const { tenantSlug, assignmentId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.fieldRead)

  const technician = await resolveCurrentTechnician(context.tenantId, context.userId)
  if (!technician) notFound()

  const assignment = await getMyAssignment(
    context.tenantId,
    technician.id,
    assignmentId,
  )
  if (!assignment) notFound()

  const base = `/app/${tenantSlug}/worker`

  return (
    <div className="space-y-5">
      <Link
        href={`${base}/schedule`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Mi agenda
      </Link>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {assignment.workOrderNumber}
          </h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {EXECUTION_STATUS_LABELS[assignment.executionStatus]}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {assignment.workOrderSubject}
        </p>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="size-4" /> {assignment.companyName ?? "—"}
        </p>
        {assignment.assetName ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="size-4" /> {assignment.assetName}
          </p>
        ) : null}
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4" /> {fmt(assignment.scheduledStart)}
        </p>
      </div>

      {/* Execution actions (the only thing the technician can mutate) */}
      <ExecutionActions
        tenantSlug={tenantSlug}
        assignmentId={assignment.assignmentId}
        status={assignment.executionStatus}
      />
    </div>
  )
}
