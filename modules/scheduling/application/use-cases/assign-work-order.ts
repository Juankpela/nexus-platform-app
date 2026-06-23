import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type {
  TechnicianReader,
  WorkOrderReader,
} from "@/modules/scheduling/application/ports/readers"
import {
  durationMinutes,
  type AssignmentInput,
  type WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import { isWorkOrderTerminal } from "@/modules/service/domain/work-order"
import type { UUID } from "@/types/shared"

export type AssignWorkOrderDeps = {
  assignments: SchedulingRepository
  technicians: TechnicianReader
  workOrders: WorkOrderReader
  audit: AuditRepository
}

export type AssignWorkOrderInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: AssignmentInput
}

export async function assignWorkOrder(
  { assignments, technicians, workOrders, audit }: AssignWorkOrderDeps,
  input: AssignWorkOrderInput,
): Promise<WorkOrderAssignment> {
  const { tenantId, data } = input

  // Rule 2 + Rule 3 — work order must exist within the tenant.
  const workOrder = await workOrders.getById(tenantId, data.workOrderId)
  if (!workOrder) {
    throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
  }

  // Una WO terminal (completada/cancelada) no admite asignación de técnico.
  if (isWorkOrderTerminal(workOrder.status)) {
    throw new ApplicationError(
      "No se puede asignar técnico a una orden completada o cancelada.",
      "WORK_ORDER_TERMINAL",
    )
  }

  // Rule 2 + Rule 3 — technician must exist within the tenant.
  const technician = await technicians.getById(tenantId, data.technicianId)
  if (!technician || technician.deletedAt) {
    throw new ApplicationError("Technician not found.", "TECHNICIAN_NOT_FOUND")
  }

  // Rule 4 — only active technicians can take new assignments.
  if (technician.status !== "active") {
    throw new ApplicationError(
      "Technician is not available for new assignments.",
      "TECHNICIAN_UNAVAILABLE",
    )
  }

  // Validate time window.
  if (new Date(data.scheduledEnd).getTime() <= new Date(data.scheduledStart).getTime()) {
    throw new ApplicationError(
      "Scheduled end must be after start.",
      "INVALID_TIME_WINDOW",
    )
  }

  // Rule 1 — no overlapping active assignment for this technician.
  const clashes = await assignments.findOverlapping(
    tenantId,
    data.technicianId,
    data.scheduledStart,
    data.scheduledEnd,
  )
  if (clashes.length > 0) {
    throw new ApplicationError(
      "The technician already has an assignment in that time window.",
      "ASSIGNMENT_OVERLAP",
    )
  }

  const record = await assignments.create(tenantId, {
    workOrderId: data.workOrderId,
    technicianId: data.technicianId,
    scheduledStart: data.scheduledStart,
    scheduledEnd: data.scheduledEnd,
    estimatedDurationMinutes: durationMinutes(data.scheduledStart, data.scheduledEnd),
  })

  await audit.append({
    eventType: "scheduling.assignment.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId,
    subjectType: "work_order_assignment",
    subjectId: record.id,
    action: "assignment.created",
    metadata: {
      workOrderId: record.workOrderId,
      technicianId: record.technicianId,
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
