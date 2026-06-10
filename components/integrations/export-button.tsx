"use client"

import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { exportDataAction } from "@/modules/integrations/presentation/export-actions"
import type { ExportFilters } from "@/modules/integrations/domain/export-contract"

function downloadBase64(base64: string, contentType: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: contentType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({
  tenantSlug,
  object,
  filters = {},
}: {
  tenantSlug: string
  object: string
  filters?: ExportFilters
}) {
  const [loading, setLoading] = useState<null | "csv" | "xlsx">(null)
  const [error, setError] = useState<string | null>(null)

  async function run(format: "csv" | "xlsx") {
    setLoading(format)
    setError(null)
    try {
      const res = await exportDataAction(tenantSlug, object, format, filters)
      if (!res.ok) {
        setError(res.error)
        return
      }
      downloadBase64(res.base64, res.contentType, res.filename)
    } catch {
      setError("Could not export.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => run("csv")} disabled={loading !== null}>
          {loading === "csv" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => run("xlsx")} disabled={loading !== null}>
          {loading === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Excel
        </Button>
      </div>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
