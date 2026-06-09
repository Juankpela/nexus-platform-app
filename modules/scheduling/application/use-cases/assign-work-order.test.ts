import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type {
  TechnicianReader,
  TechnicianView,
  WorkOrderReader,
} from "@/modules/scheduling/application/ports/readers"
import { assignWorkOrder } from "@/modules/scheduling/application/use-cases/assign-work-order"
import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"
const REQUEST = "33333333-3333-3333-3333-333333333333"
const WO = "44444444-4444-4444-4444-444444444444"
const TECH = "55555555-5555-5555-5555-555555555555"
const ASSIGNMENT = "66666666-6666-6666-6666-666666666666"

function fakeAssignment(): WorkOrderAssignment {
  return {
    id: ASSIGNMENT,
    workOrderId: WO,
    workOrderNumber: "WO-2026-0001",
    workOrderSubject: "Test",
    technicianId: TECH,
    technicianName: "Ana Gómez",
    scheduledStart: "2026-06-10T09:00:00Z",
    scheduledEnd: "2026-06-10T11:00:00Z",
    estimatedDurationMinutes: 120,
    status: "scheduled",
    createdAt: "2026-06-09T00:00:00Z",
    updatedAt: "2026-06-09T00:00:00Z",
  }
}

function setup(opts: {
  workOrder?: { id: string } | null
  technician?: TechnicianView | null
  overlaps?: WorkOrderAssignment[]
}) {
  const create = vi.fn().mockResolvedValue(fakeAssignment())
  const append = vi.fn().mockResolvedValue(undefined)
  const findOverlapping = vi.fn().mockResolvedValue(opts.overlaps ?? [])
  const assignments = { findOverlapping, create } as unknown as SchedulingRepository
  const technicians = {
    getById: vi.fn().mockResolvedValue(
      opts.technician === undefined
        ? { id: TECH, status: "active", deletedAt: null }
        : opts.technician,
    ),
  } as unknown as TechnicianReader
  const workOrders = {
    getById: vi.fn().mockResolvedValue(
      opts.workOrder === undefined ? { id: WO } : opts.workOrder,
    ),
  } as unknown as WorkOrderReader
  const audit = { append } as unknown as AuditRepository
  return { assignments, technicians, workOrders, audit, create, append, findOverlapping }
}

const input = () => ({
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: REQUEST,
  data: {
    workOrderId: WO,
    technicianId: TECH,
    scheduledStart: "2026-06-10T09:00:00Z",
    scheduledEnd: "2026-06-10T11:00:00Z",
  },
})

describe("assignWorkOrder", () => {
  it("creates a valid assignment and audits it", async () => {
    const deps = setup({})
    const result = await assignWorkOrder(deps, input())
    expect(deps.create).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        workOrderId: WO,
        technicianId: TECH,
        estimatedDurationMinutes: 120,
      }),
    )
    expect(deps.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "assignment.created" }),
    )
    expect(result.id).toBe(ASSIGNMENT)
  })

  it("rejects an overlapping assignment", async () => {
    const deps = setup({ overlaps: [fakeAssignment()] })
    await expect(assignWorkOrder(deps, input())).rejects.toMatchObject({
      code: "ASSIGNMENT_OVERLAP",
    })
    expect(deps.create).not.toHaveBeenCalled()
  })

  it("rejects an inactive technician", async () => {
    const deps = setup({
      technician: { id: TECH, status: "inactive", deletedAt: null },
    })
    await expect(assignWorkOrder(deps, input())).rejects.toMatchObject({
      code: "TECHNICIAN_UNAVAILABLE",
    })
    expect(deps.create).not.toHaveBeenCalled()
  })

  it("rejects an on-leave technician", async () => {
    const deps = setup({
      technician: { id: TECH, status: "on_leave", deletedAt: null },
    })
    await expect(assignWorkOrder(deps, input())).rejects.toMatchObject({
      code: "TECHNICIAN_UNAVAILABLE",
    })
  })

  it("rejects when the work order is not in the tenant (cross-tenant)", async () => {
    const deps = setup({ workOrder: null })
    await expect(assignWorkOrder(deps, input())).rejects.toMatchObject({
      code: "WORK_ORDER_NOT_FOUND",
    })
    expect(deps.create).not.toHaveBeenCalled()
  })
})
