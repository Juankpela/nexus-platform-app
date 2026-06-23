"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_TRANSITIONS,
  type CaseStatus,
} from "@/modules/service/domain/case"
import { setCaseStatusAction } from "@/modules/service/presentation/case-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function CaseStatusControl({
  tenantSlug,
  id,
  status,
}: {
  tenantSlug: string
  id: string
  status: CaseStatus
}) {
  const [state, formAction, pending] = useActionState(
    setCaseStatusAction,
    initialState,
  )
  const router = useRouter()
  const [target, setTarget] = useState<CaseStatus | "">("")
  const [lastStatus, setLastStatus] = useState(status)

  // Refresca la vista al cambiar con éxito, para reflejar el nuevo estado sin
  // recargar (mismo patrón que el control de la WO).
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  // Reset de la selección en render cuando llega el nuevo `status` tras refrescar.
  if (status !== lastStatus) {
    setLastStatus(status)
    setTarget("")
  }

  // Solo transiciones VÁLIDAS desde el estado actual; un caso cerrado es terminal.
  const transitions = CASE_STATUS_TRANSITIONS[status]
  if (transitions.length === 0) {
    return (
      <span className="inline-flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-sm font-medium text-muted-foreground">
        {CASE_STATUS_LABELS[status]}
      </span>
    )
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        value={target}
        onChange={(e) => setTarget(e.target.value as CaseStatus)}
        className={selectClass}
        aria-label="Cambiar estado"
      >
        <option value="" disabled>
          {CASE_STATUS_LABELS[status]} → cambiar a…
        </option>
        {transitions.map((value) => (
          <option key={value} value={value}>
            {CASE_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending || !target}>
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
