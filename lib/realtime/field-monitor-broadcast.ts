import "server-only"

import { publicEnv } from "@/lib/config/public-env"

/**
 * The Realtime broadcast channel a tenant's Field Monitor listens on. The
 * monitor subscribes to this channel; field actions emit a ping so the admin
 * view refreshes live — no DB publication / DDL required (uses Broadcast, not
 * postgres_changes). The payload is intentionally empty: it only signals
 * "something changed, refetch" — the actual data read stays RLS-protected.
 */
export function fieldMonitorChannel(tenantId: string): string {
  return `field-monitor:${tenantId}`
}

/**
 * Fire-and-forget broadcast that a tenant's field execution state changed.
 * Posts to the Supabase Realtime broadcast REST endpoint; failures are
 * swallowed so they never block a worker's transition.
 */
export async function broadcastFieldMonitorUpdate(
  tenantId: string,
): Promise<void> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return

  try {
    await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic: fieldMonitorChannel(tenantId),
            event: "execution_changed",
            payload: { at: new Date().toISOString() },
          },
        ],
      }),
    })
  } catch {
    // Non-fatal: the monitor still picks up changes on its next manual refresh.
  }
}
