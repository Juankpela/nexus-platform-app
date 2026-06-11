import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import type { UUID } from "@/types/shared"

export type ApproveWorkOrderBillingDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type ApproveWorkOrderBillingInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  /** Approval timestamp (ISO); supplied by the caller to avoid clock coupling. */
  approvedAt: string
}

/**
 * E2-H3 — a billing role approves a billable, completed work order for invoicing.
 * This is the checkpoint that gates invoice generation (E1 generate-from-WO).
 */
export async function approveWorkOrderBilling(
  { workOrders, audit }: ApproveWorkOrderBillingDeps,
  input: ApproveWorkOrderBillingInput,
): Promise<void> {
  const existing = await workOrders.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
  }
  if (!existing.billable) {
    throw new ApplicationError(
      "Only billable work orders can be approved for billing.",
      "WORK_ORDER_NOT_BILLABLE",
    )
  }
  if (existing.status !== "completed") {
    throw new ApplicationError(
      "Only completed work orders can be approved for billing.",
      "WORK_ORDER_NOT_COMPLETED",
    )
  }

  await workOrders.approveBilling(
    input.tenantId,
    input.id,
    input.actorId,
    input.approvedAt,
  )

  await audit.append({
    eventType: "service.work_order.billing_approved",
    action: "work_order.billing_approved",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: input.id,
    metadata: { approvedAt: input.approvedAt },
    requestId: input.requestId,
    source: "web",
  })
}
