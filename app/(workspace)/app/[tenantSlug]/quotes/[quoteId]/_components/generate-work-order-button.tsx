"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowRight, Loader2, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createWorkOrderFromQuoteAction } from "@/modules/service/presentation/work-order-actions"

type Result = {
  workOrderId: string
  serviceLineCount: number
  productLineCount: number
}

export function GenerateWorkOrderButton({
  tenantSlug,
  quoteId,
}: {
  tenantSlug: string
  quoteId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    start(async () => {
      const r = await createWorkOrderFromQuoteAction(tenantSlug, quoteId)
      if (r.ok && r.workOrderId) {
        setResult({
          workOrderId: r.workOrderId,
          serviceLineCount: r.serviceLineCount ?? 0,
          productLineCount: r.productLineCount ?? 0,
        })
      } else if (r.error) {
        setError(r.error)
      }
    })
  }

  // Success: show the outcome so the commercial story is explicit (#1 hardening).
  if (result) {
    const s = result.serviceLineCount
    const p = result.productLineCount
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <p className="font-medium text-emerald-800 dark:text-emerald-300">
          Se generó una orden de trabajo con {s} línea{s !== 1 ? "s" : ""} de
          servicio.
        </p>
        {p > 0 && (
          <p className="mt-1 text-emerald-700 dark:text-emerald-400">
            {p} línea{p !== 1 ? "s" : ""} de producto se factura
            {p !== 1 ? "n" : ""} directamente desde la cotización (botón
            &quot;Generar factura&quot;).
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() =>
            router.push(`/app/${tenantSlug}/work-orders/${result.workOrderId}`)
          }
        >
          Ver orden de trabajo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="mr-2 h-4 w-4" />
        )}
        Generar orden de trabajo
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  )
}
