import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import { unassignWorkOrder } from "@/modules/scheduling/application/use-cases/unassign-work-order"
import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"
const REQUEST = "33333333-3333-3333-3333-333333333333"
const ASSIGNMENT = "66666666-6666-6666-6666-666666666666"

function fakeAssignment(): WorkOrderAssignment {
  return {
    id: ASSIGNMENT,
    workOrderId: "44444444-4444-4444-4444-444444444444",
    workOrderNumber: "WO-2026-0001",
    workOrderSubject: "Test",
    technicianId: "55555555-5555-5555-5555-555555555555",
    technicianName: "Ana",
    scheduledStart: "2026-06-10T09:00:00Z",
    scheduledEnd: "2026-06-10T11:00:00Z",
    estimatedDurationMinutes: 120,
    status: "scheduled",
    createdAt: "2026-06-09T00:00:00Z",
    updatedAt: "2026-06-09T00:00:00Z",
  }
}

const input = () => ({ actorId: ACTOR, tenantId: TENANT, requestId: REQUEST, id: ASSIGNMENT })

describe("unassignWorkOrder", () => {
  it("removes the assignment and audits it (happy path)", async () => {
    const del = vi.fn().mockResolvedValue(undefined)
    const append = vi.fn().mockResolvedValue(undefined)
    const assignments = {
      getById: vi.fn().mockResolvedValue(fakeAssignment()),
      delete: del,
    } as unknown as SchedulingRepository
    const audit = { append } as unknown as AuditRepository

    await unassignWorkOrder({ assignments, audit }, input())

    expect(del).toHaveBeenCalledWith(TENANT, ASSIGNMENT)
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "assignment.deleted" }),
    )
  })

  it("throws when the assignment does not exist", async () => {
    const del = vi.fn()
    const assignments = {
      getById: vi.fn().mockResolvedValue(null),
      delete: del,
    } as unknown as SchedulingRepository
    const audit = { append: vi.fn() } as unknown as AuditRepository

    await expect(
      unassignWorkOrder({ assignments, audit }, input()),
    ).rejects.toMatchObject({ code: "ASSIGNMENT_NOT_FOUND" })
    expect(del).not.toHaveBeenCalled()
  })
})
