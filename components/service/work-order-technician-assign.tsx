"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  assignWorkOrderAction,
  reassignWorkOrderAction,
  unassignWorkOrderAction,
} from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"

const initialState: SchedulingActionState = { error: null, ok: false }
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export type TechnicianOption = { id: string; label: string }

export type ActiveAssignment = {
  id: string
  technicianId: string
  technicianName: string | null
  scheduledStart: string
  scheduledEnd: string
}

function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : ""
}

/**
 * ADR-031: assigning a technician on the Work Order creates/updates a real
 * work_order_assignment (technician + window) via the scheduling aggregate — so
 * it shows on the dispatch board and /worker. Reassign/unassign act on the
 * active assignment. No more legacy assigned_technician_id.
 */
export function WorkOrderTechnicianAssign({
  tenantSlug,
  workOrderId,
  woStart,
  woEnd,
  activeAssignment,
  technicianOptions,
}: {
  tenantSlug: string
  workOrderId: string
  woStart: string | null
  woEnd: string | null
  activeAssignment: ActiveAssignment | null
  technicianOptions: TechnicianOption[]
}) {
  const router = useRouter()
  const isReassign = activeAssignment !== null

  const [state, formAction, pending] = useActionState(
    isReassign ? reassignWorkOrderAction : assignWorkOrderAction,
    initialState,
  )
  const [unassignState, unassignAction, unassignPending] = useActionState(
    unassignWorkOrderAction,
    initialState,
  )

  // Refresh the server component so the derived technician + window update.
  const seen = useRef(false)
  useEffect(() => {
    if ((state.ok || unassignState.ok) && !seen.current) {
      seen.current = true
      router.refresh()
    }
    if (!state.ok && !unassignState.ok) seen.current = false
  }, [state.ok, unassignState.ok, router])

  const defaultStart = toLocalInput(activeAssignment?.scheduledStart ?? woStart)
  const defaultEnd = toLocalInput(activeAssignment?.scheduledEnd ?? woEnd)

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        {isReassign ? (
          <input type="hidden" name="id" value={activeAssignment.id} />
        ) : (
          <input type="hidden" name="work_order_id" value={workOrderId} />
        )}
        <div>
          <label htmlFor="wo_tech" className="mb-1 block text-xs text-muted-foreground">Técnico</label>
          <select
            id="wo_tech"
            name="technician_id"
            defaultValue={activeAssignment?.technicianId ?? ""}
            className={selectClass}
            aria-label="Técnico"
            required
          >
            <option value="">Seleccionar…</option>
            {technicianOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wo_start" className="mb-1 block text-xs text-muted-foreground">Inicio</label>
          <Input id="wo_start" name="scheduled_start" type="datetime-local" defaultValue={defaultStart} className="w-48" required />
        </div>
        <div>
          <label htmlFor="wo_end" className="mb-1 block text-xs text-muted-foreground">Fin</label>
          <Input id="wo_end" name="scheduled_end" type="datetime-local" defaultValue={defaultEnd} className="w-48" required />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isReassign ? "Reagendar" : "Agendar"}
        </Button>
      </form>

      {isReassign ? (
        <form action={unassignAction}>
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="id" value={activeAssignment.id} />
          <button
            type="submit"
            disabled={unassignPending}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
          >
            {unassignPending ? "Quitando…" : "Quitar asignación"}
          </button>
        </form>
      ) : null}

      {state.error || unassignState.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error ?? unassignState.error}
        </span>
      ) : null}
    </div>
  )
}
