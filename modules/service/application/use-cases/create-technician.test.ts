import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import { createTechnician } from "@/modules/service/application/use-cases/create-technician"
import type { Technician, TechnicianInput } from "@/modules/service/domain/technician"

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

const data: TechnicianInput = {
  firstName: "Ana",
  lastName: "Gómez",
  email: "ana@example.com",
  phone: null,
  employeeId: "EMP-001",
  status: "active",
}

function setup(overrides: Partial<Record<keyof TechnicianRepository, unknown>> = {}) {
  const create = vi.fn().mockResolvedValue(fakeTechnician())
  const append = vi.fn().mockResolvedValue(undefined)
  const technicians = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findByEmployeeId: vi.fn().mockResolvedValue(null),
    create,
    ...overrides,
  } as unknown as TechnicianRepository
  const audit = { append } as unknown as AuditRepository
  return { technicians, audit, create, append }
}

const input = () => ({ actorId: ACTOR, tenantId: TENANT, requestId: REQUEST, data })

describe("createTechnician", () => {
  it("creates a technician and audits it", async () => {
    const { technicians, audit, create, append } = setup()
    const result = await createTechnician({ technicians, audit }, input())

    expect(create).toHaveBeenCalledWith(TENANT, data)
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "technician.created" }),
    )
    expect(result.id).toBe(TECH)
  })

  it("rejects a duplicate email in the same tenant", async () => {
    const { technicians, audit, create } = setup({
      findByEmail: vi.fn().mockResolvedValue(fakeTechnician({ id: "other" })),
    })
    await expect(
      createTechnician({ technicians, audit }, input()),
    ).rejects.toMatchObject({ code: "TECHNICIAN_EMAIL_TAKEN" })
    expect(create).not.toHaveBeenCalled()
  })

  it("rejects a duplicate employee_id in the same tenant", async () => {
    const { technicians, audit, create } = setup({
      findByEmployeeId: vi.fn().mockResolvedValue(fakeTechnician({ id: "other" })),
    })
    await expect(
      createTechnician({ technicians, audit }, input()),
    ).rejects.toMatchObject({ code: "TECHNICIAN_EMPLOYEE_ID_TAKEN" })
    expect(create).not.toHaveBeenCalled()
  })
})
