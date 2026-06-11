"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createWorkOrderFromQuoteAction } from "@/modules/service/presentation/work-order-actions"

export function GenerateWorkOrderButton({
  tenantSlug,
  quoteId,
}: {
  tenantSlug: string
  quoteId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function handleClick() {
    start(async () => {
      const r = await createWorkOrderFromQuoteAction(tenantSlug, quoteId)
      if (r.ok && r.workOrderId) {
        router.push(`/app/${tenantSlug}/work-orders/${r.workOrderId}`)
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
        <Wrench className="mr-2 h-4 w-4" />
      )}
      Generar orden de trabajo
    </Button>
  )
}
