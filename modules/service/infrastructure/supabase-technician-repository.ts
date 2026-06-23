import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import {
  TECHNICIAN_STATUSES,
  type Technician,
  type TechnicianFilters,
  type TechnicianInput,
  type TechnicianSort,
  type TechnicianStatus,
} from "@/modules/service/domain/technician"
import type { TechnicianStats } from "@/modules/service/domain/technician-stats"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type TechnicianRow = Database["public"]["Tables"]["technicians"]["Row"]

function toTechnician(row: TechnicianRow): Technician {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    employeeId: row.employee_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

function toRow(input: TechnicianInput) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    employee_id: input.employeeId,
    status: input.status,
    // Solo se incluye cuando viene explícito (cierre de WO que vincula al admin);
    // el formulario normal lo omite y no se pisa en updates.
    ...(input.userId !== undefined ? { user_id: input.userId } : {}),
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseTechnicianRepository implements TechnicianRepository {
  async list(
    tenantId: UUID,
    filters: TechnicianFilters,
    sort: TechnicianSort,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Technician>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("technicians")
      .select("*", { count: "estimated" })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)

    if (filters.status) query = query.eq("status", filters.status)
    const term = filters.search ? sanitizeSearch(filters.search) : ""
    if (term) {
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,employee_id.ilike.%${term}%`,
      )
    }

    query =
      sort === "recent"
        ? query.order("created_at", { ascending: false })
        : query
            .order("last_name", { ascending: true })
            .order("first_name", { ascending: true })

    const { data, error, count } = await query.range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list technicians.",
        "TECHNICIAN_LIST_FAILED",
        error,
      )
    }

    return {
      items: (data ?? []).map(toTechnician),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Technician | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load technician.",
        "TECHNICIAN_LOAD_FAILED",
        error,
      )
    }
    return data ? toTechnician(data) : null
  }

  async findByEmail(tenantId: UUID, email: string): Promise<Technician | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .ilike("email", email)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to look up technician by email.",
        "TECHNICIAN_LOOKUP_FAILED",
        error,
      )
    }
    return data ? toTechnician(data) : null
  }

  async findByUserId(tenantId: UUID, userId: UUID): Promise<Technician | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to look up technician by user.",
        "TECHNICIAN_LOOKUP_FAILED",
        error,
      )
    }
    return data ? toTechnician(data) : null
  }

  async findByEmployeeId(
    tenantId: UUID,
    employeeId: string,
  ): Promise<Technician | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .eq("employee_id", employeeId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to look up technician by employee ID.",
        "TECHNICIAN_LOOKUP_FAILED",
        error,
      )
    }
    return data ? toTechnician(data) : null
  }

  async create(tenantId: UUID, input: TechnicianInput): Promise<Technician> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .insert({ tenant_id: tenantId, ...toRow(input) })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create technician.",
        "TECHNICIAN_CREATE_FAILED",
        error,
      )
    }
    return toTechnician(data)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: TechnicianInput,
  ): Promise<Technician> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .update(toRow(input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update technician.",
        "TECHNICIAN_UPDATE_FAILED",
        error,
      )
    }
    return toTechnician(data)
  }

  async softDelete(tenantId: UUID, id: UUID, deletedAt: string): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("technicians")
      .update({ deleted_at: deletedAt, status: "inactive" })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to deactivate technician.",
        "TECHNICIAN_DELETE_FAILED",
        error,
      )
    }
  }

  async getStats(tenantId: UUID): Promise<TechnicianStats> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("technicians")
      .select("status")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)

    if (error) {
      throw new ApplicationError(
        "Unable to load technician stats.",
        "TECHNICIAN_STATS_FAILED",
        error,
      )
    }

    const byStatus = Object.fromEntries(
      TECHNICIAN_STATUSES.map((s) => [s, 0]),
    ) as Record<TechnicianStatus, number>

    for (const row of data ?? []) {
      byStatus[row.status as TechnicianStatus] += 1
    }

    return { total: (data ?? []).length, byStatus }
  }
}
