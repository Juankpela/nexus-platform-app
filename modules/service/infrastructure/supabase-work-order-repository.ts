import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  CreateFromQuoteResult,
  WorkOrderRepository,
} from "@/modules/service/application/ports/work-order-repository"
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrder,
  type WorkOrderFilters,
  type WorkOrderInput,
  type WorkOrderPriority,
  type WorkOrderSlaView,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import type {
  AssetServiceSummary,
  WorkOrderStats,
} from "@/modules/service/domain/work-order-stats"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type WorkOrderRow = Database["public"]["Tables"]["work_orders"]["Row"]
type WorkOrderRowWithRefs = WorkOrderRow & {
  companies: { name: string } | null
  cases: { case_number: string } | null
  quotes: { quote_number: string } | null
  assets: { name: string; asset_number: string } | null
}

const SELECT_WITH_REFS =
  "*, companies(name), cases(case_number), quotes(quote_number), assets(name, asset_number)"

function toWorkOrder(row: WorkOrderRowWithRefs): WorkOrder {
  return {
    id: row.id,
    workOrderNumber: row.work_order_number,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    caseId: row.case_id,
    caseNumber: row.cases?.case_number ?? null,
    quoteId: row.quote_id,
    quoteNumber: row.quotes?.quote_number ?? null,
    assetId: row.asset_id,
    assetName: row.assets
      ? `${row.assets.asset_number} · ${row.assets.name}`
      : null,
    assignedTechnicianId: row.assigned_technician_id,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    status: row.status,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    slaDueAt: row.sla_due_at,
    actualStart: row.actual_start,
    actualEnd: row.actual_end,
    laborHours: row.labor_hours,
    resolutionSummary: row.resolution_summary,
    completionNotes: row.completion_notes,
    billable: row.billable,
    billingApprovedAt: row.billing_approved_at,
    billingApprovedBy: row.billing_approved_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: WorkOrderInput) {
  return {
    subject: input.subject,
    description: input.description,
    priority: input.priority,
    company_id: input.companyId,
    case_id: input.caseId,
    asset_id: input.assetId,
    scheduled_start: input.scheduledStart,
    scheduled_end: input.scheduledEnd,
    sla_due_at: input.slaDueAt,
    labor_hours: input.laborHours,
    resolution_summary: input.resolutionSummary,
    completion_notes: input.completionNotes,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseWorkOrderRepository implements WorkOrderRepository {
  async list(
    tenantId: UUID,
    filters: WorkOrderFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<WorkOrder>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("work_orders")
      .select(SELECT_WITH_REFS, { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (filters.status) query = query.eq("status", filters.status)
    if (filters.priority) query = query.eq("priority", filters.priority)
    if (filters.technicianId) {
      // ADR-031: filter by the active assignment's technician (technicians.id),
      // not the legacy assigned_technician_id. Resolve matching WO ids first.
      const { data: asg } = await client
        .from("work_order_assignments")
        .select("work_order_id")
        .eq("tenant_id", tenantId)
        .eq("technician_id", filters.technicianId)
        .in("status", ["scheduled", "in_progress"])
      const ids = [...new Set((asg ?? []).map((r) => r.work_order_id))]
      query = query.in(
        "id",
        ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"],
      )
    }
    if (filters.companyId) query = query.eq("company_id", filters.companyId)
    if (filters.assetId) query = query.eq("asset_id", filters.assetId)
    if (filters.dateFrom) query = query.gte("scheduled_start", filters.dateFrom)
    if (filters.dateTo) query = query.lte("scheduled_start", filters.dateTo)
    const term = filters.search ? sanitizeSearch(filters.search) : ""
    if (term) {
      query = query.or(
        `subject.ilike.%${term}%,work_order_number.ilike.%${term}%`,
      )
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list work orders.",
        "WORK_ORDER_LIST_FAILED",
        error,
      )
    }

    return {
      items: (data as unknown as WorkOrderRowWithRefs[]).map(toWorkOrder),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<WorkOrder | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load work order.",
        "WORK_ORDER_LOAD_FAILED",
        error,
      )
    }
    return data ? toWorkOrder(data as unknown as WorkOrderRowWithRefs) : null
  }

  async listForCase(tenantId: UUID, caseId: UUID): Promise<WorkOrder[]> {
    return this.listBy("case_id", tenantId, caseId)
  }

  async listOpenWithSla(tenantId: UUID): Promise<WorkOrderSlaView[]> {
    const client = await createServerSupabaseClient()
    // Same predicate as the PR1 partial index: open WOs that carry an SLA
    // deadline. RLS (service.work_orders.read) applies — a user without it
    // simply sees an empty card.
    const { data, error } = await client
      .from("work_orders")
      .select("id, work_order_number, subject, status, scheduled_end, sla_due_at")
      .eq("tenant_id", tenantId)
      .not("sla_due_at", "is", null)
      .not("status", "in", "(completed,cancelled)")

    if (error) {
      throw new ApplicationError(
        "Unable to list work orders with SLA.",
        "WORK_ORDER_SLA_LIST_FAILED",
        error,
      )
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      workOrderNumber: row.work_order_number,
      subject: row.subject,
      status: row.status,
      scheduledEnd: row.scheduled_end,
      slaDueAt: row.sla_due_at as string,
    }))
  }

  async listForAsset(tenantId: UUID, assetId: UUID): Promise<WorkOrder[]> {
    return this.listBy("asset_id", tenantId, assetId)
  }

  private async listBy(
    column: "case_id" | "asset_id",
    tenantId: UUID,
    targetId: UUID,
  ): Promise<WorkOrder[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq(column, targetId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new ApplicationError(
        "Unable to list work orders.",
        "WORK_ORDER_LIST_FAILED",
        error,
      )
    }
    return (data as unknown as WorkOrderRowWithRefs[]).map(toWorkOrder)
  }

  async create(
    tenantId: UUID,
    params: { createdBy: UUID; workOrderNumber: string; input: WorkOrderInput },
  ): Promise<WorkOrder> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .insert({
        tenant_id: tenantId,
        created_by: params.createdBy,
        work_order_number: params.workOrderNumber,
        ...toRow(params.input),
      })
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create work order.",
        "WORK_ORDER_CREATE_FAILED",
        error,
      )
    }
    return toWorkOrder(data as unknown as WorkOrderRowWithRefs)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: WorkOrderInput,
  ): Promise<WorkOrder> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .update(toRow(input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update work order.",
        "WORK_ORDER_UPDATE_FAILED",
        error,
      )
    }
    return toWorkOrder(data as unknown as WorkOrderRowWithRefs)
  }

  async setStatus(
    tenantId: UUID,
    id: UUID,
    status: WorkOrderStatus,
    timestamps: { actualStart?: string | null; actualEnd?: string | null },
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const patch: Database["public"]["Tables"]["work_orders"]["Update"] = { status }
    if ("actualStart" in timestamps) patch.actual_start = timestamps.actualStart
    if ("actualEnd" in timestamps) patch.actual_end = timestamps.actualEnd

    const { error } = await client
      .from("work_orders")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change work order status.",
        "WORK_ORDER_STATUS_FAILED",
        error,
      )
    }
  }

  async findByQuote(tenantId: UUID, quoteId: UUID): Promise<WorkOrder | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to look up work order by quote.",
        "WORK_ORDER_QUOTE_LOOKUP_FAILED",
        error,
      )
    }
    return data ? toWorkOrder(data as unknown as WorkOrderRowWithRefs) : null
  }

  async createFromQuote(
    tenantId: UUID,
    params: { quoteId: UUID; createdBy: UUID; workOrderNumber: string },
  ): Promise<CreateFromQuoteResult> {
    const client = await createServerSupabaseClient()

    const { data: quote, error: qErr } = await client
      .from("quotes")
      .select("id, company_id, status, quote_number")
      .eq("tenant_id", tenantId)
      .eq("id", params.quoteId)
      .maybeSingle()

    if (qErr) {
      throw new ApplicationError(
        "Unable to load quote.",
        "QUOTE_LOAD_FAILED",
        qErr,
      )
    }
    if (!quote) {
      throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
    }
    if (quote.status !== "accepted") {
      throw new ApplicationError(
        "Only accepted quotes can generate a work order.",
        "QUOTE_NOT_ACCEPTED",
      )
    }

    // Count service vs product lines: services flow to the WO, products wait for
    // Sales Order (E6). A quote with NO service lines must NOT generate a WO.
    const { data: qLines } = await client
      .from("quote_lines")
      .select("products(product_type)")
      .eq("tenant_id", tenantId)
      .eq("quote_id", params.quoteId)

    let serviceLineCount = 0
    let productLineCount = 0
    for (const row of (qLines ?? []) as unknown as {
      products: { product_type: string } | { product_type: string }[] | null
    }[]) {
      const prod = Array.isArray(row.products) ? row.products[0] : row.products
      if (prod?.product_type === "service") serviceLineCount += 1
      else productLineCount += 1
    }

    if (serviceLineCount === 0) {
      throw new ApplicationError(
        "This quote has no service lines, so it cannot generate a work order. A product-only quote should become a Sales Order.",
        "QUOTE_NO_SERVICE_LINES",
      )
    }

    const { data, error } = await client
      .from("work_orders")
      .insert({
        tenant_id: tenantId,
        created_by: params.createdBy,
        work_order_number: params.workOrderNumber,
        company_id: quote.company_id,
        quote_id: params.quoteId,
        subject: `Servicio · ${quote.quote_number}`,
        priority: "medium",
        billable: true,
      })
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create work order from quote.",
        "WORK_ORDER_FROM_QUOTE_FAILED",
        error,
      )
    }
    return {
      workOrder: toWorkOrder(data as unknown as WorkOrderRowWithRefs),
      serviceLineCount,
      productLineCount,
    }
  }

  async setBillable(
    tenantId: UUID,
    id: UUID,
    billable: boolean,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    // Toggling billability resets any prior approval — the decision must be re-confirmed.
    const patch: Database["public"]["Tables"]["work_orders"]["Update"] = {
      billable,
      billing_approved_at: null,
      billing_approved_by: null,
    }
    const { error } = await client
      .from("work_orders")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to update work order billability.",
        "WORK_ORDER_BILLABLE_FAILED",
        error,
      )
    }
  }

  async approveBilling(
    tenantId: UUID,
    id: UUID,
    approvedBy: UUID,
    approvedAt: string,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("work_orders")
      .update({
        billing_approved_at: approvedAt,
        billing_approved_by: approvedBy,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to approve work order for billing.",
        "WORK_ORDER_BILLING_APPROVE_FAILED",
        error,
      )
    }
  }

  async nextWorkOrderNumber(tenantId: UUID): Promise<string> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.rpc("next_work_order_number", {
      p_tenant_id: tenantId,
    })

    if (error || !data) {
      throw new ApplicationError(
        "Unable to generate work order number.",
        "WORK_ORDER_NUMBER_FAILED",
        error,
      )
    }
    return data as string
  }

  async getStats(tenantId: UUID): Promise<WorkOrderStats> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .select(
        "status, priority, assigned_technician_id, actual_start, actual_end",
      )
      .eq("tenant_id", tenantId)

    if (error) {
      throw new ApplicationError(
        "Unable to load work order stats.",
        "WORK_ORDER_STATS_FAILED",
        error,
      )
    }

    const byStatus = Object.fromEntries(
      WORK_ORDER_STATUSES.map((s) => [s, 0]),
    ) as Record<WorkOrderStatus, number>
    const byPriority = Object.fromEntries(
      WORK_ORDER_PRIORITIES.map((p) => [p, 0]),
    ) as Record<WorkOrderPriority, number>

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    let openCount = 0
    let completedThisMonth = 0
    let resolutionTotalMs = 0
    let resolutionCount = 0
    let openAssigned = 0

    for (const row of data ?? []) {
      const status = row.status as WorkOrderStatus
      const priority = row.priority as WorkOrderPriority
      byStatus[status] += 1
      byPriority[priority] += 1

      const isOpen = status !== "completed" && status !== "cancelled"
      if (isOpen) {
        openCount += 1
        if (row.assigned_technician_id) openAssigned += 1
      }
      if (
        status === "completed" &&
        row.actual_end &&
        new Date(row.actual_end).getTime() >= monthStart
      ) {
        completedThisMonth += 1
      }
      if (status === "completed" && row.actual_start && row.actual_end) {
        resolutionTotalMs +=
          new Date(row.actual_end).getTime() -
          new Date(row.actual_start).getTime()
        resolutionCount += 1
      }
    }

    return {
      openCount,
      completedThisMonth,
      totalCount: (data ?? []).length,
      avgResolutionHours:
        resolutionCount > 0
          ? Math.round((resolutionTotalMs / resolutionCount / 3_600_000) * 10) / 10
          : null,
      byStatus,
      byPriority,
      // Demo proxy until a Technicians module provides real capacity:
      // share of open work orders that already have a technician assigned.
      technicianUtilizationPct:
        openCount > 0 ? Math.round((openAssigned / openCount) * 100) : null,
    }
  }

  async getAssetServiceSummary(
    tenantId: UUID,
    assetId: UUID,
  ): Promise<AssetServiceSummary> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("work_orders")
      .select("status, scheduled_start, actual_end")
      .eq("tenant_id", tenantId)
      .eq("asset_id", assetId)

    if (error) {
      throw new ApplicationError(
        "Unable to load asset service summary.",
        "WORK_ORDER_SUMMARY_FAILED",
        error,
      )
    }

    const rows = data ?? []
    const nowMs = Date.now()
    let openCount = 0
    let historicalCount = 0
    let lastVisitAt: string | null = null
    let nextScheduledAt: string | null = null
    const completedDates: number[] = []

    for (const row of rows) {
      const status = row.status as WorkOrderStatus
      if (status === "completed") {
        historicalCount += 1
        if (row.actual_end) {
          completedDates.push(new Date(row.actual_end).getTime())
          if (!lastVisitAt || row.actual_end > lastVisitAt) {
            lastVisitAt = row.actual_end
          }
        }
      } else if (status !== "cancelled") {
        openCount += 1
        if (
          row.scheduled_start &&
          new Date(row.scheduled_start).getTime() >= nowMs &&
          (!nextScheduledAt || row.scheduled_start < nextScheduledAt)
        ) {
          nextScheduledAt = row.scheduled_start
        }
      }
    }

    let avgDaysBetweenInterventions: number | null = null
    if (completedDates.length >= 2) {
      completedDates.sort((a, b) => a - b)
      let gapTotal = 0
      for (let i = 1; i < completedDates.length; i++) {
        gapTotal += completedDates[i] - completedDates[i - 1]
      }
      avgDaysBetweenInterventions = Math.round(
        gapTotal / (completedDates.length - 1) / 86_400_000,
      )
    }

    return {
      openCount,
      historicalCount,
      lastVisitAt,
      nextScheduledAt,
      avgDaysBetweenInterventions,
    }
  }
}
