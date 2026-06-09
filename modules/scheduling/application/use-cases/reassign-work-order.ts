import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type { TechnicianReader } from "@/modules/scheduling/application/ports/readers"
import {
  durationMinutes,
  type WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import type { UUID } from "@/types/shared"

export type ReassignWorkOrderDeps = {
  assignments: SchedulingRepository
  technicians: TechnicianReader
  audit: AuditRepository
}

export type ReassignWorkOrderInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  technicianId: UUID
  scheduledStart: string
  scheduledEnd: string
}

export async function reassignWorkOrder(
  { assignments, technicians, audit }: ReassignWorkOrderDeps,
  input: ReassignWorkOrderInput,
): Promise<WorkOrderAssignment> {
  const { tenantId } = input

  const existing = await assignments.getById(tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Assignment not found.", "ASSIGNMENT_NOT_FOUND")
  }

  const technician = await technicians.getById(tenantId, input.technicianId)
  if (!technician || technician.deletedAt) {
    throw new ApplicationError("Technician not found.", "TECHNICIAN_NOT_FOUND")
  }
  if (technician.status !== "active") {
    throw new ApplicationError(
      "Technician is not available for new assignments.",
      "TECHNICIAN_UNAVAILABLE",
    )
  }

  if (
    new Date(input.scheduledEnd).getTime() <=
    new Date(input.scheduledStart).getTime()
  ) {
    throw new ApplicationError(
      "Scheduled end must be after start.",
      "INVALID_TIME_WINDOW",
    )
  }

  // Re-validate availability, excluding this very assignment.
  const clashes = await assignments.findOverlapping(
    tenantId,
    input.technicianId,
    input.scheduledStart,
    input.scheduledEnd,
    input.id,
  )
  if (clashes.length > 0) {
    throw new ApplicationError(
      "The technician already has an assignment in that time window.",
      "ASSIGNMENT_OVERLAP",
    )
  }

  const record = await assignments.reschedule(tenantId, input.id, {
    technicianId: input.technicianId,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    estimatedDurationMinutes: durationMinutes(
      input.scheduledStart,
      input.scheduledEnd,
    ),
  })

  await audit.append({
    eventType: "scheduling.assignment.reassigned",
    actorType: "user",
    actorId: input.actorId,
    tenantId,
    subjectType: "work_order_assignment",
    subjectId: record.id,
    action: "assignment.reassigned",
    metadata: {
      fromTechnicianId: existing.technicianId,
      toTechnicianId: record.technicianId,
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
