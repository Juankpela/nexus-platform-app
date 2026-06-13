import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { Skill, SkillInput } from "@/modules/service/domain/skill"
import type {
  TechnicianSkill,
  TechnicianSkillInput,
} from "@/modules/service/domain/technician-skill"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

const PG_UNIQUE_VIOLATION = "23505"

type SkillRow = Database["public"]["Tables"]["skills"]["Row"]
type TechnicianSkillRowWithRef =
  Database["public"]["Tables"]["technician_skills"]["Row"] & {
    skills: { name: string } | null
  }

function toSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseSkillRepository implements SkillRepository {
  async listSkills(tenantId: UUID): Promise<Skill[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("skills")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("archived_at", null)
      .order("name", { ascending: true })

    if (error) {
      throw new ApplicationError("Unable to list skills.", "SKILL_LIST_FAILED", error)
    }
    return (data ?? []).map(toSkill)
  }

  async createSkill(tenantId: UUID, input: SkillInput): Promise<Skill> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("skills")
      .insert({ tenant_id: tenantId, name: input.name })
      .select("*")
      .single()

    if (error || !data) {
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ApplicationError("Skill name already exists.", "SKILL_NAME_TAKEN", error)
      }
      throw new ApplicationError("Unable to create skill.", "SKILL_CREATE_FAILED", error)
    }
    return toSkill(data)
  }

  async archiveSkill(tenantId: UUID, id: UUID, archivedAt: string): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("skills")
      .update({ archived_at: archivedAt })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError("Unable to archive skill.", "SKILL_ARCHIVE_FAILED", error)
    }
  }

  async listTechnicianSkills(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<TechnicianSkill[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technician_skills")
      .select("skill_id, level, created_at, updated_at, skills(name)")
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)

    if (error) {
      throw new ApplicationError(
        "Unable to list technician skills.",
        "TECHNICIAN_SKILL_LIST_FAILED",
        error,
      )
    }
    return (data as unknown as TechnicianSkillRowWithRef[])
      .map((row) => ({
        skillId: row.skill_id,
        skillName: row.skills?.name ?? "—",
        level: row.level,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
      .sort((a, b) => a.skillName.localeCompare(b.skillName))
  }

  async assignTechnicianSkill(
    tenantId: UUID,
    technicianId: UUID,
    input: TechnicianSkillInput,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    // Upsert the level for this (technician, skill) pair.
    const { error } = await client
      .from("technician_skills")
      .upsert(
        {
          tenant_id: tenantId,
          technician_id: technicianId,
          skill_id: input.skillId,
          level: input.level,
        },
        { onConflict: "tenant_id,technician_id,skill_id" },
      )

    if (error) {
      throw new ApplicationError(
        "Unable to assign skill to technician.",
        "TECHNICIAN_SKILL_ASSIGN_FAILED",
        error,
      )
    }
  }

  async removeTechnicianSkill(
    tenantId: UUID,
    technicianId: UUID,
    skillId: UUID,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("technician_skills")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("technician_id", technicianId)
      .eq("skill_id", skillId)

    if (error) {
      throw new ApplicationError(
        "Unable to remove technician skill.",
        "TECHNICIAN_SKILL_REMOVE_FAILED",
        error,
      )
    }
  }
}
