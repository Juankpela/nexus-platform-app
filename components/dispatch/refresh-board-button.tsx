"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { refreshDispatchBoardAction } from "@/modules/dispatch/presentation/dispatch-actions"

export function RefreshBoardButton({ tenantSlug }: { tenantSlug: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshDispatchBoardAction(tenantSlug)
        })
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Actualizar
    </Button>
  )
}
