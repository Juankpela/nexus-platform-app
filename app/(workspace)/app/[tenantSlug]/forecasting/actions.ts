"use server"

import { revalidatePath } from "next/cache"

import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FORECASTING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { takeTenantForecastSnapshot } from "@/modules/forecasting/composition"
import type { ForecastPeriod } from "@/modules/forecasting/domain/revenue-metrics"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

const VALID_PERIODS: ForecastPeriod[] = ["this_month", "this_quarter", "this_year", "all_time"]

export async function createSnapshotAction(tenantSlug: string, formData: FormData) {
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FORECASTING_PERMISSIONS.snapshotsWrite)

  const raw = String(formData.get("period") ?? "this_quarter")
  const period: ForecastPeriod = VALID_PERIODS.includes(raw as ForecastPeriod)
    ? (raw as ForecastPeriod)
    : "this_quarter"

  await takeTenantForecastSnapshot(context.tenantId, context.userId, period)

  revalidatePath(`/app/${tenantSlug}/forecasting`)
}
