import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { CrmStatus } from "@/modules/crm/domain/company"
import type { Contact, ContactInput } from "@/modules/crm/domain/contact"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"]
type ContactRowWithCompany = ContactRow & {
  companies: { name: string } | null
}

const SELECT_WITH_COMPANY = "*, companies(name)"

function toContact(row: ContactRowWithCompany): Contact {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    title: row.title,
    department: row.department,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(tenantId: UUID, input: ContactInput) {
  return {
    tenant_id: tenantId,
    company_id: input.companyId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    mobile: input.mobile,
    title: input.title,
    department: input.department,
    notes: input.notes,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseContactRepository implements ContactRepository {
  async list(
    tenantId: UUID,
    { search, page, pageSize }: ListQuery,
  ): Promise<Paginated<Contact>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("contacts")
      .select(SELECT_WITH_COMPANY, { count: "estimated" })
      .eq("tenant_id", tenantId)

    const term = search ? sanitizeSearch(search) : ""
    if (term) {
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`,
      )
    }

    const { data, error, count } = await query
      .order("last_name", { nullsFirst: false })
      .order("first_name")
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list contacts.",
        "CONTACT_LIST_FAILED",
        error,
      )
    }

    return {
      items: (data as unknown as ContactRowWithCompany[]).map(toContact),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Contact | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("contacts")
      .select(SELECT_WITH_COMPANY)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load contact.",
        "CONTACT_LOAD_FAILED",
        error,
      )
    }
    return data ? toContact(data as unknown as ContactRowWithCompany) : null
  }

  async create(tenantId: UUID, input: ContactInput): Promise<Contact> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("contacts")
      .insert(toRow(tenantId, input))
      .select(SELECT_WITH_COMPANY)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create contact.",
        "CONTACT_CREATE_FAILED",
        error,
      )
    }
    return toContact(data as unknown as ContactRowWithCompany)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: ContactInput,
  ): Promise<Contact> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("contacts")
      .update(toRow(tenantId, input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(SELECT_WITH_COMPANY)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update contact.",
        "CONTACT_UPDATE_FAILED",
        error,
      )
    }
    return toContact(data as unknown as ContactRowWithCompany)
  }

  async listActiveOptions(tenantId: UUID) {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("contacts")
      .select("id, first_name, last_name, company_id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("last_name", { nullsFirst: false })
      .order("first_name")

    if (error) {
      throw new ApplicationError(
        "Unable to list contact options.",
        "CONTACT_OPTIONS_FAILED",
        error,
      )
    }
    return data.map((row) => ({
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      companyId: row.company_id,
    }))
  }

  async setStatus(tenantId: UUID, id: UUID, status: CrmStatus): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("contacts")
      .update({ status })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change contact status.",
        "CONTACT_STATUS_FAILED",
        error,
      )
    }
  }
}
