import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { LeadRepository } from "@/modules/crm/application/ports/lead-repository"
import {
  type Lead,
  type LeadFunnelMetrics,
  type LeadInput,
  type LeadListQuery,
  type LeadStatus,
} from "@/modules/crm/domain/lead"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

function toLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    name: row.name as string,
    company: (row.company as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    status: row.status as LeadStatus,
    ownerId: (row.owner_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    convertedOpportunityId:
      (row.converted_opportunity_id as string | null) ?? null,
    convertedAt: (row.converted_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseLeadRepository implements LeadRepository {
  async list(
    tenantId: UUID,
    { search, status, source, page, pageSize }: LeadListQuery,
  ): Promise<Paginated<Lead>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("leads")
      .select("*", { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (status) query = query.eq("status", status)
    if (source) query = query.eq("source", source)
    const term = search ? sanitizeSearch(search) : ""
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`,
      )
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError("Unable to list leads.", "LEAD_LIST_FAILED", error)
    }

    return {
      items: data.map((r) => toLead(r as unknown as Record<string, unknown>)),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Lead | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("leads")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError("Unable to load lead.", "LEAD_LOAD_FAILED", error)
    }
    return data ? toLead(data as unknown as Record<string, unknown>) : null
  }

  async create(
    tenantId: UUID,
    ownerId: UUID,
    input: LeadInput,
  ): Promise<Lead> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("leads")
      .insert({
        tenant_id: tenantId,
        owner_id: ownerId,
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        source: input.source,
        notes: input.notes,
        status: "new",
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create lead.",
        "LEAD_CREATE_FAILED",
        error,
      )
    }
    return toLead(data as unknown as Record<string, unknown>)
  }

  async update(tenantId: UUID, id: UUID, input: LeadInput): Promise<Lead> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("leads")
      .update({
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        source: input.source,
        notes: input.notes,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update lead.",
        "LEAD_UPDATE_FAILED",
        error,
      )
    }
    return toLead(data as unknown as Record<string, unknown>)
  }

  async setStatus(
    tenantId: UUID,
    id: UUID,
    status: LeadStatus,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("leads")
      .update({ status })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to update lead status.",
        "LEAD_STATUS_FAILED",
        error,
      )
    }
  }

  async markConverted(
    tenantId: UUID,
    id: UUID,
    opportunityId: UUID,
    convertedAt: string,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("leads")
      .update({
        status: "converted",
        converted_opportunity_id: opportunityId,
        converted_at: convertedAt,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to mark lead converted.",
        "LEAD_CONVERT_FAILED",
        error,
      )
    }
  }

  async getFunnelMetrics(tenantId: UUID): Promise<LeadFunnelMetrics> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("leads")
      .select("status, source")
      .eq("tenant_id", tenantId)

    if (error) {
      throw new ApplicationError(
        "Unable to load lead metrics.",
        "LEAD_METRICS_FAILED",
        error,
      )
    }

    const rows = data ?? []
    const created = rows.length
    const converted = rows.filter((r) => r.status === "converted").length
    const sourceCounts = new Map<string, number>()
    for (const r of rows) {
      const key = (r.source as string | null) ?? "—"
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1)
    }

    return {
      created,
      converted,
      conversionRate: created > 0 ? converted / created : 0,
      bySource: Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
    }
  }
}
