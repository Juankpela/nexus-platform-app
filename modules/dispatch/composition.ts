import "server-only"

import { getDispatchBoard } from "@/modules/dispatch/application/use-cases/get-dispatch-board"
import { getDispatchStats } from "@/modules/dispatch/application/use-cases/get-dispatch-stats"
import { SupabaseDispatchRepository } from "@/modules/dispatch/infrastructure/supabase-dispatch-repository"
import type { UUID } from "@/types/shared"

function dispatchRepo() {
  return new SupabaseDispatchRepository()
}

/** UTC day window [date 00:00, next day 00:00) for a YYYY-MM-DD string. */
function dayWindow(date: string): { fromIso: string; toIso: string } {
  const from = new Date(`${date}T00:00:00.000Z`)
  const to = new Date(from.getTime() + 86_400_000)
  return { fromIso: from.toISOString(), toIso: to.toISOString() }
}

export function getTenantDispatchBoard(tenantId: UUID, date: string) {
  const { fromIso, toIso } = dayWindow(date)
  return getDispatchBoard(
    { dispatch: dispatchRepo() },
    { tenantId, date, dayStartIso: fromIso, dayEndIso: toIso },
  )
}

export function getTenantDispatchStats(tenantId: UUID, date: string) {
  const { fromIso, toIso } = dayWindow(date)
  return getDispatchStats(
    { dispatch: dispatchRepo() },
    { tenantId, dayStartIso: fromIso, dayEndIso: toIso },
  )
}
