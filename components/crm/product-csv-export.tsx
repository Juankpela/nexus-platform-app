"use client"

import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { exportProductsCsvAction } from "@/modules/crm/presentation/product-actions"

export function ProductCsvExport({ tenantSlug }: { tenantSlug: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)
    try {
      const result = await exportProductsCsvAction(tenantSlug)
      if (result.error || !result.csv) {
        setError(result.error ?? "Export failed.")
        return
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products-${tenantSlug}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Could not export products.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Export CSV
      </Button>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  )
}
