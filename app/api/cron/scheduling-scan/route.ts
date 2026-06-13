import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/config/env"
import { runOverdueScanBatch } from "@/modules/scheduling/composition"

// Internal scheduled sweep (NOT a public API). Invoked only by Vercel Cron, which
// sends `Authorization: Bearer <CRON_SECRET>`. Reconciles overdue/at-risk work
// orders against the dedup cursor and emits durable SLA-alert audit events.
// Idempotent: safe to re-run; convergence is guaranteed by the cursor.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runOverdueScanBatch()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scan error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
