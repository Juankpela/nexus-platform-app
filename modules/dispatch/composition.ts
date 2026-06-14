import "server-only"

import { getDispatchBoard } from "@/modules/dispatch/application/use-cases/get-dispatch-board"
import { getDispatchStats } from "@/modules/dispatch/application/use-cases/get-dispatch-stats"
import { SupabaseDispatchRepository } from "@/modules/dispatch/infrastructure/supabase-dispatch-repository"
import type { UUID } from "@/types/shared"

function dispatchRepo() {
  return new SupabaseDispatchRepository()
}

/** Single timezone config point (tenant.timezone deferred). */
const TENANT_TIMEZONE = "America/Bogota"

/** Offset (minutes) of a timezone from UTC at a given instant. */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  )
  let hour = Number(parts.hour)
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  )
  return (asUtc - instant.getTime()) / 60_000
}

/**
 * UTC bounds of the LOCAL day `date` (YYYY-MM-DD) in the tenant timezone — so an
 * assignment at, say, 8 PM local lands on the right board day (not rolled to the
 * next UTC day). Fixes the UTC-midnight window bug for UTC-offset tenants.
 */
function dayWindow(date: string): { fromIso: string; toIso: string } {
  const guess = new Date(`${date}T00:00:00.000Z`)
  const offset = zoneOffsetMinutes(guess, TENANT_TIMEZONE)
  const from = new Date(guess.getTime() - offset * 60_000)
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
