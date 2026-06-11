"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { generateInvoiceFromWorkOrderAction } from "@/modules/billing/presentation/invoice-actions"

export function GenerateInvoiceButton({
  tenantSlug,
  workOrderId,
}: {
  tenantSlug: string
  workOrderId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function handleClick() {
    start(async () => {
      const r = await generateInvoiceFromWorkOrderAction(tenantSlug, workOrderId)
      if (r.ok && r.data) {
        router.push(`/app/${tenantSlug}/invoices/${r.data.id}`)
      } else if (r.error) {
        window.alert(r.error)
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Receipt className="mr-2 h-4 w-4" />
      )}
      Generar factura
    </Button>
  )
}
