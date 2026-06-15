import type { WorkOrder } from "@/modules/service/domain/work-order"

const TERMINAL = new Set(["completed", "cancelled"])

/**
 * Work orders that still need a technician: open (not terminal) and without an
 * active assignment. Pure — `assignedWorkOrderIds` are the WO ids that already
 * have an active assignment (from getActiveAssignmentsByWorkOrder).
 */
export function selectUnassignedWorkOrders(
  workOrders: WorkOrder[],
  assignedWorkOrderIds: Set<string>,
): WorkOrder[] {
  return workOrders.filter(
    (wo) => !TERMINAL.has(wo.status) && !assignedWorkOrderIds.has(wo.id),
  )
}
