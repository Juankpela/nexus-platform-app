"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import { setWorkOrderStatusAction } from "@/modules/service/presentation/work-order-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function WorkOrderStatusControl({
  tenantSlug,
  id,
  status,
}: {
  tenantSlug: string
  id: string
  status: WorkOrderStatus
}) {
  const [state, formAction, pending] = useActionState(
    setWorkOrderStatusAction,
    initialState,
  )

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        className={selectClass}
        aria-label="Estado"
      >
        {WORK_ORDER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {WORK_ORDER_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Cambiar estado
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
