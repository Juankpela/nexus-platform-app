"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  FORECASTING_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { upsertTenantQuota } from "@/modules/forecasting/composition"
import { getPeriodLabel } from "@/modules/forecasting/application/use-cases/take-forecast-snapshot"
import type { ForecastPeriod } from "@/modules/forecasting/domain/revenue-metrics"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type QuotaActionState = { ok: boolean; error: string | null }

const PERIODS: [ForecastPeriod, ...ForecastPeriod[]] = [
  "this_month",
  "this_quarter",
  "this_year",
  "all_time",
]

const Schema = z.object({
  period: z.enum(PERIODS),
  quotaAmount: z.coerce.number().min(0, "La meta no puede ser negativa."),
})

/**
 * Fija/actualiza la meta de ventas (a nivel de equipo, ownerId null) para el
 * período seleccionado. Deriva (periodType, periodLabel) con el MISMO helper que
 * los snapshots, para que meta y forecast siempre hablen del mismo período.
 * Reutiliza el upsert ya existente en el repositorio.
 */
export async function upsertQuotaAction(
  tenantSlug: string,
  _prev: QuotaActionState,
  formData: FormData,
): Promise<QuotaActionState> {
  try {
    const parsed = Schema.parse({
      period: formData.get("period"),
      quotaAmount: formData.get("quotaAmount"),
    })
    const context = await getRequestContext(tenantSlug)
    if (
      !hasPermission(context.effectivePermissions, FORECASTING_PERMISSIONS.write)
    ) {
      throw new ApplicationError(
        "No tienes permiso para editar la meta.",
        "FORBIDDEN",
      )
    }
    const { type, label } = getPeriodLabel(parsed.period)
    await upsertTenantQuota(context.tenantId, {
      ownerId: null,
      periodType: type,
      periodLabel: label,
      quotaAmount: parsed.quotaAmount,
    })
    revalidatePath(`/app/${tenantSlug}/forecasting`)
    return { ok: true, error: null }
  } catch (err) {
    if (err instanceof ApplicationError) return { ok: false, error: err.message }
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((i) => i.message).join(", ") }
    }
    console.error(err)
    return { ok: false, error: "No se pudo guardar la meta." }
  }
}
