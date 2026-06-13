"use client"

import { CalendarOff, Clock, Loader2, Plus, X } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  EXCEPTION_KINDS,
  EXCEPTION_KIND_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  minutesToHHMM,
  type AvailabilityException,
  type TechnicianCapacity,
  type WeeklyWindow,
} from "@/modules/service/domain/availability"
import {
  addAvailabilityExceptionAction,
  addAvailabilityWindowAction,
  removeAvailabilityExceptionAction,
  removeAvailabilityWindowAction,
  setTechnicianCapacityAction,
} from "@/modules/service/presentation/availability-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function RemoveButton({
  action,
  hidden,
  label,
}: {
  action: typeof removeAvailabilityWindowAction
  hidden: Record<string, string>
  label: string
}) {
  const [, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
    </form>
  )
}

export function TechnicianAvailabilityCard({
  tenantSlug,
  technicianId,
  windows,
  exceptions,
  capacity,
  canWrite,
}: {
  tenantSlug: string
  technicianId: string
  windows: WeeklyWindow[]
  exceptions: AvailabilityException[]
  capacity: TechnicianCapacity
  canWrite: boolean
}) {
  const [windowState, windowAction, windowPending] = useActionState(addAvailabilityWindowAction, initialState)
  const [excState, excAction, excPending] = useActionState(addAvailabilityExceptionAction, initialState)
  const [capState, capAction, capPending] = useActionState(setTechnicianCapacityAction, initialState)

  const hidden = { tenantSlug, technician_id: technicianId }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Disponibilidad y capacidad</h2>
      </div>

      {/* Weekly windows grouped by weekday */}
      <div className="mt-4 space-y-1.5">
        {windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin horario semanal configurado.</p>
        ) : (
          WEEKDAYS.filter((d) => windows.some((w) => w.weekday === d)).map((d) => (
            <div key={d} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground">{WEEKDAY_LABELS[d]}</span>
              <div className="flex flex-wrap gap-1.5">
                {windows
                  .filter((w) => w.weekday === d)
                  .map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/30 py-0.5 pl-2 pr-1 text-xs tabular-nums"
                    >
                      {minutesToHHMM(w.startMinute)}–{minutesToHHMM(w.endMinute)}
                      {canWrite ? (
                        <RemoveButton
                          action={removeAvailabilityWindowAction}
                          hidden={{ ...hidden, window_id: w.id }}
                          label="Quitar ventana"
                        />
                      ) : null}
                    </span>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {canWrite ? (
        <form action={windowAction} className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <select name="weekday" defaultValue="1" className={selectClass} aria-label="Día">
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABELS[d]}
              </option>
            ))}
          </select>
          <Input type="time" name="start" defaultValue="08:00" className="w-32" aria-label="Inicio" />
          <Input type="time" name="end" defaultValue="17:00" className="w-32" aria-label="Fin" />
          <Button type="submit" size="sm" disabled={windowPending}>
            {windowPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar horario
          </Button>
          {windowState.error ? (
            <p role="alert" className="w-full text-sm text-destructive">{windowState.error}</p>
          ) : null}
        </form>
      ) : null}

      {/* Exceptions */}
      <div className="mt-5 border-t pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <CalendarOff className="size-3.5 text-muted-foreground" /> Excepciones
        </p>
        <div className="space-y-1.5">
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin excepciones.</p>
          ) : (
            exceptions.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{EXCEPTION_KIND_LABELS[e.kind]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {e.dateFrom === e.dateTo ? e.dateFrom : `${e.dateFrom} → ${e.dateTo}`}
                  </span>
                  <span className="text-muted-foreground">
                    {e.startMinute === null ? "Día completo" : `${minutesToHHMM(e.startMinute)}–${minutesToHHMM(e.endMinute ?? 0)}`}
                  </span>
                  {e.note ? <span className="text-muted-foreground/70">· {e.note}</span> : null}
                </span>
                {canWrite ? (
                  <RemoveButton
                    action={removeAvailabilityExceptionAction}
                    hidden={{ ...hidden, exception_id: e.id }}
                    label="Quitar excepción"
                  />
                ) : null}
              </div>
            ))
          )}
        </div>

        {canWrite ? (
          <form action={excAction} className="mt-3 flex flex-wrap items-end gap-2">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <Input type="date" name="date_from" className="w-40" aria-label="Desde" required />
            <Input type="date" name="date_to" className="w-40" aria-label="Hasta" required />
            <select name="kind" defaultValue="vacation" className={selectClass} aria-label="Tipo">
              {EXCEPTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EXCEPTION_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <Input type="time" name="start" className="w-28" aria-label="Inicio (opcional)" />
            <Input type="time" name="end" className="w-28" aria-label="Fin (opcional)" />
            <Input name="note" placeholder="Nota (opcional)" className="w-40" />
            <Button type="submit" size="sm" variant="outline" disabled={excPending}>
              {excPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Agregar
            </Button>
            {excState.error ? (
              <p role="alert" className="w-full text-sm text-destructive">{excState.error}</p>
            ) : null}
          </form>
        ) : null}
      </div>

      {/* Capacity */}
      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-sm font-medium">Capacidad diaria</p>
        {canWrite ? (
          <form action={capAction} className="flex flex-wrap items-end gap-3">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <div>
              <label htmlFor="max_work_orders_per_day" className="mb-1 block text-xs text-muted-foreground">
                Máx. órdenes/día
              </label>
              <Input
                id="max_work_orders_per_day"
                name="max_work_orders_per_day"
                type="number"
                min={1}
                max={1000}
                className="w-32"
                defaultValue={capacity.maxWorkOrdersPerDay ?? ""}
                placeholder="Sin tope"
              />
            </div>
            <div>
              <label htmlFor="max_minutes_per_day" className="mb-1 block text-xs text-muted-foreground">
                Máx. minutos/día
              </label>
              <Input
                id="max_minutes_per_day"
                name="max_minutes_per_day"
                type="number"
                min={1}
                max={1440}
                className="w-32"
                defaultValue={capacity.maxMinutesPerDay ?? ""}
                placeholder="Sin tope"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={capPending}>
              {capPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
            {capState.error ? (
              <p role="alert" className="w-full text-sm text-destructive">{capState.error}</p>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {capacity.maxWorkOrdersPerDay ?? "—"} órdenes/día · {capacity.maxMinutesPerDay ?? "—"} min/día
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          La capacidad de tiempo también se deriva de las ventanas; estos topes son límites adicionales.
        </p>
      </div>
    </div>
  )
}
