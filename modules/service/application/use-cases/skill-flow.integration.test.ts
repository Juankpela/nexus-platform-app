import { describe, expect, it } from "vitest"

import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import { archiveSkill } from "@/modules/service/application/use-cases/archive-skill"
import { assignTechnicianSkill } from "@/modules/service/application/use-cases/assign-technician-skill"
import { createSkill } from "@/modules/service/application/use-cases/create-skill"
import { removeTechnicianSkill } from "@/modules/service/application/use-cases/remove-technician-skill"
import { meetsSkillLevel } from "@/modules/service/domain/skill"
import type { TechnicianSkill } from "@/modules/service/domain/technician-skill"

const TENANT = "11111111-1111-1111-1111-111111111111"
const TECH = "22222222-2222-2222-2222-222222222222"
const ACTOR = "33333333-3333-3333-3333-333333333333"
const REQ = "44444444-4444-4444-4444-444444444444"

/** In-memory repo that mirrors the Supabase semantics: unique active name, upsert level, soft-archive. */
class InMemorySkillRepo implements SkillRepository {
  private skills = new Map<string, { id: string; name: string; archivedAt: string | null }>()
  private techSkills = new Map<string, TechnicianSkill>()
  private seq = 0

  async listSkills(tenantId: string) {
    void tenantId
    return [...this.skills.values()]
      .filter((s) => s.archivedAt === null)
      .map((s) => ({ id: s.id, name: s.name, archivedAt: s.archivedAt, createdAt: "t", updatedAt: "t" }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  async createSkill(tenantId: string, input: { name: string }) {
    void tenantId
    const dup = [...this.skills.values()].some(
      (s) => s.archivedAt === null && s.name.toLowerCase() === input.name.toLowerCase(),
    )
    if (dup) {
      const err = new Error("unique") as Error & { code?: string }
      err.code = "23505"
      throw err
    }
    const id = `skill-${++this.seq}`
    this.skills.set(id, { id, name: input.name, archivedAt: null })
    return { id, name: input.name, archivedAt: null, createdAt: "t", updatedAt: "t" }
  }
  async archiveSkill(tenantId: string, id: string, archivedAt: string) {
    void tenantId
    const s = this.skills.get(id)
    if (s) s.archivedAt = archivedAt
  }
  async listTechnicianSkills(tenantId: string, technicianId: string) {
    void tenantId
    return technicianId === TECH ? [...this.techSkills.values()] : []
  }
  async assignTechnicianSkill(tenantId: string, technicianId: string, input: { skillId: string; level: TechnicianSkill["level"] }) {
    void tenantId
    void technicianId
    const name = this.skills.get(input.skillId)?.name ?? "—"
    this.techSkills.set(input.skillId, {
      skillId: input.skillId,
      skillName: name,
      level: input.level,
      createdAt: "t",
      updatedAt: "t",
    })
  }
  async removeTechnicianSkill(tenantId: string, technicianId: string, skillId: string) {
    void tenantId
    void technicianId
    this.techSkills.delete(skillId)
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

describe("skill flow (integration over use-cases)", () => {
  it("runs the full lifecycle: create → assign (upsert level) → eligibility check → remove → archive", async () => {
    const skills = new InMemorySkillRepo()
    const audit = new FakeAudit()
    const deps = { skills, audit }
    const base = { actorId: ACTOR, tenantId: TENANT, requestId: REQ }

    // 1. Create two catalog skills.
    const refrig = await createSkill(deps, { ...base, data: { name: "Refrigeración" } })
    await createSkill(deps, { ...base, data: { name: "Electricidad" } })
    expect((await skills.listSkills(TENANT)).map((s) => s.name)).toEqual([
      "Electricidad",
      "Refrigeración",
    ])

    // 2. Duplicate name is rejected.
    await expect(createSkill(deps, { ...base, data: { name: "refrigeración" } })).rejects.toThrow()

    // 3. Assign at 'mid', then re-assign 'senior' (upsert, not duplicate).
    await assignTechnicianSkill(deps, { ...base, technicianId: TECH, data: { skillId: refrig.id, level: "mid" } })
    await assignTechnicianSkill(deps, { ...base, technicianId: TECH, data: { skillId: refrig.id, level: "senior" } })
    const assigned = await skills.listTechnicianSkills(TENANT, TECH)
    expect(assigned).toHaveLength(1)
    expect(assigned[0].level).toBe("senior")

    // 4. Eligibility-readiness: the held level satisfies a 'mid' requirement (PR4 will consume this).
    expect(meetsSkillLevel(assigned[0].level, "mid")).toBe(true)
    expect(meetsSkillLevel(assigned[0].level, "expert")).toBe(false)

    // 5. Remove the skill from the technician.
    await removeTechnicianSkill(deps, { ...base, technicianId: TECH, skillId: refrig.id })
    expect(await skills.listTechnicianSkills(TENANT, TECH)).toHaveLength(0)

    // 6. Archive a catalog skill → drops out of the active catalog; name can be reused.
    await archiveSkill(deps, { ...base, id: refrig.id, archivedAt: "2026-06-13T00:00:00Z" })
    expect((await skills.listSkills(TENANT)).map((s) => s.name)).toEqual(["Electricidad"])
    await expect(
      createSkill(deps, { ...base, data: { name: "Refrigeración" } }),
    ).resolves.toMatchObject({ name: "Refrigeración" })

    // 7. Every mutation left an audit trail.
    const types = audit.events.map((e) => e.eventType)
    expect(types).toContain("service.skill.created")
    expect(types).toContain("service.technician_skill.assigned")
    expect(types).toContain("service.technician_skill.removed")
    expect(types).toContain("service.skill.archived")
  })
})
