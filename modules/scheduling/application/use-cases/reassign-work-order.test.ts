import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type {
  TechnicianReader,
  WorkOrderReader,
} from "@/modules/scheduling/application/ports/readers"
import { reassignWorkOrder } from "@/modules/scheduling/application/use-cases/reassign-work-order"
import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"
const REQUEST = "33333333-3333-3333-3333-333333333333"
const TECH = "55555555-5555-5555-5555-555555555555"
const ASSIGNMENT = "66666666-6666-6666-6666-666666666666"

function fakeAssignment(): WorkOrderAssignment {
  return {
    id: ASSIGNMENT,
    workOrderId: "44444444-4444-4444-4444-444444444444",
    workOrderNumber: "WO-2026-0001",
    workOrderSubject: "Test",
    technicianId: "old-tech",
    technicianName: "Old",
    scheduledStart: "2026-06-10T09:00:00Z",
    scheduledEnd: "2026-06-10T11:00:00Z",
    estimatedDurationMinutes: 120,
    status: "scheduled",
    createdAt: "2026-06-09T00:00:00Z",
    updatedAt: "2026-06-09T00:00:00Z",
  }
}

function setup(overlaps: WorkOrderAssignment[] = []) {
  const reschedule = vi.fn().mockResolvedValue(fakeAssignment())
  const append = vi.fn().mockResolvedValue(undefined)
  const findOverlapping = vi.fn().mockResolvedValue(overlaps)
  const assignments = {
    getById: vi.fn().mockResolvedValue(fakeAssignment()),
    findOverlapping,
    reschedule,
  } as unknown as SchedulingRepository
  const technicians = {
    getById: vi.fn().mockResolvedValue({ id: TECH, status: "active", deletedAt: null }),
  } as unknown as TechnicianReader
  const workOrders = {
    getById: vi.fn().mockResolvedValue({
      id: "44444444-4444-4444-4444-444444444444",
      status: "scheduled",
    }),
  } as unknown as WorkOrderReader
  const audit = { append } as unknown as AuditRepository
  return { assignments, technicians, workOrders, audit, reschedule, append, findOverlapping }
}

const input = () => ({
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: REQUEST,
  id: ASSIGNMENT,
  technicianId: TECH,
  scheduledStart: "2026-06-11T09:00:00Z",
  scheduledEnd: "2026-06-11T10:30:00Z",
})

describe("reassignWorkOrder", () => {
  it("reassigns to an available technician and audits it", async () => {
    const deps = setup()
    await reassignWorkOrder(deps, input())
    expect(deps.findOverlapping).toHaveBeenCalledWith(
      TENANT,
      TECH,
      "2026-06-11T09:00:00Z",
      "2026-06-11T10:30:00Z",
      ASSIGNMENT,
    )
    expect(deps.reschedule).toHaveBeenCalledWith(
      TENANT,
      ASSIGNMENT,
      expect.objectContaining({ technicianId: TECH, estimatedDurationMinutes: 90 }),
    )
    expect(deps.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "assignment.reassigned" }),
    )
  })

  it("rejects when the new slot overlaps another assignment", async () => {
    const deps = setup([fakeAssignment()])
    await expect(reassignWorkOrder(deps, input())).rejects.toMatchObject({
      code: "ASSIGNMENT_OVERLAP",
    })
    expect(deps.reschedule).not.toHaveBeenCalled()
  })

  it("rejects when the work order is terminal (completed/cancelled)", async () => {
    const deps = setup()
    ;(deps.workOrders.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "44444444-4444-4444-4444-444444444444",
      status: "completed",
    })
    await expect(reassignWorkOrder(deps, input())).rejects.toMatchObject({
      code: "WORK_ORDER_TERMINAL",
    })
    expect(deps.reschedule).not.toHaveBeenCalled()
  })
})
