import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import type {
  WorkOrder,
  WorkOrderInput,
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
