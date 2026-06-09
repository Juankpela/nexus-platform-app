"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { OwnerOption } from "@/components/service/case-form-dialog"
import { assignCaseOwnerAction } from "@/modules/service/presentation/case-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function CaseOwnerAssign({
  tenantSlug,
  id,
  ownerId,
  ownerOptions,
}: {
  tenantSlug: string
  id: string
  ownerId: string | null
  ownerOptions: OwnerOption[]
}) {
  const [state, formAction, pending] = useActionState(
    assignCaseOwnerAction,
    initialState,
  )

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <select
        name="owner_id"
        defaultValue={ownerId ?? ""}
        className={selectClass}
        aria-label="Responsable"
      >
        <option value="">Sin asignar</option>
        {ownerOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Asignar
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
