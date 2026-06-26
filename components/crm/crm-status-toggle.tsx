"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

export function CrmStatusToggle({
  tenantSlug,
  id,
  status,
  action,
}: {
  tenantSlug: string
  id: string
  status: "active" | "inactive"
  action: (
    state: CrmActionState,
    formData: FormData,
  ) => Promise<CrmActionState>
}) {
  const [state, formAction, pending] = useActionState(action, initialState)
  const next = status === "active" ? "inactive" : "active"

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button
        type="submit"
        size="sm"
        variant={status === "active" ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {status === "active" ? "Desactivar" : "Activar"}
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
