import { ArrowLeft, ArrowRight, HardHat, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { AssignmentFormDialog } from "@/components/scheduling/assignment-form-dialog"
import { UnassignButton } from "@/components/scheduling/unassign-button"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getAssignmentRecord } from "@/modules/scheduling/composition"
import {
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
} from "@/modules/scheduling/domain/work-order-assignment"
import { listTenantTechnicians } from "@/modules/service/composition"
import { technicianFullName } from "@/modules/service/domain/technician"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Assignment" }

const statusStyles: Record<AssignmentStatus, string> = {
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  )
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; assignmentId: string }>
}) {
  const { tenantSlug, assignmentId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.schedulingRead)

  const assignment = await getAssignmentRecord(context.tenantId, assignmentId)
  if (!assignment) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.schedulingWrite,
  )

  const techResult = canWrite
    ? await listTenantTechnicians(
        context.tenantId,
        { search: null, status: "active" },
        "name",
        1,
        200,
      )
    : { items: [], total: 0, page: 1, pageSize: 0 }
  const technicianOptions = techResult.items.map((t) => ({
    id: t.id,
    label: technicianFullName(t),
  }))

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { timeZone: "America/Bogota" })

  return (
    <>
      <PageHeader
        title={`Asignación · ${assignment.workOrderNumber ?? ""}`}
        description="Detalle de la asignación de campo."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${tenantSlug}/schedule`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Agenda
          </Link>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <AssignmentFormDialog
                tenantSlug={tenantSlug}
                workOrderOptions={[]}
                technicianOptions={technicianOptions}
                assignment={assignment}
                trigger={
                  <Button variant="outline" size="sm">
                    Reasignar
                  </Button>
                }
              />
              <UnassignButton tenantSlug={tenantSlug} id={assignment.id} />
            </div>
          ) : null}
        </div>

        {/* Traceability: Work Order -> Assignment -> Technician */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 text-sm">
          {assignment.workOrderId ? (
            <Link
              href={`/app/${tenantSlug}/work-orders/${assignment.workOrderId}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <Wrench className="size-4" />
              {assignment.workOrderNumber} · {assignment.workOrderSubject}
            </Link>
          ) : (
            <span className="text-muted-foreground">Orden no disponible</span>
          )}
          <ArrowRight className="size-4 text-muted-foreground/50" />
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <HardHat className="size-4" />
            {assignment.technicianName ?? "—"}
          </span>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Detalle</h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[assignment.status]}`}
            >
              {ASSIGNMENT_STATUS_LABELS[assignment.status]}
            </span>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Técnico" value={assignment.technicianName} />
            <Detail
              label="Orden de trabajo"
              value={assignment.workOrderNumber}
            />
            <Detail label="Inicio" value={fmt(assignment.scheduledStart)} />
            <Detail label="Fin" value={fmt(assignment.scheduledEnd)} />
            <Detail
              label="Duración estimada"
              value={`${assignment.estimatedDurationMinutes} min`}
            />
            <Detail label="Creada" value={fmt(assignment.createdAt)} />
          </dl>
        </div>
      </div>
    </>
  )
}
