import { describe, expect, it } from "vitest"

import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { AvailabilityRepository } from "@/modules/service/application/ports/availability-repository"
import {
  addAvailabilityException,
  addAvailabilityWindow,
  removeAvailabilityWindow,
  setTechnicianCapacity,
} from "@/modules/service/application/use-cases/availability-use-cases"
import type {
  AvailabilityException,
  AvailabilityExceptionInput,
  TechnicianCapacity,
  WeeklyWindow,
  WeeklyWindowInput,
} from "@/modules/service/domain/availability"

const BASE = {
  actorId: "33333333-3333-3333-3333-333333333333",
  tenantId: "11111111-1111-1111-1111-111111111111",
  requestId: "44444444-4444-4444-4444-444444444444",
  technicianId: "22222222-2222-2222-2222-222222222222",
}

class InMemoryAvailabilityRepo implements AvailabilityRepository {
  windows: WeeklyWindow[] = []
  exceptions: AvailabilityException[] = []
  capacity: TechnicianCapacity = { maxWorkOrdersPerDay: null, maxMinutesPerDay: null }
  private seq = 0

  async listWindows() {
    return this.windows
  }
  async addWindow(_t: string, _tech: string, input: WeeklyWindowInput) {
    const w: WeeklyWindow = { id: `w-${++this.seq}`, ...input, createdAt: "t", updatedAt: "t" }
    this.windows.push(w)
    return w
  }
  async removeWindow(_t: string, _tech: string, id: string) {
    this.windows = this.windows.filter((w) => w.id !== id)
  }
  async listExceptions() {
    return this.exceptions
  }
  async addException(_t: string, _tech: string, input: AvailabilityExceptionInput) {
    const e: AvailabilityException = { id: `e-${++this.seq}`, ...input, createdAt: "t", updatedAt: "t" }
    this.exceptions.push(e)
    return e
  }
  async removeException(_t: string, _tech: string, id: string) {
    this.exceptions = this.exceptions.filter((e) => e.id !== id)
  }
  async getCapacity() {
    return this.capacity
  }
  async setCapacity(_t: string, _tech: string, capacity: TechnicianCapacity) {
    this.capacity = capacity
  }
}

class FakeAudit {
  events: AuditEvent[] = []
  async append(e: AuditEvent) {
    this.events.push(e)
  }
  async listBySubject() {
    return []
  }
}

describe("availability flow (integration over use-cases)", () => {
  it("adds/removes windows, adds exceptions, sets capacity — with validation and audit", async () => {
    const availability = new InMemoryAvailabilityRepo()
    const audit = new FakeAudit()
    const deps = { availability, audit }

    // Add a valid Monday window 08:00–17:00.
    const w = await addAvailabilityWindow(deps, { ...BASE, data: { weekday: 1, startMinute: 480, endMinute: 1020 } })
    expect(availability.windows).toHaveLength(1)

    // Invalid window (end <= start) is rejected before touching the repo.
    await expect(
      addAvailabilityWindow(deps, { ...BASE, data: { weekday: 2, startMinute: 600, endMinute: 600 } }),
    ).rejects.toMatchObject({ code: "INVALID_AVAILABILITY_WINDOW" })
    expect(availability.windows).toHaveLength(1)

    // Remove the window.
    await removeAvailabilityWindow(deps, { ...BASE, windowId: w.id })
    expect(availability.windows).toHaveLength(0)

    // Full-day vacation exception.
    await addAvailabilityException(deps, {
      ...BASE,
      data: { dateFrom: "2026-07-01", dateTo: "2026-07-05", startMinute: null, endMinute: null, kind: "vacation", note: null },
    })
    expect(availability.exceptions).toHaveLength(1)

    // Inverted date range is rejected.
    await expect(
      addAvailabilityException(deps, {
        ...BASE,
        data: { dateFrom: "2026-07-10", dateTo: "2026-07-01", startMinute: null, endMinute: null, kind: "sick", note: null },
      }),
    ).rejects.toMatchObject({ code: "INVALID_EXCEPTION_RANGE" })

    // Partial exception with invalid window is rejected.
    await expect(
      addAvailabilityException(deps, {
        ...BASE,
        data: { dateFrom: "2026-07-01", dateTo: "2026-07-01", startMinute: 600, endMinute: 500, kind: "manual_block", note: null },
      }),
    ).rejects.toMatchObject({ code: "INVALID_EXCEPTION_WINDOW" })

    // Set capacity.
    await setTechnicianCapacity(deps, { ...BASE, capacity: { maxWorkOrdersPerDay: 8, maxMinutesPerDay: 480 } })
    expect(availability.capacity).toEqual({ maxWorkOrdersPerDay: 8, maxMinutesPerDay: 480 })

    const types = audit.events.map((e) => e.eventType)
    expect(types).toContain("service.availability.window_added")
    expect(types).toContain("service.availability.window_removed")
    expect(types).toContain("service.availability.exception_added")
    expect(types).toContain("service.technician.capacity_set")
  })
})
