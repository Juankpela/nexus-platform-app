"use client"

import { Loader2, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { assignWorkOrderAction } from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"

const initial: SchedulingActionState = { error: null, ok: false }

/**
 * One-click assign of the suggested technician, reusing the work order's own
 * scheduled window. The system recommends; the user confirms with a single tap.
 * "Otro técnico" (AssignTechnicianDialog) stays available for a different pick.
 */
export function QuickAssignButton({
  tenantSlug,
  workOrderId,
  technicianId,
  technicianName,
  scheduledStart,
  scheduledEnd,
}: {
  tenantSlug: string
  workOrderId: string
  technicianId: string
  technicianName: string
  scheduledStart: string
  scheduledEnd: string
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(assignWorkOrderAction, initial)

  const seen = useRef(false)
  useEffect(() => {
    if (state.ok && !seen.current) {
      seen.current = true
      router.refresh()
    }
    if (!state.ok) seen.current = false
  }, [state.ok, router])

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="work_order_id" value={workOrderId} />
      <input type="hidden" name="technician_id" value={technicianId} />
      <input type="hidden" name="scheduled_start" value={scheduledStart} />
      <input type="hidden" name="scheduled_end" value={scheduledEnd} />
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">{state.error}</span>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
        Asignar a {technicianName}
      </Button>
    </form>
  )
}
