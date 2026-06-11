import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type {
  CreateFromQuoteResult,
  WorkOrderRepository,
} from "@/modules/service/application/ports/work-order-repository"
import type { UUID } from "@/types/shared"

export type CreateWorkOrderFromQuoteDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type CreateWorkOrderFromQuoteInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  quoteId: UUID
}

/**
 * E5 — generate a billable Work Order from an accepted Quote (the Quote branch of
 * the WO's polymorphic origin). Unites Sales → Service → Revenue: the WO carries the
 * quote as its origin and is billable by default (price pre-agreed in the quote).
 * One work order per quote.
 */
export async function createWorkOrderFromQuote(
  { workOrders, audit }: CreateWorkOrderFromQuoteDeps,
  input: CreateWorkOrderFromQuoteInput,
): Promise<CreateFromQuoteResult> {
  const existing = await workOrders.findByQuote(input.tenantId, input.quoteId)
  if (existing) {
    throw new ApplicationError(
      "This quote already has a work order.",
      "QUOTE_ALREADY_HAS_WORK_ORDER",
    )
  }

  const workOrderNumber = await workOrders.nextWorkOrderNumber(input.tenantId)
  const result = await workOrders.createFromQuote(input.tenantId, {
    quoteId: input.quoteId,
    createdBy: input.actorId,
    workOrderNumber,
  })

  await audit.append({
    eventType: "service.work_order.created_from_quote",
    action: "work_order.created_from_quote",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: result.workOrder.id,
    metadata: {
      quoteId: input.quoteId,
      workOrderNumber,
      serviceLineCount: result.serviceLineCount,
      productLineCount: result.productLineCount,
    },
    requestId: input.requestId,
    source: "web",
  })

  return result
}
