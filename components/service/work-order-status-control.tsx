"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TRANSITIONS,
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
  const router = useRouter()
  const [target, setTarget] = useState<WorkOrderStatus | "">("")
  const [lastStatus, setLastStatus] = useState(status)

  // Refresca la vista cuando el cambio fue exitoso, para que el nuevo estado se
  // refleje sin recargar (mismo patrón que el botón "Aceptar" del técnico).
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  // Al refrescar tras un cambio, el `status` entrante cambia: reseteamos la
  // selección en render (patrón recomendado de React, sin setState en effect).
  if (status !== lastStatus) {
    setLastStatus(status)
    setTarget("")
  }

  // Solo ofrece transiciones VÁLIDAS desde el estado actual (la tabla de la WO),
  // así el coordinador no puede elegir un cambio imposible que el servidor
  // rechazaría. Una WO terminal (completada/cancelada) no se cambia.
  const transitions = WORK_ORDER_STATUS_TRANSITIONS[status]
  if (transitions.length === 0) {
    return (
      <span className="inline-flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-sm font-medium text-muted-foreground">
        {WORK_ORDER_STATUS_LABELS[status]}
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
        onChange={(e) => setTarget(e.target.value as WorkOrderStatus)}
        className={selectClass}
        aria-label="Cambiar estado"
      >
        <option value="" disabled>
          {WORK_ORDER_STATUS_LABELS[status]} → cambiar a…
        </option>
        {transitions.map((value) => (
          <option key={value} value={value}>
            {WORK_ORDER_STATUS_LABELS[value]}
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
