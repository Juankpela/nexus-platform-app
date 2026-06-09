"use client"

import { Loader2, Trash2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { unassignWorkOrderAction } from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"

const initialState: SchedulingActionState = { error: null, ok: false }

export function UnassignButton({
  tenantSlug,
  id,
}: {
  tenantSlug: string
  id: string
}) {
  const [state, formAction, pending] = useActionState(
    unassignWorkOrderAction,
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
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
        Desasignar
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
