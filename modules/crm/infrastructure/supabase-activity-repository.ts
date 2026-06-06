import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ActivityRepository } from "@/modules/crm/application/ports/activity-repository"
import type {
  Activity,
  ActivityFilters,
  ActivityInput,
  ActivityStatus,
} from "@/modules/crm/domain/activity"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    body: row.body,
    companyId: row.company_id,
    contactId: row.contact_id,
    opportunityId: row.opportunity_id,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseActivityRepository implements ActivityRepository {
  private async listBy(
    column: "company_id" | "contact_id" | "opportunity_id",
    tenantId: UUID,
    targetId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]> {
    const client = await createServerSupabaseClient()
    let query = client
      .from("activities")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq(column, targetId)

    if (filters.type) query = query.eq("type", filters.type)
    if (filters.status) query = query.eq("status", filters.status)

    const { data, error } = await query.order("created_at", {
      ascending: false,
    })

    if (error) {
      throw new ApplicationError(
        "Unable to list activities.",
        "ACTIVITY_LIST_FAILED",
        error,
      )
    }
    return data.map(toActivity)
  }

  listForCompany(
    tenantId: UUID,
    companyId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]> {
    return this.listBy("company_id", tenantId, companyId, filters)
  }

  listForContact(
    tenantId: UUID,
    contactId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]> {
    return this.listBy("contact_id", tenantId, contactId, filters)
  }

  listForOpportunity(
    tenantId: UUID,
    opportunityId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]> {
    return this.listBy("opportunity_id", tenantId, opportunityId, filters)
  }

  async getById(tenantId: UUID, id: UUID): Promise<Activity | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("activities")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load activity.",
        "ACTIVITY_LOAD_FAILED",
        error,
      )
    }
    return data ? toActivity(data) : null
  }

  async create(
    tenantId: UUID,
    createdBy: UUID,
    input: ActivityInput,
  ): Promise<Activity> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("activities")
      .insert({
        tenant_id: tenantId,
        created_by: createdBy,
        type: input.type,
        subject: input.subject,
        body: input.body,
        due_at: input.dueAt,
        company_id: input.companyId,
        contact_id: input.contactId,
        opportunity_id: input.opportunityId,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create activity.",
        "ACTIVITY_CREATE_FAILED",
        error,
      )
    }
    return toActivity(data)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: ActivityInput,
  ): Promise<Activity> {
    const client = await createServerSupabaseClient()
    // Association (company/contact) is immutable after creation; only the
    // descriptive fields are editable.
    const { data, error } = await client
      .from("activities")
      .update({
        type: input.type,
        subject: input.subject,
        body: input.body,
        due_at: input.dueAt,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update activity.",
        "ACTIVITY_UPDATE_FAILED",
        error,
      )
    }
    return toActivity(data)
  }

  async setStatus(
    tenantId: UUID,
    id: UUID,
    status: ActivityStatus,
    completedAt: string | null,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("activities")
      .update({ status, completed_at: completedAt })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change activity status.",
        "ACTIVITY_STATUS_FAILED",
        error,
      )
    }
  }
}
