import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  DashboardStats,
  DashboardStatsRepository,
  PipelineStageStats,
} from "@/modules/crm/application/ports/dashboard-stats-repository"
import { OPPORTUNITY_STATUS_LABELS } from "@/modules/crm/domain/opportunity"
import type { UUID } from "@/types/shared"

const OPEN_STAGES = ["new", "discovery", "proposal", "negotiation"] as const

export class SupabaseDashboardStatsRepository
  implements DashboardStatsRepository
{
  async getStats(tenantId: UUID): Promise<DashboardStats> {
    const client = await createServerSupabaseClient()

    const [
      companiesResult,
      contactsResult,
      openOppsResult,
      wonOppsResult,
      quotesResult,
    ] = await Promise.all([
      client
        .from("companies")
        .select("*", { count: "estimated", head: true })
        .eq("tenant_id", tenantId),

      client
        .from("contacts")
        .select("*", { count: "estimated", head: true })
        .eq("tenant_id", tenantId),

      client
        .from("opportunities")
        .select("estimated_value, status")
        .eq("tenant_id", tenantId)
        .neq("status", "won")
        .neq("status", "lost"),

      client
        .from("opportunities")
        .select("estimated_value")
        .eq("tenant_id", tenantId)
        .eq("status", "won"),

      client
        .from("quotes")
        .select("*", { count: "estimated", head: true })
        .eq("tenant_id", tenantId),
    ])

    if (companiesResult.error)
      throw new ApplicationError(
        "Unable to load dashboard stats.",
        "DASHBOARD_STATS_FAILED",
        companiesResult.error,
      )
    if (contactsResult.error)
      throw new ApplicationError(
        "Unable to load dashboard stats.",
        "DASHBOARD_STATS_FAILED",
        contactsResult.error,
      )
    if (openOppsResult.error)
      throw new ApplicationError(
        "Unable to load dashboard stats.",
        "DASHBOARD_STATS_FAILED",
        openOppsResult.error,
      )
    if (wonOppsResult.error)
      throw new ApplicationError(
        "Unable to load dashboard stats.",
        "DASHBOARD_STATS_FAILED",
        wonOppsResult.error,
      )
    if (quotesResult.error)
      throw new ApplicationError(
        "Unable to load dashboard stats.",
        "DASHBOARD_STATS_FAILED",
        quotesResult.error,
      )

    const openOpps = openOppsResult.data ?? []
    const wonOpps = wonOppsResult.data ?? []

    const pipelineValue = openOpps.reduce(
      (sum, opp) => sum + (opp.estimated_value ?? 0),
      0,
    )
    const wonRevenue = wonOpps.reduce(
      (sum, opp) => sum + (opp.estimated_value ?? 0),
      0,
    )

    // Aggregate open pipeline by stage
    const stageMap = new Map<string, { count: number; value: number }>(
      OPEN_STAGES.map((s) => [s, { count: 0, value: 0 }]),
    )
    for (const opp of openOpps) {
      const stage = stageMap.get(opp.status)
      if (stage) {
        stage.count += 1
        stage.value += opp.estimated_value ?? 0
      }
    }

    const pipelineByStage: PipelineStageStats[] = OPEN_STAGES.map((status) => {
      const s = stageMap.get(status) ?? { count: 0, value: 0 }
      return {
        status,
        label:
          OPPORTUNITY_STATUS_LABELS[
            status as keyof typeof OPPORTUNITY_STATUS_LABELS
          ] ?? status,
        count: s.count,
        value: s.value,
      }
    })

    return {
      companiesCount: companiesResult.count ?? 0,
      contactsCount: contactsResult.count ?? 0,
      openOpportunitiesCount: openOpps.length,
      pipelineValue,
      quotesCount: quotesResult.count ?? 0,
      wonRevenue,
      pipelineByStage,
    }
  }
}
