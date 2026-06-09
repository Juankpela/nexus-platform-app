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
import {
  TECHNICIAN_STATUSES,
  TECHNICIAN_STATUS_LABELS,
  type Technician,
} from "@/modules/service/domain/technician"
import {
  createTechnicianAction,
  updateTechnicianAction,
} from "@/modules/service/presentation/technician-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

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

export function TechnicianFormDialog({
  tenantSlug,
  technician,
  trigger,
}: {
  tenantSlug: string
  technician?: Technician
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(technician)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateTechnicianAction : createTechnicianAction,
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
          <DialogTitle>{isEdit ? "Editar técnico" : "Nuevo técnico"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del técnico."
              : "Registra un técnico de campo."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {technician ? (
            <input type="hidden" name="id" value={technician.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="first_name" required>
              <Input
                id="first_name"
                name="first_name"
                required
                maxLength={100}
                defaultValue={technician?.firstName ?? ""}
              />
            </Field>
            <Field label="Apellido" htmlFor="last_name" required>
              <Input
                id="last_name"
                name="last_name"
                required
                maxLength={100}
                defaultValue={technician?.lastName ?? ""}
              />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={technician?.email ?? ""}
              />
            </Field>
            <Field label="Teléfono" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                defaultValue={technician?.phone ?? ""}
              />
            </Field>
            <Field label="ID de empleado" htmlFor="employee_id">
              <Input
                id="employee_id"
                name="employee_id"
                defaultValue={technician?.employeeId ?? ""}
              />
            </Field>
            <Field label="Estado" htmlFor="status" required>
              <select
                id="status"
                name="status"
                defaultValue={technician?.status ?? "active"}
                className={selectClass}
              >
                {TECHNICIAN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TECHNICIAN_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
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
              {isEdit ? "Guardar cambios" : "Crear técnico"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
