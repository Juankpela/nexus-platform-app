import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import { deactivateTechnician } from "@/modules/service/application/use-cases/deactivate-technician"
import type { Technician } from "@/modules/service/domain/technician"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "33333333-3333-3333-3333-333333333333"
const REQUEST = "44444444-4444-4444-4444-444444444444"
const TECH = "55555555-5555-5555-5555-555555555555"

function fakeTechnician(over: Partial<Technician> = {}): Technician {
  return {
    id: TECH,
    firstName: "Ana",
    lastName: "Gómez",
    email: "ana@example.com",
    phone: null,
    employeeId: "EMP-001",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
    ...over,
  }
}

const input = () => ({ actorId: ACTOR, tenantId: TENANT, requestId: REQUEST, id: TECH })

describe("deactivateTechnician", () => {
  it("soft-deletes an active technician and audits it", async () => {
    const softDelete = vi.fn().mockResolvedValue(undefined)
    const append = vi.fn().mockResolvedValue(undefined)
    const technicians = {
      getById: vi.fn().mockResolvedValue(fakeTechnician()),
      softDelete,
    } as unknown as TechnicianRepository
    const audit = { append } as unknown as AuditRepository

    await deactivateTechnician({ technicians, audit }, input())

    expect(softDelete).toHaveBeenCalledWith(TENANT, TECH, expect.any(String))
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "technician.deactivated" }),
    )
  })

  it("throws when the technician does not exist", async () => {
    const softDelete = vi.fn()
    const technicians = {
      getById: vi.fn().mockResolvedValue(null),
      softDelete,
    } as unknown as TechnicianRepository
    const audit = { append: vi.fn() } as unknown as AuditRepository

    await expect(
      deactivateTechnician({ technicians, audit }, input()),
    ).rejects.toMatchObject({ code: "TECHNICIAN_NOT_FOUND" })
    expect(softDelete).not.toHaveBeenCalled()
  })

  it("is rejected when the technician is already soft-deleted", async () => {
    const softDelete = vi.fn()
    const technicians = {
      getById: vi
        .fn()
        .mockResolvedValue(fakeTechnician({ deletedAt: "2026-02-01T00:00:00Z" })),
      softDelete,
    } as unknown as TechnicianRepository
    const audit = { append: vi.fn() } as unknown as AuditRepository

    await expect(
      deactivateTechnician({ technicians, audit }, input()),
    ).rejects.toMatchObject({ code: "TECHNICIAN_NOT_FOUND" })
    expect(softDelete).not.toHaveBeenCalled()
  })
})
