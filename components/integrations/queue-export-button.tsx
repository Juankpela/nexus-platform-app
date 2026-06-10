"use client"

import { Clock, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { enqueueExportAction } from "@/modules/integrations/presentation/export-actions"
import type { ExportFilters } from "@/modules/integrations/domain/export-contract"

export function QueueExportButton({
  tenantSlug,
  object,
  filters = {},
  format = "csv",
}: {
  tenantSlug: string
  object: string
  filters?: ExportFilters
  format?: "csv" | "xlsx"
}) {
  const [state, setState] = useState<"idle" | "loading" | "queued">("idle")
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setState("loading")
    setError(null)
    try {
      const res = await enqueueExportAction(tenantSlug, object, format, filters)
      if (!res.ok) {
        setError(res.error)
        setState("idle")
        return
      }
      setState("queued")
    } catch {
      setError("Could not queue export.")
      setState("idle")
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={run} disabled={state !== "idle"}>
        {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
        {state === "queued" ? "Queued ✓" : "Queue export"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
