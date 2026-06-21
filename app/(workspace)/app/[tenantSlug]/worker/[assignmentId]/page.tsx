import { ArrowLeft, Cpu, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ExecutionActions } from "@/components/worker/execution-actions"
import { WorkerOperationalHeader } from "@/components/worker/operational-header"
import { LifecycleTimeline } from "@/components/service/lifecycle-timeline"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  getMyAssignment,
  resolveCurrentTechnician,
} from "@/modules/field-execution/composition"
import { getWorkOrderLifecycle } from "@/modules/service/composition"
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
    timeZone: "America/Bogota",
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

  // Línea de vida de la solicitud (misma que ve el cliente y el admin), para que
  // el técnico tenga el contexto completo de la operación en su móvil.
  const lifecycle = await getWorkOrderLifecycle(context.tenantId, assignment.workOrderId)

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

      {/* Cabecera operacional — contexto del trabajo, siempre visible. */}
      <WorkerOperationalHeader
        workOrderNumber={assignment.workOrderNumber}
        companyName={assignment.companyName}
        subject={assignment.workOrderSubject}
        issueTypeLabel={assignment.issueTypeLabel}
        priority={assignment.priority}
        slaDueAt={assignment.slaDueAt}
      />

      <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {EXECUTION_STATUS_LABELS[assignment.executionStatus]}
          </span>
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

      {/* Línea de vida de la solicitud */}
      {lifecycle ? (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Línea de vida de la solicitud
          </h2>
          <LifecycleTimeline milestones={lifecycle} />
        </div>
      ) : null}
    </div>
  )
}
