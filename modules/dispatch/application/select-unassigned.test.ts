import { describe, expect, it } from "vitest"

import type { WorkOrder } from "@/modules/service/domain/work-order"
import { selectUnassignedWorkOrders } from "@/modules/dispatch/application/select-unassigned"

function wo(id: string, status: WorkOrder["status"]): WorkOrder {
  return { id, status } as WorkOrder
}

describe("selectUnassignedWorkOrders", () => {
  it("keeps open work orders without an active assignment", () => {
    const result = selectUnassignedWorkOrders(
      [wo("a", "new"), wo("b", "scheduled"), wo("c", "in_progress")],
      new Set(["b"]), // b already assigned
    )
    expect(result.map((w) => w.id)).toEqual(["a", "c"])
  })

  it("excludes terminal statuses (completed/cancelled)", () => {
    const result = selectUnassignedWorkOrders(
      [wo("a", "completed"), wo("b", "cancelled"), wo("c", "new")],
      new Set(),
    )
    expect(result.map((w) => w.id)).toEqual(["c"])
  })

  it("returns empty when all are assigned or terminal", () => {
    const result = selectUnassignedWorkOrders(
      [wo("a", "scheduled"), wo("b", "completed")],
      new Set(["a"]),
    )
    expect(result).toEqual([])
  })
})
