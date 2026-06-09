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
import type { ContactOption } from "@/modules/crm/domain/contact"
import type { AssetOption } from "@/modules/service/domain/asset"
import {
  CASE_ORIGINS,
  CASE_ORIGIN_LABELS,
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  type Case,
} from "@/modules/service/domain/case"
import {
  createCaseAction,
  updateCaseAction,
} from "@/modules/service/presentation/case-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export type OwnerOption = { id: string; label: string }

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

export function CaseFormDialog({
  tenantSlug,
  companyOptions,
  contactOptions,
  ownerOptions,
  assetOptions = [],
  serviceCase,
  trigger,
}: {
  tenantSlug: string
  companyOptions: CompanyOption[]
  contactOptions: ContactOption[]
  ownerOptions: OwnerOption[]
  assetOptions?: AssetOption[]
  serviceCase?: Case
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(serviceCase)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateCaseAction : createCaseAction,
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
          <DialogTitle>{isEdit ? "Editar caso" : "Nuevo caso"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los detalles de este caso de servicio."
              : "Registra un caso de servicio para una empresa y contacto."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {serviceCase ? (
            <input type="hidden" name="id" value={serviceCase.id} />
          ) : null}

          <Field label="Asunto" htmlFor="subject" required>
            <Input
              id="subject"
              name="subject"
              required
              maxLength={200}
              defaultValue={serviceCase?.subject ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Empresa" htmlFor="company_id">
              <select
                id="company_id"
                name="company_id"
                defaultValue={serviceCase?.companyId ?? ""}
                className={selectClass}
              >
                <option value="">Sin empresa</option>
                {companyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contacto" htmlFor="contact_id">
              <select
                id="contact_id"
                name="contact_id"
                defaultValue={serviceCase?.contactId ?? ""}
                className={selectClass}
              >
                <option value="">Sin contacto</option>
                {contactOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad" htmlFor="priority" required>
              <select
                id="priority"
                name="priority"
                defaultValue={serviceCase?.priority ?? "medium"}
                className={selectClass}
              >
                {CASE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {CASE_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Origen" htmlFor="origin" required>
              <select
                id="origin"
                name="origin"
                defaultValue={serviceCase?.origin ?? "manual"}
                className={selectClass}
              >
                {CASE_ORIGINS.map((o) => (
                  <option key={o} value={o}>
                    {CASE_ORIGIN_LABELS[o]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Activo" htmlFor="asset_id">
              <select
                id="asset_id"
                name="asset_id"
                defaultValue={serviceCase?.assetId ?? ""}
                className={selectClass}
              >
                <option value="">Sin activo</option>
                {assetOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetNumber} · {a.name}
                  </option>
                ))}
              </select>
            </Field>
            {isEdit ? null : (
              <Field label="Responsable" htmlFor="owner_id">
                <select
                  id="owner_id"
                  name="owner_id"
                  defaultValue=""
                  className={selectClass}
                >
                  <option value="">Yo (por defecto)</option>
                  {ownerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <Field label="Descripción" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={serviceCase?.description ?? ""}
            />
          </Field>

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
              {isEdit ? "Guardar cambios" : "Crear caso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
