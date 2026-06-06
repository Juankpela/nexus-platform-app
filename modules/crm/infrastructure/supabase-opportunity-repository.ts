import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import type {
  Opportunity,
  OpportunityFilters,
  OpportunityInput,
  OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"]
type OpportunityRowWithRefs = OpportunityRow & {
  companies: { name: string } | null
  contacts: { first_name: string; last_name: string | null } | null
}

const SELECT_WITH_REFS =
  "*, companies(name), contacts(first_name, last_name)"

function toOpportunity(row: OpportunityRowWithRefs): Opportunity {
  const contactName = row.contacts
    ? [row.contacts.first_name, row.contacts.last_name]
        .filter(Boolean)
        .join(" ")
    : null
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    contactId: row.contact_id,
    contactName,
    name: row.name,
    businessType: row.business_type,
    estimatedValue: row.estimated_value,
    probability: row.probability,
    status: row.status,
    expectedCloseDate: row.expected_close_date,
    ownerId: row.owner_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: OpportunityInput) {
  return {
    company_id: input.companyId,
    contact_id: input.contactId,
    name: input.name,
    business_type: input.businessType,
    estimated_value: input.estimatedValue,
    probability: input.probability,
    expected_close_date: input.expectedCloseDate,
    description: input.description,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseOpportunityRepository implements OpportunityRepository {
  async list(
    tenantId: UUID,
    filters: OpportunityFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Opportunity>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("opportunities")
      .select(SELECT_WITH_REFS, { count: "exact" })
      .eq("tenant_id", tenantId)

    if (filters.status) query = query.eq("status", filters.status)
    const term = filters.search ? sanitizeSearch(filters.search) : ""
    if (term) query = query.ilike("name", `%${term}%`)

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list opportunities.",
        "OPPORTUNITY_LIST_FAILED",
        error,
      )
    }

    return {
      items: (data as unknown as OpportunityRowWithRefs[]).map(toOpportunity),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Opportunity | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("opportunities")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load opportunity.",
        "OPPORTUNITY_LOAD_FAILED",
        error,
      )
    }
    return data ? toOpportunity(data as unknown as OpportunityRowWithRefs) : null
  }

  async create(
    tenantId: UUID,
    ownerId: UUID,
    input: OpportunityInput,
  ): Promise<Opportunity> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("opportunities")
      .insert({ tenant_id: tenantId, owner_id: ownerId, ...toRow(input) })
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create opportunity.",
        "OPPORTUNITY_CREATE_FAILED",
        error,
      )
    }
    return toOpportunity(data as unknown as OpportunityRowWithRefs)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: OpportunityInput,
  ): Promise<Opportunity> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("opportunities")
      .update(toRow(input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update opportunity.",
        "OPPORTUNITY_UPDATE_FAILED",
        error,
      )
    }
    return toOpportunity(data as unknown as OpportunityRowWithRefs)
  }

  async setStatus(
    tenantId: UUID,
    id: UUID,
    status: OpportunityStatus,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("opportunities")
      .update({ status })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change opportunity status.",
        "OPPORTUNITY_STATUS_FAILED",
        error,
      )
    }
  }

  async setOwner(
    tenantId: UUID,
    id: UUID,
    ownerId: UUID | null,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("opportunities")
      .update({ owner_id: ownerId })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to assign opportunity owner.",
        "OPPORTUNITY_OWNER_FAILED",
        error,
      )
    }
  }
}
