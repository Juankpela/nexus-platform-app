"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import { setOpportunityStatusAction } from "@/modules/crm/presentation/opportunity-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function OpportunityStatusControl({
  tenantSlug,
  id,
  status,
}: {
  tenantSlug: string
  id: string
  status: OpportunityStatus
}) {
  const [state, formAction, pending] = useActionState(
    setOpportunityStatusAction,
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
        aria-label="Status"
      >
        {OPPORTUNITY_STATUSES.map((value) => (
          <option key={value} value={value}>
            {OPPORTUNITY_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Update status
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
