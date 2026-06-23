import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import {
  hasActiveWorkOrder,
  type WorkOrder,
  type WorkOrderInput,
} from "@/modules/service/domain/work-order"
import type { UUID } from "@/types/shared"

export type CreateWorkOrderDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type CreateWorkOrderInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: WorkOrderInput
}

export async function createWorkOrder(
  { workOrders, audit }: CreateWorkOrderDeps,
  input: CreateWorkOrderInput,
): Promise<WorkOrder> {
  // Un caso solo se despacha una vez: si ya tiene una WO no cancelada, la
  // operación vive en esa WO y no se crean duplicados. Guard universal — cubre
  // tanto la creación manual como el despacho autónomo.
  if (input.data.caseId) {
    const existing = await workOrders.listForCase(input.tenantId, input.data.caseId)
    if (hasActiveWorkOrder(existing)) {
      throw new ApplicationError(
        "Este caso ya tiene una orden de trabajo activa.",
        "CASE_ALREADY_HAS_WORK_ORDER",
      )
    }
  }

  const workOrderNumber = await workOrders.nextWorkOrderNumber(input.tenantId)

  const record = await workOrders.create(input.tenantId, {
    createdBy: input.actorId,
    workOrderNumber,
    input: input.data,
  })

  await audit.append({
    eventType: "service.work_order.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: record.id,
    action: "work_order.created",
    metadata: {
      workOrderNumber: record.workOrderNumber,
      subject: record.subject,
      priority: record.priority,
      caseId: record.caseId,
      assetId: record.assetId,
      companyId: record.companyId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
