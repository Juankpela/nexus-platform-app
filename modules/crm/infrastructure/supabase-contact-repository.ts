import "server-only"

import type { ImportResult } from "@/lib/csv/import-result"
import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { CrmStatus } from "@/modules/crm/domain/company"
import { companyDedupKey } from "@/modules/crm/domain/company-import"
import type { Contact, ContactInput } from "@/modules/crm/domain/contact"
import {
  contactDedupKey,
  hasCompanyReference,
  type ContactImportRow,
} from "@/modules/crm/domain/contact-import"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

/** Max rows per insert call — keeps a single failing row from sinking the file. */
const IMPORT_CHUNK_SIZE = 500

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
    { search, page, pageSize, companyId }: ListQuery,
  ): Promise<Paginated<Contact>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("contacts")
      .select(SELECT_WITH_COMPANY, { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

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

  async importBatch(
    tenantId: UUID,
    rows: ContactImportRow[],
  ): Promise<ImportResult> {
    const errors: ImportResult["errors"] = []
    let skipped = 0

    const client = await createServerSupabaseClient()

    // Index existing companies by business key (NIT→name) for relation lookup.
    const { data: companies, error: companiesError } = await client
      .from("companies")
      .select("id, name, tax_id")
      .eq("tenant_id", tenantId)
    if (companiesError) {
      throw new ApplicationError(
        "Unable to read companies for contact import.",
        "CONTACT_IMPORT_COMPANY_READ_FAILED",
        companiesError,
      )
    }
    const companyIndex = new Map<string, UUID>()
    for (const c of companies ?? []) {
      const key = companyDedupKey({ name: c.name, taxId: c.tax_id })
      if (key && !companyIndex.has(key)) companyIndex.set(key, c.id)
    }

    // Seed the dedup set from existing contacts (by email — the strong key).
    const { data: existing, error: contactsError } = await client
      .from("contacts")
      .select("email")
      .eq("tenant_id", tenantId)
      .not("email", "is", null)
    if (contactsError) {
      throw new ApplicationError(
        "Unable to read contacts for import.",
        "CONTACT_IMPORT_READ_FAILED",
        contactsError,
      )
    }
    const seen = new Set<string>()
    for (const c of existing ?? []) {
      if (c.email) seen.add(`email:${c.email.trim().toLowerCase()}`)
    }

    const toInsert: { row: number; record: ReturnType<typeof toRow> }[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      const firstName = row.firstName?.trim()
      if (!firstName) {
        errors.push({ row: rowNum, message: "El nombre es obligatorio." })
        continue
      }

      // Resolve the company link (optional). A reference that matches nothing
      // is a broken relation → quarantine the row.
      let companyId: UUID | null = null
      let companyKey: string | null = null
      if (hasCompanyReference(row)) {
        companyKey = companyDedupKey({
          name: row.companyName ?? "",
          taxId: row.companyTaxId,
        })
        const resolved = companyKey ? companyIndex.get(companyKey) : undefined
        if (!resolved) {
          errors.push({
            row: rowNum,
            message: `Empresa no encontrada: "${row.companyTaxId ?? row.companyName}". Impórtala primero o corrige el dato.`,
          })
          continue
        }
        companyId = resolved
      }

      const key = contactDedupKey({
        firstName,
        lastName: row.lastName,
        email: row.email,
        companyKey,
      })
      if (key && seen.has(key)) {
        skipped += 1
        continue
      }
      if (key) seen.add(key)

      toInsert.push({
        row: rowNum,
        record: toRow(tenantId, {
          companyId,
          firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          mobile: row.mobile,
          title: row.title,
          department: row.department,
          notes: row.notes,
        }),
      })
    }

    let imported = 0
    for (let i = 0; i < toInsert.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + IMPORT_CHUNK_SIZE)
      const { error } = await client
        .from("contacts")
        .insert(chunk.map((c) => c.record))
      if (error) {
        for (const c of chunk) {
          errors.push({ row: c.row, message: "No se pudo guardar esta fila." })
        }
      } else {
        imported += chunk.length
      }
    }

    return { imported, skipped, errors }
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
