"use client"

import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { getExportDownloadAction } from "@/modules/integrations/presentation/export-actions"

export function ExportDownloadButton({
  tenantSlug,
  jobId,
}: {
  tenantSlug: string
  jobId: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await getExportDownloadAction(tenantSlug, jobId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      window.open(res.url, "_blank", "noopener")
    } catch {
      setError("Download unavailable.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Download
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
