"use client"

import { Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef } from "react"

import {
  AssignTechnicianDialog,
  type TechnicianOption,
} from "@/components/dispatch/assign-technician-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { unassignWorkOrderAction } from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"
import { setWorkOrderStatusAction } from "@/modules/service/presentation/work-order-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TRANSITIONS,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"

const schedInitial: SchedulingActionState = { error: null, ok: false }
const svcInitial: ServiceActionState = { error: null, ok: false }

function useRefreshOnOk(ok: boolean) {
  const router = useRouter()
  const seen = useRef(false)
  useEffect(() => {
    if (ok && !seen.current) {
      seen.current = true
      router.refresh()
    }
    if (!ok) seen.current = false
  }, [ok, router])
}

function StatusControl({
  tenantSlug,
  workOrderId,
  status,
}: {
  tenantSlug: string
  workOrderId: string
  status: WorkOrderStatus
}) {
  const [state, formAction] = useActionState(setWorkOrderStatusAction, svcInitial)
  useRefreshOnOk(state.ok)
  const options = [status, ...WORK_ORDER_STATUS_TRANSITIONS[status]]
  if (options.length <= 1) return null

  return (
    <form action={formAction}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={workOrderId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] outline-none focus-visible:border-ring"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {WORK_ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  )
}

function UnassignButton({ tenantSlug, assignmentId }: { tenantSlug: string; assignmentId: string }) {
  const [state, formAction, pending] = useActionState(unassignWorkOrderAction, schedInitial)
  useRefreshOnOk(state.ok)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label="Quitar asignación">
          <X className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar asignación</DialogTitle>
          <DialogDescription>
            La orden volverá a “sin asignar”. Puedes reasignarla luego.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex justify-end gap-2">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="id" value={assignmentId} />
          {state.error ? (
            <p role="alert" className="mr-auto text-sm text-destructive">{state.error}</p>
          ) : null}
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quitar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Per-assignment quick actions on the dispatch board: reassign · status · remove. */
export function AssignmentActions({
  tenantSlug,
  assignmentId,
  workOrderId,
  scheduledStart,
  scheduledEnd,
  currentTechnicianId,
  technicians,
  workOrderStatus,
}: {
  tenantSlug: string
  assignmentId: string
  workOrderId: string
  scheduledStart: string
  scheduledEnd: string
  currentTechnicianId: string
  technicians: TechnicianOption[]
  workOrderStatus?: WorkOrderStatus
}) {
  return (
    <div className="flex items-center gap-1">
      {workOrderStatus ? (
        <StatusControl tenantSlug={tenantSlug} workOrderId={workOrderId} status={workOrderStatus} />
      ) : null}
      <AssignTechnicianDialog
        mode="reassign"
        tenantSlug={tenantSlug}
        targetId={assignmentId}
        scheduledStart={scheduledStart}
        scheduledEnd={scheduledEnd}
        technicians={technicians}
        currentTechnicianId={currentTechnicianId}
        triggerLabel="Reasignar"
        triggerVariant="ghost"
      />
      <UnassignButton tenantSlug={tenantSlug} assignmentId={assignmentId} />
    </div>
  )
}
