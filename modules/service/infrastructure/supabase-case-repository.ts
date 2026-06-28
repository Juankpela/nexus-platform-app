import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { CaseRepository } from "@/modules/service/application/ports/case-repository"
import {
  CASE_PRIORITIES,
  CASE_STATUSES,
  type Case,
  type CaseFilters,
  type CaseInput,
  type CasePriority,
  type CaseStatus,
} from "@/modules/service/domain/case"
import type { CaseStats } from "@/modules/service/domain/case-stats"
import { computeSlaStatus } from "@/modules/service/domain/sla"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type CaseRow = Database["public"]["Tables"]["cases"]["Row"]
type CaseRowWithRefs = CaseRow & {
  companies: { name: string } | null
  contacts: { first_name: string; last_name: string | null } | null
  assets: { name: string; asset_number: string } | null
}

const SELECT_WITH_REFS =
  "*, companies(name), contacts(first_name, last_name), assets(name, asset_number)"

function toCase(row: CaseRowWithRefs): Case {
  const contactName = row.contacts
    ? [row.contacts.first_name, row.contacts.last_name].filter(Boolean).join(" ")
    : null
  return {
    id: row.id,
    caseNumber: row.case_number,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    origin: row.origin,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    contactId: row.contact_id,
    contactName,
    assetId: row.asset_id,
    assetName: row.assets
      ? `${row.assets.asset_number} · ${row.assets.name}`
      : null,
    ownerId: row.owner_id,
    workOrderId: row.work_order_id,
    reportedSkillId: row.reported_skill_id,
    incidentType: row.incident_type,
    issueTypeId: row.issue_type_id,
    reporterPhone: row.reporter_phone,
    trackingToken: row.tracking_token,
    slaDueAt: row.sla_due_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: CaseInput) {
  return {
    subject: input.subject,
    description: input.description,
    priority: input.priority,
    origin: input.origin,
    company_id: input.companyId,
    contact_id: input.contactId,
    asset_id: input.assetId,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseCaseRepository implements CaseRepository {
  async list(
    tenantId: UUID,
    filters: CaseFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Case>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("cases")
      .select(SELECT_WITH_REFS, { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (filters.status) query = query.eq("status", filters.status)
    if (filters.priority) query = query.eq("priority", filters.priority)
    if (filters.ownerId) query = query.eq("owner_id", filters.ownerId)
    // SLA vencido = caso abierto (sin resolver/cerrar) cuyo deadline ya pasó.
    if (filters.sla === "overdue") {
      query = query
        .not("sla_due_at", "is", null)
        .lt("sla_due_at", new Date().toISOString())
        .is("resolved_at", null)
        .is("closed_at", null)
    }
    if (filters.companyId) query = query.eq("company_id", filters.companyId)
    const term = filters.search ? sanitizeSearch(filters.search) : ""
    if (term) {
      query = query.or(`subject.ilike.%${term}%,case_number.ilike.%${term}%`)
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError("Unable to list cases.", "CASE_LIST_FAILED", error)
    }

    return {
      items: (data as unknown as CaseRowWithRefs[]).map(toCase),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async listForAsset(tenantId: UUID, assetId: UUID): Promise<Case[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("cases")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new ApplicationError(
        "Unable to list cases for asset.",
        "CASE_LIST_FAILED",
        error,
      )
    }
    return (data as unknown as CaseRowWithRefs[]).map(toCase)
  }

  async getById(tenantId: UUID, id: UUID): Promise<Case | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("cases")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError("Unable to load case.", "CASE_LOAD_FAILED", error)
    }
    return data ? toCase(data as unknown as CaseRowWithRefs) : null
  }

  async create(
    tenantId: UUID,
    params: {
      ownerId: UUID | null
      createdBy: UUID
      caseNumber: string
      slaDueAt: string | null
      input: CaseInput
    },
  ): Promise<Case> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("cases")
      .insert({
        tenant_id: tenantId,
        owner_id: params.ownerId,
        created_by: params.createdBy,
        case_number: params.caseNumber,
        sla_due_at: params.slaDueAt,
        ...toRow(params.input),
      })
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create case.",
        "CASE_CREATE_FAILED",
        error,
      )
    }
    return toCase(data as unknown as CaseRowWithRefs)
  }

  async update(tenantId: UUID, id: UUID, input: CaseInput): Promise<Case> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("cases")
      .update(toRow(input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update case.",
        "CASE_UPDATE_FAILED",
        error,
      )
    }
    return toCase(data as unknown as CaseRowWithRefs)
  }

  async setStatus(
    tenantId: UUID,
    id: UUID,
    status: CaseStatus,
    timestamps: { resolvedAt?: string | null; closedAt?: string | null },
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const patch: Database["public"]["Tables"]["cases"]["Update"] = { status }
    if ("resolvedAt" in timestamps) patch.resolved_at = timestamps.resolvedAt
    if ("closedAt" in timestamps) patch.closed_at = timestamps.closedAt

    const { error } = await client
      .from("cases")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change case status.",
        "CASE_STATUS_FAILED",
        error,
      )
    }
  }

  async setOwner(tenantId: UUID, id: UUID, ownerId: UUID | null): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("cases")
      .update({ owner_id: ownerId })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to assign case owner.",
        "CASE_OWNER_FAILED",
        error,
      )
    }
  }

  async nextCaseNumber(tenantId: UUID): Promise<string> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.rpc("next_case_number", {
      p_tenant_id: tenantId,
    })

    if (error || !data) {
      throw new ApplicationError(
        "Unable to generate case number.",
        "CASE_NUMBER_FAILED",
        error,
      )
    }
    return data as string
  }

  async getStats(tenantId: UUID): Promise<CaseStats> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("cases")
      .select("status, priority, sla_due_at, resolved_at, closed_at")
      .eq("tenant_id", tenantId)

    if (error) {
      throw new ApplicationError(
        "Unable to load case stats.",
        "CASE_STATS_FAILED",
        error,
      )
    }

    const byStatus = Object.fromEntries(
      CASE_STATUSES.map((s) => [s, 0]),
    ) as Record<CaseStatus, number>
    const byPriority = Object.fromEntries(
      CASE_PRIORITIES.map((p) => [p, 0]),
    ) as Record<CasePriority, number>

    const now = new Date()
    let openCount = 0
    let breachedCount = 0
    let openBreachedCount = 0
    let slaTracked = 0
    let slaOk = 0

    for (const row of data ?? []) {
      const status = row.status as CaseStatus
      const priority = row.priority as CasePriority
      byStatus[status] += 1
      byPriority[priority] += 1
      if (status !== "resolved" && status !== "closed") openCount += 1

      if (row.sla_due_at) {
        const slaStatus = computeSlaStatus({
          slaDueAt: row.sla_due_at,
          priority,
          resolvedAt: row.resolved_at,
          closedAt: row.closed_at,
          now,
        })
        if (slaStatus) {
          slaTracked += 1
          if (slaStatus === "breached") breachedCount += 1
          else slaOk += 1
        }
        // Vencido ACTIVO: coincide EXACTO con el filtro ?sla=overdue (abierto y deadline pasado).
        if (
          !row.resolved_at &&
          !row.closed_at &&
          new Date(row.sla_due_at).getTime() < now.getTime()
        )
          openBreachedCount += 1
      }
    }

    return {
      openCount,
      totalCount: (data ?? []).length,
      byStatus,
      byPriority,
      breachedCount,
      openBreachedCount,
      slaCompliancePct:
        slaTracked > 0 ? Math.round((slaOk / slaTracked) * 100) : null,
    }
  }
}
