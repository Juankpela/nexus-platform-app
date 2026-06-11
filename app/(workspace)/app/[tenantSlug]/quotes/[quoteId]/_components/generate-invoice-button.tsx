"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { generateInvoiceFromQuoteAction } from "@/modules/billing/presentation/invoice-actions"

export function GenerateInvoiceFromQuoteButton({
  tenantSlug,
  quoteId,
}: {
  tenantSlug: string
  quoteId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    start(async () => {
      const r = await generateInvoiceFromQuoteAction(tenantSlug, quoteId)
      if (r.ok && r.data) {
        router.push(`/app/${tenantSlug}/invoices/${r.data.id}`)
      } else if (r.error) {
        setError(r.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Receipt className="mr-2 h-4 w-4" />
        )}
        Generar factura
      </Button>
      {error && (
        <p className="max-w-xs text-right text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
