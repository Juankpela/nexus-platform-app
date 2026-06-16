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
import type { Company } from "@/modules/crm/domain/company"
import {
  createCompanyAction,
  updateCompanyAction,
} from "@/modules/crm/presentation/company-actions"
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

export function CompanyFormDialog({
  tenantSlug,
  company,
  trigger,
}: {
  tenantSlug: string
  company?: Company
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(company)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateCompanyAction : createCompanyAction,
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
          <DialogTitle>{isEdit ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de esta empresa."
              : "Agrega una empresa a este espacio de trabajo."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {company ? (
            <input type="hidden" name="id" value={company.id} />
          ) : null}

          <Field label="Nombre" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={company?.name ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NIT" htmlFor="tax_id">
              <Input id="tax_id" name="tax_id" defaultValue={company?.taxId ?? ""} />
            </Field>
            <Field label="Industria" htmlFor="industry">
              <Input
                id="industry"
                name="industry"
                defaultValue={company?.industry ?? ""}
              />
            </Field>
            <Field label="Sitio web" htmlFor="website">
              <Input
                id="website"
                name="website"
                defaultValue={company?.website ?? ""}
              />
            </Field>
            <Field label="Teléfono" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={company?.phone ?? ""} />
            </Field>
            <Field label="Ciudad" htmlFor="city">
              <Input id="city" name="city" defaultValue={company?.city ?? ""} />
            </Field>
            <Field label="Departamento" htmlFor="state">
              <Input id="state" name="state" defaultValue={company?.state ?? ""} />
            </Field>
            <Field label="País" htmlFor="country">
              <Input
                id="country"
                name="country"
                defaultValue={company?.country ?? ""}
              />
            </Field>
            <Field label="Dirección" htmlFor="address">
              <Input
                id="address"
                name="address"
                defaultValue={company?.address ?? ""}
              />
            </Field>
          </div>

          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={company?.notes ?? ""} />
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
              {isEdit ? "Guardar cambios" : "Crear empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
