"use client"

import { Loader2, MapPin, Plus, X } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Zone } from "@/modules/service/domain/zone"
import type { TechnicianZone } from "@/modules/service/domain/technician-zone"
import {
  assignTechnicianZoneAction,
  createZoneAction,
  removeTechnicianZoneAction,
} from "@/modules/service/presentation/zone-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function RemoveZoneButton({
  tenantSlug,
  technicianId,
  zoneId,
}: {
  tenantSlug: string
  technicianId: string
  zoneId: string
}) {
  const [, formAction, pending] = useActionState(
    removeTechnicianZoneAction,
    initialState,
  )
  return (
    <form action={formAction}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="technician_id" value={technicianId} />
      <input type="hidden" name="zone_id" value={zoneId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Quitar zona"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
    </form>
  )
}

export function TechnicianZonesCard({
  tenantSlug,
  technicianId,
  catalog,
  technicianZones,
  canWrite,
}: {
  tenantSlug: string
  technicianId: string
  catalog: Zone[]
  technicianZones: TechnicianZone[]
  canWrite: boolean
}) {
  const [assignState, assignAction, assignPending] = useActionState(
    assignTechnicianZoneAction,
    initialState,
  )
  const [createState, createAction, createPending] = useActionState(
    createZoneAction,
    initialState,
  )

  const assigned = new Set(technicianZones.map((z) => z.zoneId))
  const available = catalog.filter((z) => !assigned.has(z.id))

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Zonas de cobertura</h2>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {technicianZones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin zonas asignadas.</p>
        ) : (
          technicianZones.map((z) => (
            <span
              key={z.zoneId}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 py-0.5 pl-2.5 pr-1 text-xs"
            >
              <span className="font-medium text-foreground">{z.zoneName}</span>
              {canWrite ? (
                <RemoveZoneButton
                  tenantSlug={tenantSlug}
                  technicianId={technicianId}
                  zoneId={z.zoneId}
                />
              ) : null}
            </span>
          ))
        )}
      </div>

      {canWrite ? (
        <div className="mt-5 space-y-4 border-t pt-4">
          <form action={assignAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="technician_id" value={technicianId} />
            <div className="flex-1 min-w-40">
              <label htmlFor="zone_id" className="mb-1 block text-xs font-medium text-muted-foreground">
                Zona
              </label>
              <select id="zone_id" name="zone_id" required className={`${selectClass} w-full`} disabled={available.length === 0}>
                {available.length === 0 ? (
                  <option value="">Sin zonas disponibles</option>
                ) : (
                  available.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <Button type="submit" size="sm" disabled={assignPending || available.length === 0}>
              {assignPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Asignar
            </Button>
          </form>
          {assignState.error ? (
            <p role="alert" className="text-sm text-destructive">{assignState.error}</p>
          ) : null}

          <form action={createAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="technician_id" value={technicianId} />
            <div className="flex-1 min-w-40">
              <label htmlFor="zone_name" className="mb-1 block text-xs font-medium text-muted-foreground">
                Nueva zona al catálogo
              </label>
              <Input id="zone_name" name="name" maxLength={80} placeholder="p. ej. Medellín Norte" />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={createPending}>
              {createPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Crear
            </Button>
          </form>
          {createState.error ? (
            <p role="alert" className="text-sm text-destructive">{createState.error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
