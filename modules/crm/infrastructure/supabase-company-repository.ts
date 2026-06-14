import "server-only"

import type { ImportResult } from "@/lib/csv/import-result"
import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type {
  Company,
  CompanyInput,
  CompanyOption,
  CrmStatus,
} from "@/modules/crm/domain/company"
import {
  companyDedupKey,
  type CompanyImportRow,
} from "@/modules/crm/domain/company-import"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

/** Max rows per insert call — keeps a single failing row from sinking the file. */
const IMPORT_CHUNK_SIZE = 500

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

  async importBatch(
    tenantId: UUID,
    rows: CompanyImportRow[],
  ): Promise<ImportResult> {
    const errors: ImportResult["errors"] = []
    let skipped = 0

    const client = await createServerSupabaseClient()

    // One indexed read to build the set of existing business keys (NIT/name).
    const { data: existing, error: readError } = await client
      .from("companies")
      .select("name, tax_id")
      .eq("tenant_id", tenantId)
    if (readError) {
      throw new ApplicationError(
        "Unable to read companies for import.",
        "COMPANY_IMPORT_READ_FAILED",
        readError,
      )
    }
    const seen = new Set<string>()
    for (const c of existing ?? []) {
      const key = companyDedupKey({ name: c.name, taxId: c.tax_id })
      if (key) seen.add(key)
    }

    const toInsert: { row: number; record: ReturnType<typeof toRow> }[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      const name = row.name?.trim()
      if (!name) {
        errors.push({ row: rowNum, message: "El nombre de la empresa es obligatorio." })
        continue
      }
      if (name.length > 200) {
        errors.push({ row: rowNum, message: "El nombre supera los 200 caracteres." })
        continue
      }
      const key = companyDedupKey({ name, taxId: row.taxId })
      if (key && seen.has(key)) {
        skipped += 1
        continue
      }
      if (key) seen.add(key)
      toInsert.push({
        row: rowNum,
        record: toRow(tenantId, {
          name,
          taxId: row.taxId,
          industry: row.industry,
          website: row.website,
          phone: row.phone,
          address: row.address,
          city: row.city,
          state: row.state,
          country: row.country,
          notes: row.notes,
        }),
      })
    }

    let imported = 0
    for (let i = 0; i < toInsert.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + IMPORT_CHUNK_SIZE)
      const { error } = await client
        .from("companies")
        .insert(chunk.map((c) => c.record))
      if (error) {
        // Whole chunk failed — report its rows and keep going with the rest.
        for (const c of chunk) {
          errors.push({ row: c.row, message: "No se pudo guardar esta fila." })
        }
      } else {
        imported += chunk.length
      }
    }

    return { imported, skipped, errors }
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
