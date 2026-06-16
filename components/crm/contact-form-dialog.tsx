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
import { Textarea } from "@/components/ui/textarea"
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { Contact } from "@/modules/crm/domain/contact"
import {
  createContactAction,
  updateContactAction,
} from "@/modules/crm/presentation/contact-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

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

export function ContactFormDialog({
  tenantSlug,
  companyOptions,
  contact,
  trigger,
}: {
  tenantSlug: string
  companyOptions: CompanyOption[]
  contact?: Contact
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(contact)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateContactAction : createContactAction,
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
          <DialogTitle>{isEdit ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de este contacto."
              : "Agrega un contacto a este espacio de trabajo."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {contact ? (
            <input type="hidden" name="id" value={contact.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="first_name" required>
              <Input
                id="first_name"
                name="first_name"
                required
                maxLength={120}
                defaultValue={contact?.firstName ?? ""}
              />
            </Field>
            <Field label="Apellido" htmlFor="last_name">
              <Input
                id="last_name"
                name="last_name"
                defaultValue={contact?.lastName ?? ""}
              />
            </Field>
          </div>

          <Field label="Empresa" htmlFor="company_id">
            <select
              id="company_id"
              name="company_id"
              defaultValue={contact?.companyId ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">— Sin empresa —</option>
              {companyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={contact?.email ?? ""}
              />
            </Field>
            <Field label="Cargo" htmlFor="title">
              <Input id="title" name="title" defaultValue={contact?.title ?? ""} />
            </Field>
            <Field label="Teléfono" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={contact?.phone ?? ""} />
            </Field>
            <Field label="Celular" htmlFor="mobile">
              <Input
                id="mobile"
                name="mobile"
                defaultValue={contact?.mobile ?? ""}
              />
            </Field>
            <Field label="Departamento" htmlFor="department">
              <Input
                id="department"
                name="department"
                defaultValue={contact?.department ?? ""}
              />
            </Field>
          </div>

          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={contact?.notes ?? ""} />
          </Field>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? "Guardar cambios" : "Crear contacto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
