"use client"

import { CheckCircle2, Loader2, UserCheck, XCircle } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type Skill,
} from "@/modules/service/domain/skill"
import type { Zone } from "@/modules/service/domain/zone"
import {
  findEligibleTechniciansAction,
  type EligibilityActionState,
} from "@/modules/scheduling/presentation/eligibility-actions"
import type { EligibilityResult } from "@/modules/scheduling/domain/eligibility"

const initialState: EligibilityActionState = { error: null, results: null }
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

const REASON_LABELS: Record<keyof EligibilityResult["reasons"], string> = {
  status: "Activo",
  skill: "Habilidad",
  zone: "Zona",
  availability: "Disponible",
  capacity: "Capacidad",
  noOverlap: "Sin solape",
}

function ReasonChips({ reasons }: { reasons: EligibilityResult["reasons"] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {(Object.keys(reasons) as (keyof EligibilityResult["reasons"])[]).map((k) => (
        <span
          key={k}
          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
            reasons[k]
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {reasons[k] ? <CheckCircle2 className="size-2.5" /> : <XCircle className="size-2.5" />}
          {REASON_LABELS[k]}
        </span>
      ))}
    </span>
  )
}

export function WorkOrderEligibilityPanel({
  tenantSlug,
  workOrderId,
  hasWindow,
  skills,
  zones,
}: {
  tenantSlug: string
  workOrderId: string
  hasWindow: boolean
  skills: Skill[]
  zones: Zone[]
}) {
  const [state, formAction, pending] = useActionState(findEligibleTechniciansAction, initialState)
  const results = state.results ?? []
  const eligible = results.filter((r) => r.eligible)
  const excluded = results.filter((r) => !r.eligible)

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <UserCheck className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Técnicos elegibles</h2>
        <span className="text-xs text-muted-foreground">(sugerencia · no asigna)</span>
      </div>

      {!hasWindow ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Configura la ventana programada (inicio y fin) de la orden para calcular elegibilidad.
        </p>
      ) : (
        <>
          <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="work_order_id" value={workOrderId} />
            <div>
              <label htmlFor="elig_skill" className="mb-1 block text-xs text-muted-foreground">Habilidad</label>
              <select id="elig_skill" name="skill_id" className={selectClass} defaultValue="">
                <option value="">Cualquiera</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="elig_level" className="mb-1 block text-xs text-muted-foreground">Nivel mín.</label>
              <select id="elig_level" name="level" className={selectClass} defaultValue="mid">
                {SKILL_LEVELS.map((l) => (
                  <option key={l} value={l}>{SKILL_LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="elig_zone" className="mb-1 block text-xs text-muted-foreground">Zona</label>
              <select id="elig_zone" name="zone_id" className={selectClass} defaultValue="">
                <option value="">Cualquiera</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
              Calcular
            </Button>
          </form>

          {state.error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">{state.error}</p>
          ) : null}

          {state.results !== null ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Elegibles ({eligible.length})
                </p>
                {eligible.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ningún técnico cumple todos los criterios.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {eligible.map((r) => (
                      <li key={r.technicianId} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-sm">
                        <span className="font-medium text-foreground">{r.technicianName}</span>
                        <span className="text-xs text-muted-foreground">{r.dayAssignmentCount} órdenes hoy</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {excluded.length > 0 ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">No elegibles ({excluded.length})</summary>
                  <ul className="mt-1.5 space-y-1.5">
                    {excluded.map((r) => (
                      <li key={r.technicianId} className="rounded-lg border bg-muted/10 px-2.5 py-1.5">
                        <span className="font-medium text-foreground">{r.technicianName}</span>
                        <div className="mt-1"><ReasonChips reasons={r.reasons} /></div>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
