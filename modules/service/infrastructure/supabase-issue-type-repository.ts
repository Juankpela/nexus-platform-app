import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { IssueTypeRepository } from "@/modules/service/application/ports/issue-type-repository"
import type {
  IssueType,
  IssueTypeInput,
  IssueTypePatch,
} from "@/modules/service/domain/issue-type"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

const PG_UNIQUE_VIOLATION = "23505"

type IssueTypeRow = Database["public"]["Tables"]["service_issue_types"]["Row"]
type IssueTypeRowWithSkill = IssueTypeRow & { skills: { name: string } | null }

const SELECT_WITH_SKILL = "*, skills(name)"

function toIssueType(row: IssueTypeRowWithSkill): IssueType {
  return {
    id: row.id,
    skillId: row.skill_id,
    skillName: row.skills?.name ?? null,
    name: row.name,
    description: row.description,
    active: row.active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseIssueTypeRepository implements IssueTypeRepository {
  async listByTenant(tenantId: UUID): Promise<IssueType[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("service_issue_types")
      .select(SELECT_WITH_SKILL)
      .eq("tenant_id", tenantId)
      .order("skill_id", { ascending: true })
      .order("display_order", { ascending: true })

    if (error) {
      throw new ApplicationError(
        "Unable to list issue types.",
        "ISSUE_TYPE_LIST_FAILED",
        error,
      )
    }
    return (data as unknown as IssueTypeRowWithSkill[]).map(toIssueType)
  }

  async listActiveBySkill(tenantId: UUID, skillId: UUID): Promise<IssueType[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("service_issue_types")
      .select(SELECT_WITH_SKILL)
      .eq("tenant_id", tenantId)
      .eq("skill_id", skillId)
      .eq("active", true)
      .order("display_order", { ascending: true })

    if (error) {
      throw new ApplicationError(
        "Unable to list issue types for skill.",
        "ISSUE_TYPE_LIST_FAILED",
        error,
      )
    }
    return (data as unknown as IssueTypeRowWithSkill[]).map(toIssueType)
  }

  async create(tenantId: UUID, input: IssueTypeInput): Promise<IssueType> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("service_issue_types")
      .insert({
        tenant_id: tenantId,
        skill_id: input.skillId,
        name: input.name,
        description: input.description ?? null,
        display_order: input.displayOrder ?? 0,
      } as never)
      .select(SELECT_WITH_SKILL)
      .single()

    if (error || !data) {
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ApplicationError(
          "Issue type name already exists for this skill.",
          "ISSUE_TYPE_NAME_TAKEN",
          error,
        )
      }
      throw new ApplicationError(
        "Unable to create issue type.",
        "ISSUE_TYPE_CREATE_FAILED",
        error,
      )
    }
    return toIssueType(data as unknown as IssueTypeRowWithSkill)
  }

  async update(tenantId: UUID, id: UUID, patch: IssueTypePatch): Promise<void> {
    const client = await createServerSupabaseClient()
    const row: Record<string, unknown> = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.description !== undefined) row.description = patch.description
    if (patch.active !== undefined) row.active = patch.active
    if (patch.displayOrder !== undefined) row.display_order = patch.displayOrder
    if (Object.keys(row).length === 0) return

    const { error } = await client
      .from("service_issue_types")
      .update(row as never)
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw new ApplicationError(
          "Issue type name already exists for this skill.",
          "ISSUE_TYPE_NAME_TAKEN",
          error,
        )
      }
      throw new ApplicationError(
        "Unable to update issue type.",
        "ISSUE_TYPE_UPDATE_FAILED",
        error,
      )
    }
  }
}
