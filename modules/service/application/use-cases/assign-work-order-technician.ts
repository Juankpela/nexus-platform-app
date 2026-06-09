import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import type { UUID } from "@/types/shared"

export type AssignWorkOrderTechnicianDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type AssignWorkOrderTechnicianInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  technicianId: UUID | null
}

export async function assignWorkOrderTechnician(
  { workOrders, audit }: AssignWorkOrderTechnicianDeps,
  input: AssignWorkOrderTechnicianInput,
): Promise<void> {
  const existing = await workOrders.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
  }
  if (existing.assignedTechnicianId === input.technicianId) return

  await workOrders.setTechnician(input.tenantId, input.id, input.technicianId)

  await audit.append({
    eventType: "service.work_order.assigned",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: input.id,
    action: "work_order.assigned",
    metadata: {
      from: existing.assignedTechnicianId,
      to: input.technicianId,
    },
    requestId: input.requestId,
    source: "web",
  })
}
