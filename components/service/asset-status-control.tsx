"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  type AssetStatus,
} from "@/modules/service/domain/asset"
import { setAssetStatusAction } from "@/modules/service/presentation/asset-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function AssetStatusControl({
  tenantSlug,
  id,
  status,
}: {
  tenantSlug: string
  id: string
  status: AssetStatus
}) {
  const [state, formAction, pending] = useActionState(
    setAssetStatusAction,
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
        {ASSET_STATUSES.map((value) => (
          <option key={value} value={value}>
            {ASSET_STATUS_LABELS[value]}
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
