"use client"

import { Check, Loader2, RotateCcw } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { setActivityStatusAction } from "@/modules/crm/presentation/activity-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

export function ActivityStatusToggle({
  tenantSlug,
  returnPath,
  id,
  status,
}: {
  tenantSlug: string
  returnPath: string
  id: string
  status: "open" | "completed"
}) {
  const [state, formAction, pending] = useActionState(
    setActivityStatusAction,
    initialState,
  )
  const next = status === "completed" ? "open" : "completed"

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button
        type="submit"
        size="sm"
        variant={status === "completed" ? "ghost" : "outline"}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : status === "completed" ? (
          <RotateCcw />
        ) : (
          <Check />
        )}
        {status === "completed" ? "Reopen" : "Complete"}
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
