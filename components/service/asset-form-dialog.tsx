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
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  ASSET_CRITICALITIES,
  ASSET_CRITICALITY_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type Asset,
  type AssetOption,
} from "@/modules/service/domain/asset"
import {
  createAssetAction,
  updateAssetAction,
} from "@/modules/service/presentation/asset-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export type ProductOption = { id: string; name: string }

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

export function AssetFormDialog({
  tenantSlug,
  companyOptions,
  productOptions,
  parentOptions,
  asset,
  trigger,
}: {
  tenantSlug: string
  companyOptions: CompanyOption[]
  productOptions: ProductOption[]
  parentOptions: AssetOption[]
  asset?: Asset
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(asset)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateAssetAction : createAssetAction,
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar activo" : "Nuevo activo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de este activo."
              : "Registra un activo (maquinaria, equipo o componente)."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {asset ? <input type="hidden" name="id" value={asset.id} /> : null}

          <Field label="Nombre" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={asset?.name ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="asset_type" required>
              <select
                id="asset_type"
                name="asset_type"
                defaultValue={asset?.assetType ?? "machinery"}
                className={selectClass}
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ASSET_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría" htmlFor="asset_category" required>
              <select
                id="asset_category"
                name="asset_category"
                defaultValue={asset?.assetCategory ?? "other"}
                className={selectClass}
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Criticidad" htmlFor="criticality" required>
              <select
                id="criticality"
                name="criticality"
                defaultValue={asset?.criticality ?? "medium"}
                className={selectClass}
              >
                {ASSET_CRITICALITIES.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CRITICALITY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Health score (0-100)" htmlFor="health_score">
              <Input
                id="health_score"
                name="health_score"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={asset?.healthScore?.toString() ?? ""}
              />
            </Field>
            <Field label="Empresa / sede" htmlFor="company_id">
              <select
                id="company_id"
                name="company_id"
                defaultValue={asset?.companyId ?? ""}
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
            <Field label="Modelo de catálogo" htmlFor="product_id">
              <select
                id="product_id"
                name="product_id"
                defaultValue={asset?.productId ?? ""}
                className={selectClass}
              >
                <option value="">Sin producto</option>
                {productOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Activo padre" htmlFor="parent_asset_id">
              <select
                id="parent_asset_id"
                name="parent_asset_id"
                defaultValue={asset?.parentAssetId ?? ""}
                className={selectClass}
              >
                <option value="">Ninguno</option>
                {parentOptions
                  .filter((o) => o.id !== asset?.id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.assetNumber} · {o.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="N° de serie" htmlFor="serial_number">
              <Input
                id="serial_number"
                name="serial_number"
                defaultValue={asset?.serialNumber ?? ""}
              />
            </Field>
            <Field label="Fabricante" htmlFor="manufacturer">
              <Input
                id="manufacturer"
                name="manufacturer"
                defaultValue={asset?.manufacturer ?? ""}
              />
            </Field>
            <Field label="Modelo" htmlFor="model">
              <Input id="model" name="model" defaultValue={asset?.model ?? ""} />
            </Field>
            <Field label="Ubicación" htmlFor="location">
              <Input
                id="location"
                name="location"
                defaultValue={asset?.location ?? ""}
              />
            </Field>
            <Field label="Instalado el" htmlFor="installed_at">
              <Input
                id="installed_at"
                name="installed_at"
                type="date"
                defaultValue={asset?.installedAt ?? ""}
              />
            </Field>
            <Field label="Garantía hasta" htmlFor="warranty_until">
              <Input
                id="warranty_until"
                name="warranty_until"
                type="date"
                defaultValue={asset?.warrantyUntil ?? ""}
              />
            </Field>
            <Field label="Próximo servicio" htmlFor="next_service_due_at">
              <Input
                id="next_service_due_at"
                name="next_service_due_at"
                type="date"
                defaultValue={asset?.nextServiceDueAt ?? ""}
              />
            </Field>
            <Field label="Costo de compra" htmlFor="purchase_cost">
              <Input
                id="purchase_cost"
                name="purchase_cost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={asset?.purchaseCost?.toString() ?? ""}
              />
            </Field>
          </div>

          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={asset?.notes ?? ""} />
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
              {isEdit ? "Guardar cambios" : "Crear activo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
