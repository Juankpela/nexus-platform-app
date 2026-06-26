"use client"

import { Loader2, Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCOP } from "@/lib/format/money"
import type { ForecastPeriod } from "@/modules/forecasting/domain/revenue-metrics"
import {
  upsertQuotaAction,
  type QuotaActionState,
} from "@/modules/forecasting/presentation/quota-actions"

const initialState: QuotaActionState = { ok: false, error: null }

export function QuotaCard({
  tenantSlug,
  period,
  periodLabelText,
  currentQuota,
  actual,
  canWrite,
}: {
  tenantSlug: string
  period: ForecastPeriod
  periodLabelText: string
  currentQuota: number | null
  actual: number
  canWrite: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(
    upsertQuotaAction.bind(null, tenantSlug),
    initialState,
  )

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) {
      setEditing(false)
      router.refresh()
    }
    wasPending.current = pending
  }, [pending, state.ok, router])

  const attainment =
    currentQuota && currentQuota > 0
      ? Math.min(100, Math.round((actual / currentQuota) * 100))
      : null

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Target className="size-4 text-muted-foreground" />
          Meta de ventas · {periodLabelText}
        </h3>
        {canWrite && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            {currentQuota != null ? "Editar meta" : "Fijar meta"}
          </Button>
        ) : null}
      </div>

      {currentQuota != null ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Logrado</span>
            <span className="tabular-nums font-medium">
              {formatCOP(actual)}{" "}
              <span className="text-muted-foreground">
                / {formatCOP(currentQuota)}
              </span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${attainment ?? 0}%` }}
            />
          </div>
          {attainment != null ? (
            <p className="text-xs text-muted-foreground">
              {attainment}% de la meta
            </p>
          ) : null}
        </div>
      ) : !editing ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no has fijado una meta para este período.
        </p>
      ) : null}

      {editing ? (
        <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="period" value={period} />
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">
              Meta ({periodLabelText})
            </span>
            <Input
              name="quotaAmount"
              type="number"
              step="1"
              min="0"
              required
              defaultValue={currentQuota ?? ""}
              className="h-9 w-44"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Guardar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
          {state.error ? (
            <p role="alert" className="w-full text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}
