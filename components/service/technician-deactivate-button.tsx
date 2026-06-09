"use client"

import { Loader2, UserX } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { deactivateTechnicianAction } from "@/modules/service/presentation/technician-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

export function TechnicianDeactivateButton({
  tenantSlug,
  id,
}: {
  tenantSlug: string
  id: string
}) {
  const [state, formAction, pending] = useActionState(
    deactivateTechnicianAction,
    initialState,
  )

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="text-destructive hover:text-destructive"
      >
        {pending ? <Loader2 className="animate-spin" /> : <UserX className="size-4" />}
        Desactivar
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
