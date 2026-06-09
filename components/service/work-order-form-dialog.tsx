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
import type { AssetOption } from "@/modules/service/domain/asset"
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  type WorkOrder,
} from "@/modules/service/domain/work-order"
import {
  createWorkOrderAction,
  updateWorkOrderAction,
} from "@/modules/service/presentation/work-order-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export type TechnicianOption = { id: string; label: string }
export type CaseOption = { id: string; label: string }

export type WorkOrderDefaults = {
  caseId?: string | null
  companyId?: string | null
  assetId?: string | null
}

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

export function WorkOrderFormDialog({
  tenantSlug,
  companyOptions,
  caseOptions,
  assetOptions,
  workOrder,
  defaults,
  trigger,
}: {
  tenantSlug: string
  companyOptions: CompanyOption[]
  caseOptions: CaseOption[]
  assetOptions: AssetOption[]
  workOrder?: WorkOrder
  defaults?: WorkOrderDefaults
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(workOrder)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateWorkOrderAction : createWorkOrderAction,
    initialState,
  )

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  const companyId = workOrder?.companyId ?? defaults?.companyId ?? ""
  const caseId = workOrder?.caseId ?? defaults?.caseId ?? ""
  const assetId = workOrder?.assetId ?? defaults?.assetId ?? ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar orden de trabajo" : "Nueva orden de trabajo"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de esta orden de trabajo."
              : "Registra una intervención técnica sobre un activo."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {workOrder ? (
            <input type="hidden" name="id" value={workOrder.id} />
          ) : null}

          <Field label="Asunto" htmlFor="subject" required>
            <Input
              id="subject"
              name="subject"
              required
              maxLength={200}
              defaultValue={workOrder?.subject ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prioridad" htmlFor="priority" required>
              <select
                id="priority"
                name="priority"
                defaultValue={workOrder?.priority ?? "medium"}
                className={selectClass}
              >
                {WORK_ORDER_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {WORK_ORDER_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Empresa" htmlFor="company_id">
              <select
                id="company_id"
                name="company_id"
                defaultValue={companyId}
                className={selectClass}
              >
                <option value="">Sin empresa</option>
                {companyOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Caso origen" htmlFor="case_id">
              <select
                id="case_id"
                name="case_id"
                defaultValue={caseId}
                className={selectClass}
              >
                <option value="">Sin caso</option>
                {caseOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Activo" htmlFor="asset_id">
              <select
                id="asset_id"
                name="asset_id"
                defaultValue={assetId}
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
            <Field label="Inicio programado" htmlFor="scheduled_start">
              <Input
                id="scheduled_start"
                name="scheduled_start"
                type="datetime-local"
                defaultValue={toLocalInput(workOrder?.scheduledStart ?? null)}
              />
            </Field>
            <Field label="Fin programado" htmlFor="scheduled_end">
              <Input
                id="scheduled_end"
                name="scheduled_end"
                type="datetime-local"
                defaultValue={toLocalInput(workOrder?.scheduledEnd ?? null)}
              />
            </Field>
            <Field label="Horas de trabajo" htmlFor="labor_hours">
              <Input
                id="labor_hours"
                name="labor_hours"
                type="number"
                min={0}
                step="0.25"
                defaultValue={workOrder?.laborHours?.toString() ?? ""}
              />
            </Field>
          </div>

          <Field label="Descripción" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={workOrder?.description ?? ""}
            />
          </Field>

          {isEdit ? (
            <>
              <Field label="Resumen técnico" htmlFor="resolution_summary">
                <Textarea
                  id="resolution_summary"
                  name="resolution_summary"
                  defaultValue={workOrder?.resolutionSummary ?? ""}
                />
              </Field>
              <Field label="Notas de cierre" htmlFor="completion_notes">
                <Textarea
                  id="completion_notes"
                  name="completion_notes"
                  defaultValue={workOrder?.completionNotes ?? ""}
                />
              </Field>
            </>
          ) : null}

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
              {isEdit ? "Guardar cambios" : "Crear orden"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
