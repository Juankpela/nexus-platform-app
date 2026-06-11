import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import type { UUID } from "@/types/shared"

export type SetWorkOrderBillableDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type SetWorkOrderBillableInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  billable: boolean
}

/**
 * E2-H1 — mark a work order as billable or not. Independent of execution status.
 * Changing billability resets any prior billing approval (repo enforces).
 */
export async function setWorkOrderBillable(
  { workOrders, audit }: SetWorkOrderBillableDeps,
  input: SetWorkOrderBillableInput,
): Promise<void> {
  const existing = await workOrders.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
  }
  if (existing.billable === input.billable) return

  await workOrders.setBillable(input.tenantId, input.id, input.billable)

  await audit.append({
    eventType: "service.work_order.billable_changed",
    action: "work_order.billable_changed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: input.id,
    metadata: { billable: input.billable },
    requestId: input.requestId,
    source: "web",
  })
}
