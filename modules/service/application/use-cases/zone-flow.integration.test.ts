import { describe, expect, it } from "vitest"

import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { ZoneRepository } from "@/modules/service/application/ports/zone-repository"
import { archiveZone } from "@/modules/service/application/use-cases/archive-zone"
import { assignTechnicianZone } from "@/modules/service/application/use-cases/assign-technician-zone"
import { createZone } from "@/modules/service/application/use-cases/create-zone"
import { removeTechnicianZone } from "@/modules/service/application/use-cases/remove-technician-zone"
import type { TechnicianZone } from "@/modules/service/domain/technician-zone"

const TENANT = "11111111-1111-1111-1111-111111111111"
const TECH = "22222222-2222-2222-2222-222222222222"
const BASE = {
  actorId: "33333333-3333-3333-3333-333333333333",
  tenantId: TENANT,
  requestId: "44444444-4444-4444-4444-444444444444",
}

class InMemoryZoneRepo implements ZoneRepository {
  private zones = new Map<string, { id: string; name: string; archivedAt: string | null }>()
  private techZones = new Map<string, TechnicianZone>()
  private seq = 0

  async listZones() {
    return [...this.zones.values()]
      .filter((z) => z.archivedAt === null)
      .map((z) => ({ id: z.id, name: z.name, archivedAt: z.archivedAt, createdAt: "t", updatedAt: "t" }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  async createZone(_tenantId: string, input: { name: string }) {
    if ([...this.zones.values()].some((z) => z.archivedAt === null && z.name.toLowerCase() === input.name.toLowerCase())) {
      const err = new Error("unique") as Error & { code?: string }
      err.code = "23505"
      throw err
    }
    const id = `zone-${++this.seq}`
    this.zones.set(id, { id, name: input.name, archivedAt: null })
    return { id, name: input.name, archivedAt: null, createdAt: "t", updatedAt: "t" }
  }
  async archiveZone(_tenantId: string, id: string, archivedAt: string) {
    const z = this.zones.get(id)
    if (z) z.archivedAt = archivedAt
  }
  async listTechnicianZones(_tenantId: string, technicianId: string) {
    return technicianId === TECH ? [...this.techZones.values()] : []
  }
  async assignTechnicianZone(_tenantId: string, _technicianId: string, zoneId: string) {
    const name = this.zones.get(zoneId)?.name ?? "—"
    this.techZones.set(zoneId, { zoneId, zoneName: name, createdAt: "t", updatedAt: "t" })
  }
  async removeTechnicianZone(_tenantId: string, _technicianId: string, zoneId: string) {
    this.techZones.delete(zoneId)
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
  async listRecentByEventType() {
    return []
  }
}

describe("zone flow (integration over use-cases)", () => {
  it("runs create → assign (idempotent) → remove → archive with audit trail", async () => {
    const zones = new InMemoryZoneRepo()
    const audit = new FakeAudit()
    const deps = { zones, audit }

    const north = await createZone(deps, { ...BASE, data: { name: "Medellín Norte" } })
    await createZone(deps, { ...BASE, data: { name: "Medellín Sur" } })
    expect((await zones.listZones()).map((z) => z.name)).toEqual(["Medellín Norte", "Medellín Sur"])

    // Duplicate name rejected.
    await expect(createZone(deps, { ...BASE, data: { name: "medellín norte" } })).rejects.toThrow()

    // Assign twice → idempotent (one coverage row).
    await assignTechnicianZone(deps, { ...BASE, technicianId: TECH, zoneId: north.id })
    await assignTechnicianZone(deps, { ...BASE, technicianId: TECH, zoneId: north.id })
    expect(await zones.listTechnicianZones(TENANT, TECH)).toHaveLength(1)

    // Remove coverage.
    await removeTechnicianZone(deps, { ...BASE, technicianId: TECH, zoneId: north.id })
    expect(await zones.listTechnicianZones(TENANT, TECH)).toHaveLength(0)

    // Archive → drops from catalog; name reusable.
    await archiveZone(deps, { ...BASE, id: north.id, archivedAt: "2026-06-13T00:00:00Z" })
    expect((await zones.listZones()).map((z) => z.name)).toEqual(["Medellín Sur"])
    await expect(createZone(deps, { ...BASE, data: { name: "Medellín Norte" } })).resolves.toMatchObject({
      name: "Medellín Norte",
    })

    const types = audit.events.map((e) => e.eventType)
    expect(types).toContain("service.zone.created")
    expect(types).toContain("service.technician_zone.assigned")
    expect(types).toContain("service.technician_zone.removed")
    expect(types).toContain("service.zone.archived")
  })
})
