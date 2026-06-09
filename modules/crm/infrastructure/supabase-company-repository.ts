import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type {
  Company,
  CompanyInput,
  CompanyOption,
  CrmStatus,
} from "@/modules/crm/domain/company"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"]

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    taxId: row.tax_id,
    industry: row.industry,
    website: row.website,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(tenantId: UUID, input: CompanyInput) {
  return {
    tenant_id: tenantId,
    name: input.name,
    tax_id: input.taxId,
    industry: input.industry,
    website: input.website,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    country: input.country,
    notes: input.notes,
  }
}

// Strips characters that would break a PostgREST or() filter expression.
function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseCompanyRepository implements CompanyRepository {
  async list(
    tenantId: UUID,
    { search, page, pageSize }: ListQuery,
  ): Promise<Paginated<Company>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("companies")
      .select("*", { count: "estimated" })
      .eq("tenant_id", tenantId)

    const term = search ? sanitizeSearch(search) : ""
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,tax_id.ilike.%${term}%,city.ilike.%${term}%`,
      )
    }

    const { data, error, count } = await query
      .order("name")
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list companies.",
        "COMPANY_LIST_FAILED",
        error,
      )
    }

    return {
      items: data.map(toCompany),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Company | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("companies")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load company.",
        "COMPANY_LOAD_FAILED",
        error,
      )
    }
    return data ? toCompany(data) : null
  }

  async create(tenantId: UUID, input: CompanyInput): Promise<Company> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("companies")
      .insert(toRow(tenantId, input))
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create company.",
        "COMPANY_CREATE_FAILED",
        error,
      )
    }
    return toCompany(data)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: CompanyInput,
  ): Promise<Company> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("companies")
      .update(toRow(tenantId, input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update company.",
        "COMPANY_UPDATE_FAILED",
        error,
      )
    }
    return toCompany(data)
  }

  async setStatus(tenantId: UUID, id: UUID, status: CrmStatus): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("companies")
      .update({ status })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change company status.",
        "COMPANY_STATUS_FAILED",
        error,
      )
    }
  }

  async listActiveOptions(tenantId: UUID): Promise<CompanyOption[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("companies")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to list company options.",
        "COMPANY_OPTIONS_FAILED",
        error,
      )
    }
    return data.map((row) => ({ id: row.id, name: row.name }))
  }
}
