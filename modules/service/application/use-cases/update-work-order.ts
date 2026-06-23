import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import {
  isWorkOrderTerminal,
  type WorkOrder,
  type WorkOrderInput,
} from "@/modules/service/domain/work-order"
import type { UUID } from "@/types/shared"

export type UpdateWorkOrderDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type UpdateWorkOrderInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: WorkOrderInput
}

export async function updateWorkOrder(
  { workOrders, audit }: UpdateWorkOrderDeps,
  input: UpdateWorkOrderInput,
): Promise<WorkOrder> {
  const existing = await workOrders.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
  }

  // Una WO terminal (completada/cancelada) quedó cerrada: no se edita.
  if (isWorkOrderTerminal(existing.status)) {
    throw new ApplicationError(
      "No se puede editar una orden completada o cancelada.",
      "WORK_ORDER_TERMINAL",
    )
  }

  const record = await workOrders.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "service.work_order.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: record.id,
    action: "work_order.updated",
    metadata: {
      workOrderNumber: record.workOrderNumber,
      subject: record.subject,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
