"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { TenantBusinessProfile } from "@/modules/tenancy/domain/tenant"
import {
  updateTenantSettingsAction,
  type SettingsActionState,
} from "@/modules/tenancy/presentation/settings-actions"

const initial: SettingsActionState = { error: null, ok: false }

function Field({
  label,
  name,
  defaultValue,
  disabled,
  type = "text",
}: {
  label: string
  name: string
  defaultValue: string | null
  disabled: boolean
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
      />
    </div>
  )
}

/**
 * Tenant business profile — issuer data printed on quotes/invoices PDFs.
 */
export function BusinessProfileForm({
  tenantSlug,
  tenantName,
  profile,
  canWrite,
}: {
  tenantSlug: string
  tenantName: string
  profile: TenantBusinessProfile
  canWrite: boolean
}) {
  const [state, formAction, pending] = useActionState(
    updateTenantSettingsAction,
    initial,
  )

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold">Datos de la empresa</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Aparecen en las cotizaciones y facturas en PDF.
      </p>

      <form action={formAction} className="mt-4 grid gap-4">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <Field
          label="Razón social"
          name="legal_name"
          defaultValue={profile.legalName ?? tenantName}
          disabled={!canWrite}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIT" name="tax_id" defaultValue={profile.taxId} disabled={!canWrite} />
          <Field label="Teléfono" name="phone" defaultValue={profile.phone} disabled={!canWrite} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="address" className="text-sm font-medium">
            Dirección
          </label>
          <Textarea
            id="address"
            name="address"
            defaultValue={profile.address ?? ""}
            disabled={!canWrite}
            rows={2}
          />
        </div>
        <Field
          label="Correo"
          name="email"
          type="email"
          defaultValue={profile.email}
          disabled={!canWrite}
        />

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Datos guardados.
          </p>
        ) : null}

        {canWrite ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  )
}
