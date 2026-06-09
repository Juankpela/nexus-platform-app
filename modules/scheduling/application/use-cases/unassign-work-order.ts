import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type { UUID } from "@/types/shared"

export type UnassignWorkOrderDeps = {
  assignments: SchedulingRepository
  audit: AuditRepository
}

export type UnassignWorkOrderInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
}

/** Removes the assignment only. The Work Order is never deleted. */
export async function unassignWorkOrder(
  { assignments, audit }: UnassignWorkOrderDeps,
  input: UnassignWorkOrderInput,
): Promise<void> {
  const existing = await assignments.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Assignment not found.", "ASSIGNMENT_NOT_FOUND")
  }

  await assignments.delete(input.tenantId, input.id)

  await audit.append({
    eventType: "scheduling.assignment.deleted",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order_assignment",
    subjectId: input.id,
    action: "assignment.deleted",
    metadata: {
      workOrderId: existing.workOrderId,
      technicianId: existing.technicianId,
    },
    requestId: input.requestId,
    source: "web",
  })
}
