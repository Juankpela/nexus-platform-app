"use client"

import { Loader2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"

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
import {
  assignWorkOrderAction,
  reassignWorkOrderAction,
} from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"

const initial: SchedulingActionState = { error: null, ok: false }

export type TechnicianOption = { id: string; name: string }

/**
 * Fast assign/reassign: pick a technician → Confirmar. No date/time form — the
 * scheduled window comes from the work order / current assignment.
 */
export function AssignTechnicianDialog({
  mode,
  tenantSlug,
  targetId,
  scheduledStart,
  scheduledEnd,
  technicians,
  currentTechnicianId,
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "sm",
}: {
  mode: "assign" | "reassign"
  tenantSlug: string
  /** workOrderId when assigning, assignmentId when reassigning. */
  targetId: string
  scheduledStart: string
  scheduledEnd: string
  technicians: TechnicianOption[]
  currentTechnicianId?: string
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "ghost"
  triggerSize?: "sm" | "default"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const action = mode === "assign" ? assignWorkOrderAction : reassignWorkOrderAction
  const [state, formAction, pending] = useActionState(action, initial)

  const seen = useRef(false)
  useEffect(() => {
    if (state.ok && !seen.current) {
      seen.current = true
      setOpen(false)
      router.refresh()
    }
    if (!state.ok) seen.current = false
  }, [state.ok, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={triggerVariant} size={triggerSize}>
          <UserPlus className="size-4" />
          {triggerLabel ?? (mode === "assign" ? "Asignar" : "Reasignar")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "assign" ? "Asignar técnico" : "Reasignar técnico"}</DialogTitle>
          <DialogDescription>
            Selecciona el técnico y confirma. Se respeta el horario de la orden.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input
            type="hidden"
            name={mode === "assign" ? "work_order_id" : "id"}
            value={targetId}
          />
          <input type="hidden" name="scheduled_start" value={scheduledStart} />
          <input type="hidden" name="scheduled_end" value={scheduledEnd} />

          <select
            name="technician_id"
            required
            defaultValue={currentTechnicianId ?? ""}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <option value="" disabled>
              Selecciona un técnico
            </option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
