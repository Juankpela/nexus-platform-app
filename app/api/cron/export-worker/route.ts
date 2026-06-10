import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/config/env"
import { runExportWorkerBatch } from "@/modules/integrations/composition"

// Internal scheduled worker (NOT a public API). Invoked only by Vercel Cron, which
// sends `Authorization: Bearer <CRON_SECRET>`. Drains a batch of export jobs.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runExportWorkerBatch()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Worker error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
