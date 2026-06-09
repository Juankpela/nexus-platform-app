import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import {
  WORK_ORDER_STATUS_TRANSITIONS,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import type { UUID } from "@/types/shared"

export type ChangeWorkOrderStatusDeps = {
  workOrders: WorkOrderRepository
  audit: AuditRepository
}

export type ChangeWorkOrderStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: WorkOrderStatus
}

export async function changeWorkOrderStatus(
  { workOrders, audit }: ChangeWorkOrderStatusDeps,
  input: ChangeWorkOrderStatusInput,
): Promise<void> {
  const existing = await workOrders.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
  }
  if (existing.status === input.status) return

  const allowed = WORK_ORDER_STATUS_TRANSITIONS[existing.status]
  if (!allowed.includes(input.status)) {
    throw new ApplicationError(
      `Cannot move a ${existing.status} work order to ${input.status}.`,
      "INVALID_WORK_ORDER_STATUS_TRANSITION",
    )
  }

  const now = new Date().toISOString()
  const timestamps: { actualStart?: string | null; actualEnd?: string | null } = {}
  // Stamp the real execution window as the order progresses.
  if (input.status === "in_progress" && !existing.actualStart) {
    timestamps.actualStart = now
  }
  if (input.status === "completed") {
    timestamps.actualEnd = now
    if (!existing.actualStart) timestamps.actualStart = existing.createdAt
  }

  await workOrders.setStatus(input.tenantId, input.id, input.status, timestamps)

  const base: Omit<AuditEvent, "eventType" | "action"> = {
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: input.id,
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  }

  await audit.append({
    ...base,
    eventType: "service.work_order.status_changed",
    action: "work_order.status_changed",
  })

  if (input.status === "completed") {
    await audit.append({
      ...base,
      eventType: "service.work_order.completed",
      action: "work_order.completed",
    })
  } else if (input.status === "cancelled") {
    await audit.append({
      ...base,
      eventType: "service.work_order.cancelled",
      action: "work_order.cancelled",
    })
  }
}
