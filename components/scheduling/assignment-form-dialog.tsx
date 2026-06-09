"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"
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
import { Input } from "@/components/ui/input"
import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"
import {
  assignWorkOrderAction,
  reassignWorkOrderAction,
} from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"

const initialState: SchedulingActionState = { error: null, ok: false }

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export type SelectOption = { id: string; label: string }

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  )
}

function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : ""
}

export function AssignmentFormDialog({
  tenantSlug,
  workOrderOptions,
  technicianOptions,
  assignment,
  trigger,
}: {
  tenantSlug: string
  workOrderOptions: SelectOption[]
  technicianOptions: SelectOption[]
  assignment?: WorkOrderAssignment
  trigger: React.ReactNode
}) {
  const isReassign = Boolean(assignment)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isReassign ? reassignWorkOrderAction : assignWorkOrderAction,
    initialState,
  )

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReassign ? "Reasignar orden de trabajo" : "Asignar orden de trabajo"}
          </DialogTitle>
          <DialogDescription>
            {isReassign
              ? "Cambia el técnico y/o el horario. Se revalida la disponibilidad."
              : "Programa una orden de trabajo a un técnico disponible."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {assignment ? (
            <input type="hidden" name="id" value={assignment.id} />
          ) : null}

          {isReassign ? (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Orden: </span>
              <span className="font-medium">
                {assignment?.workOrderNumber} · {assignment?.workOrderSubject}
              </span>
            </div>
          ) : (
            <Field label="Orden de trabajo" htmlFor="work_order_id" required>
              <select
                id="work_order_id"
                name="work_order_id"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Selecciona una orden
                </option>
                {workOrderOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Técnico" htmlFor="technician_id" required>
            <select
              id="technician_id"
              name="technician_id"
              required
              defaultValue={assignment?.technicianId ?? ""}
              className={selectClass}
            >
              <option value="" disabled>
                Selecciona un técnico
              </option>
              {technicianOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio" htmlFor="scheduled_start" required>
              <Input
                id="scheduled_start"
                name="scheduled_start"
                type="datetime-local"
                required
                defaultValue={toLocalInput(assignment?.scheduledStart ?? null)}
              />
            </Field>
            <Field label="Fin" htmlFor="scheduled_end" required>
              <Input
                id="scheduled_end"
                name="scheduled_end"
                type="datetime-local"
                required
                defaultValue={toLocalInput(assignment?.scheduledEnd ?? null)}
              />
            </Field>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {isReassign ? "Reasignar" : "Asignar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
