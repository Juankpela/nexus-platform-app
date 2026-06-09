import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ForecastingRepository } from "@/modules/forecasting/application/ports/forecasting-repository"
import type {
  ForecastPeriod,
  RepPerformance,
  RevenueMetrics,
  RevenueTrendPoint,
  StageMetrics,
} from "@/modules/forecasting/domain/revenue-metrics"
import { OPPORTUNITY_STATUS_LABELS } from "@/modules/crm/domain/opportunity"
import type { ForecastSnapshot, ForecastSnapshotInput } from "@/modules/forecasting/domain/forecast-snapshot"
import type { SalesQuota, SalesQuotaInput } from "@/modules/forecasting/domain/sales-quota"
import type { UUID } from "@/types/shared"

// ── Period helpers ────────────────────────────────────────────────────────────

function getPeriodRange(period: ForecastPeriod): { from: string | null; to: string | null } {
  const now = new Date()
  if (period === "all_time") return { from: null, to: null }

  const year  = now.getFullYear()
  const month = now.getMonth()

  if (period === "this_month") {
    return {
      from: new Date(year, month, 1).toISOString(),
      to:   new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
    }
  }

  if (period === "this_quarter") {
    const q = Math.floor(month / 3)
    return {
      from: new Date(year, q * 3, 1).toISOString(),
      to:   new Date(year, q * 3 + 3, 0, 23, 59, 59).toISOString(),
    }
  }

  return {
    from: new Date(year, 0, 1).toISOString(),
    to:   new Date(year, 11, 31, 23, 59, 59).toISOString(),
  }
}

const OPEN_STATUSES = ["new", "discovery", "proposal", "negotiation"] as const
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type OpenStatus = (typeof OPEN_STATUSES)[number]
const OPEN_STATUSES_ARR: string[] = [...OPEN_STATUSES]

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

/**
 * Escape hatch for tables not yet in types/database.ts.
 * Run `npm run db:types` after pushing the forecasting migration to remove this.
 */
// biome-ignore lint/suspicious/noExplicitAny: pre-migration table access
function anyFrom(client: unknown, table: string) {
  // biome-ignore lint/suspicious/noExplicitAny: pre-migration table access
  return (client as any).from(table)
}

type OppRow = {
  id?: string
  estimated_value: number | null
  probability:     number
  status:          string
  expected_close_date: string | null
  created_at:      string
  updated_at:      string
  owner_id?:       string | null
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseForecastingRepository implements ForecastingRepository {

  async getRevenueMetrics(tenantId: UUID, period: ForecastPeriod): Promise<RevenueMetrics> {
    const client = await createServerSupabaseClient()
    const { from, to } = getPeriodRange(period)

    const { data, error } = await client
      .from("opportunities")
      .select("estimated_value, probability, status, expected_close_date, created_at, updated_at")
      .eq("tenant_id", tenantId)

    if (error) throw new ApplicationError("FORECASTING_METRICS_FAILED", error.message)

    const rows: OppRow[] = data ?? []

    const inPeriod = (dateStr: string | null): boolean => {
      if (!from || !to) return true
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d >= new Date(from) && d <= new Date(to)
    }

    const openRows     = rows.filter(r => (OPEN_STATUSES_ARR).includes(r.status))
    const openInPeriod = period === "all_time" ? openRows : openRows.filter(r => inPeriod(r.expected_close_date))
    const wonRows      = rows.filter(r => r.status === "won"  && (period === "all_time" || inPeriod(r.updated_at)))
    const lostRows     = rows.filter(r => r.status === "lost" && (period === "all_time" || inPeriod(r.updated_at)))

    const sumVal = (arr: OppRow[]) => arr.reduce((acc, r) => acc + (r.estimated_value ?? 0), 0)

    const expectedRevenue   = sumVal(openInPeriod)
    const weightedRevenue   = openInPeriod.reduce((acc, r) => acc + (r.estimated_value ?? 0) * (r.probability / 100), 0)
    const closedWonRevenue  = sumVal(wonRows)
    const closedLostRevenue = sumVal(lostRows)

    const wonCount   = wonRows.length
    const lostCount  = lostRows.length
    const openCount  = openInPeriod.length
    const totalCount = rows.length
    const closedCount = wonCount + lostCount
    const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0

    const wonWithValue = wonRows.filter(r => r.estimated_value != null)
    const avgDealSize  = wonWithValue.length > 0
      ? wonWithValue.reduce((acc, r) => acc + (r.estimated_value ?? 0), 0) / wonWithValue.length
      : null

    const closedRows = [...wonRows, ...lostRows].filter(r => r.created_at && r.updated_at)
    const avgSalesCycleDays = closedRows.length > 0
      ? closedRows.reduce((acc, r) => {
          return acc + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 86400000
        }, 0) / closedRows.length
      : null

    return {
      expectedRevenue, weightedRevenue, closedWonRevenue, closedLostRevenue,
      openCount, wonCount, lostCount, totalCount,
      winRate, avgDealSize, avgSalesCycleDays,
      pipelineCoverage: null,
      forecastScore: null,
      riskScore: null,
      period,
    }
  }

  async getStageMetrics(tenantId: UUID): Promise<StageMetrics[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("opportunities")
      .select("status, estimated_value, probability, created_at, updated_at")
      .eq("tenant_id", tenantId)

    if (error) throw new ApplicationError("FORECASTING_STAGE_FAILED", error.message)

    type StageEntry = { count: number; revenue: number; weighted: number; days: number[] }
    const stageMap = new Map<string, StageEntry>()
    for (const s of [...OPEN_STATUSES, "won", "lost"]) {
      stageMap.set(s, { count: 0, revenue: 0, weighted: 0, days: [] })
    }

    for (const row of (data ?? []) as OppRow[]) {
      const entry = stageMap.get(row.status)
      if (!entry) continue
      entry.count++
      entry.revenue += row.estimated_value ?? 0
      entry.weighted += (row.estimated_value ?? 0) * (row.probability / 100)
      if (row.created_at && row.updated_at) {
        entry.days.push(
          (new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) / 86400000
        )
      }
    }

    const stages = [...OPEN_STATUSES] as string[]
    return stages.map((status, idx) => {
      const entry    = stageMap.get(status)!
      const nextEntry = idx < stages.length - 1 ? stageMap.get(stages[idx + 1]) : null
      return {
        status,
        label: OPPORTUNITY_STATUS_LABELS[status as keyof typeof OPPORTUNITY_STATUS_LABELS] ?? status,
        count: entry.count,
        revenue: entry.revenue,
        weightedRevenue: entry.weighted,
        conversionRate: nextEntry && entry.count > 0
          ? (nextEntry.count / entry.count) * 100
          : null,
        avgDaysInStage: entry.days.length > 0
          ? entry.days.reduce((a, b) => a + b, 0) / entry.days.length
          : null,
      }
    })
  }

  async getRepPerformance(tenantId: UUID, period: ForecastPeriod): Promise<RepPerformance[]> {
    const client = await createServerSupabaseClient()
    const { from, to } = getPeriodRange(period)

    const { data, error } = await client
      .from("opportunities")
      .select("owner_id, status, estimated_value, probability, updated_at")
      .eq("tenant_id", tenantId)
      .not("owner_id", "is", null)

    if (error) throw new ApplicationError("FORECASTING_REP_FAILED", error.message)

    // Fetch member user_ids for this tenant
    const { data: memberships } = await client
      .from("tenant_memberships")
      .select("user_id")
      .eq("tenant_id", tenantId)

    const userIds = (memberships ?? []).map(m => m.user_id)

    // Fetch profiles separately (no FK between tenant_memberships and profiles)
    const nameMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      for (const p of profiles ?? []) {
        nameMap.set(p.id, p.full_name ?? p.id)
      }
    }

    const inPeriod = (dateStr: string | null): boolean => {
      if (!from || !to) return true
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d >= new Date(from) && d <= new Date(to)
    }

    type RepEntry = { won: number; open: number; lost: number; wonRevenue: number; weighted: number; deals: number[] }
    const repMap = new Map<string, RepEntry>()

    for (const row of (data ?? []) as OppRow[]) {
      const ownerId = row.owner_id
      if (!ownerId) continue
      if (!repMap.has(ownerId)) {
        repMap.set(ownerId, { won: 0, open: 0, lost: 0, wonRevenue: 0, weighted: 0, deals: [] })
      }
      const entry = repMap.get(ownerId)!
      const val   = row.estimated_value ?? 0

      if (row.status === "won" && inPeriod(row.updated_at)) {
        entry.won++; entry.wonRevenue += val
        if (val > 0) entry.deals.push(val)
      } else if (row.status === "lost" && inPeriod(row.updated_at)) {
        entry.lost++
      } else if ((OPEN_STATUSES_ARR).includes(row.status)) {
        entry.open++
        entry.weighted += val * (row.probability / 100)
      }
    }

    return Array.from(repMap.entries())
      .map(([ownerId, e]): RepPerformance => {
        const closed = e.won + e.lost
        return {
          ownerId,
          ownerName: nameMap.get(ownerId) ?? ownerId,
          wonCount:  e.won,
          openCount: e.open,
          lostCount: e.lost,
          revenueWon:      e.wonRevenue,
          weightedRevenue: e.weighted,
          avgDealSize: e.deals.length > 0
            ? e.deals.reduce((a, b) => a + b, 0) / e.deals.length
            : null,
          winRate: closed > 0 ? (e.won / closed) * 100 : 0,
        }
      })
      .sort((a, b) => b.revenueWon - a.revenueWon)
  }

  async getRevenueTrend(tenantId: UUID): Promise<RevenueTrendPoint[]> {
    const client = await createServerSupabaseClient()
    const year   = new Date().getFullYear()

    const { data, error } = await client
      .from("opportunities")
      .select("estimated_value, probability, status, expected_close_date, updated_at")
      .eq("tenant_id", tenantId)
      .gte("expected_close_date", `${year}-01-01`)
      .lte("expected_close_date", `${year}-12-31`)

    if (error) throw new ApplicationError("FORECASTING_TREND_FAILED", error.message)

    const monthly: RevenueTrendPoint[] = Array.from({ length: 12 }, (_, i) => ({
      label: MONTH_LABELS[i],
      expectedRevenue: 0,
      weightedRevenue: 0,
      closedWon: 0,
    }))

    for (const row of (data ?? []) as OppRow[]) {
      const val       = row.estimated_value ?? 0
      const closeDate = row.expected_close_date ? new Date(row.expected_close_date) : null
      const updDate   = row.status === "won" && row.updated_at ? new Date(row.updated_at) : null

      if (closeDate && closeDate.getFullYear() === year) {
        const m = closeDate.getMonth()
        if ((OPEN_STATUSES_ARR).includes(row.status)) {
          monthly[m].expectedRevenue += val
          monthly[m].weightedRevenue += val * (row.probability / 100)
        }
      }
      if (updDate && updDate.getFullYear() === year && row.status === "won") {
        monthly[updDate.getMonth()].closedWon += val
      }
    }

    return monthly
  }

  async createSnapshot(tenantId: UUID, userId: UUID, input: ForecastSnapshotInput): Promise<ForecastSnapshot> {
    const client = await createServerSupabaseClient()
    const { data, error } = await anyFrom(client, "forecast_snapshots")
      .insert({
        tenant_id:           tenantId,
        created_by:          userId,
        snapshot_date:       input.snapshotDate,
        period_type:         input.periodType,
        period_label:        input.periodLabel,
        expected_revenue:    input.expectedRevenue,
        weighted_revenue:    input.weightedRevenue,
        closed_won_revenue:  input.closedWonRevenue,
        closed_lost_revenue: input.closedLostRevenue,
        open_count:          input.openCount,
        won_count:           input.wonCount,
        lost_count:          input.lostCount,
        win_rate:            input.winRate,
        avg_deal_size:       input.avgDealSize,
        pipeline_coverage:   input.pipelineCoverage,
      })
      .select()
      .single()

    if (error) throw new ApplicationError("SNAPSHOT_CREATE_FAILED", error.message)
    // biome-ignore lint/suspicious/noExplicitAny: pre-migration table
    return toSnapshot(data as any)
  }

  async listSnapshots(tenantId: UUID, limit = 20): Promise<ForecastSnapshot[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await anyFrom(client, "forecast_snapshots")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("snapshot_date", { ascending: false })
      .limit(limit)

    if (error) throw new ApplicationError("SNAPSHOT_LIST_FAILED", error.message)
    // biome-ignore lint/suspicious/noExplicitAny: pre-migration table
    return (data ?? []).map((r: any) => toSnapshot(r))
  }

  async getQuota(tenantId: UUID, periodType: string, periodLabel: string, ownerId?: UUID | null): Promise<SalesQuota | null> {
    const client = await createServerSupabaseClient()
    let query = anyFrom(client, "sales_quotas")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period_type", periodType)
      .eq("period_label", periodLabel)

    if (ownerId === null || ownerId === undefined) {
      query = query.is("owner_id", null)
    } else {
      query = query.eq("owner_id", ownerId)
    }

    const { data } = await query.maybeSingle()
    // biome-ignore lint/suspicious/noExplicitAny: pre-migration table
    return data ? toQuota(data as any) : null
  }

  async upsertQuota(tenantId: UUID, input: SalesQuotaInput): Promise<SalesQuota> {
    const client = await createServerSupabaseClient()
    const { data, error } = await anyFrom(client, "sales_quotas")
      .upsert({
        tenant_id:    tenantId,
        owner_id:     input.ownerId,
        period_type:  input.periodType,
        period_label: input.periodLabel,
        quota_amount: input.quotaAmount,
        updated_at:   new Date().toISOString(),
      }, { onConflict: "tenant_id,owner_id,period_type,period_label" })
      .select()
      .single()

    if (error) throw new ApplicationError("QUOTA_UPSERT_FAILED", error.message)
    // biome-ignore lint/suspicious/noExplicitAny: pre-migration table
    return toQuota(data as any)
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: supabase row type
function toSnapshot(row: any): ForecastSnapshot {
  return {
    id:               row.id,
    tenantId:         row.tenant_id,
    snapshotDate:     row.snapshot_date,
    periodType:       row.period_type,
    periodLabel:      row.period_label,
    expectedRevenue:  Number(row.expected_revenue),
    weightedRevenue:  Number(row.weighted_revenue),
    closedWonRevenue: Number(row.closed_won_revenue),
    closedLostRevenue: Number(row.closed_lost_revenue),
    openCount:        row.open_count,
    wonCount:         row.won_count,
    lostCount:        row.lost_count,
    winRate:          Number(row.win_rate),
    avgDealSize:      row.avg_deal_size  != null ? Number(row.avg_deal_size)  : null,
    pipelineCoverage: row.pipeline_coverage != null ? Number(row.pipeline_coverage) : null,
    createdBy:        row.created_by,
    createdAt:        row.created_at,
  }
}

// biome-ignore lint/suspicious/noExplicitAny: supabase row type
function toQuota(row: any): SalesQuota {
  return {
    id:          row.id,
    tenantId:    row.tenant_id,
    ownerId:     row.owner_id,
    periodType:  row.period_type,
    periodLabel: row.period_label,
    quotaAmount: Number(row.quota_amount),
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  }
}
