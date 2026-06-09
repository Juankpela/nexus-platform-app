"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import type { TechnicianOption } from "@/components/service/work-order-form-dialog"
import { assignWorkOrderTechnicianAction } from "@/modules/service/presentation/work-order-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function WorkOrderTechnicianAssign({
  tenantSlug,
  id,
  technicianId,
  technicianOptions,
}: {
  tenantSlug: string
  id: string
  technicianId: string | null
  technicianOptions: TechnicianOption[]
}) {
  const [state, formAction, pending] = useActionState(
    assignWorkOrderTechnicianAction,
    initialState,
  )

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <select
        name="technician_id"
        defaultValue={technicianId ?? ""}
        className={selectClass}
        aria-label="Técnico"
      >
        <option value="">Sin asignar</option>
        {technicianOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
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
