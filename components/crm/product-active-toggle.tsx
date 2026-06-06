"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { setProductActiveAction } from "@/modules/crm/presentation/product-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

export function ProductActiveToggle({
  tenantSlug,
  id,
  active,
}: {
  tenantSlug: string
  id: string
  active: boolean
}) {
  const [state, formAction, pending] = useActionState(
    setProductActiveAction,
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button
        type="submit"
        size="sm"
        variant={active ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {active ? "Deactivate" : "Activate"}
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
