"use client"

import { Loader2, Plus, Sparkles, X } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type Skill,
} from "@/modules/service/domain/skill"
import type { TechnicianSkill } from "@/modules/service/domain/technician-skill"
import {
  assignTechnicianSkillAction,
  createSkillAction,
  removeTechnicianSkillAction,
} from "@/modules/service/presentation/skill-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function RemoveSkillButton({
  tenantSlug,
  technicianId,
  skillId,
}: {
  tenantSlug: string
  technicianId: string
  skillId: string
}) {
  const [, formAction, pending] = useActionState(
    removeTechnicianSkillAction,
    initialState,
  )
  return (
    <form action={formAction}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="technician_id" value={technicianId} />
      <input type="hidden" name="skill_id" value={skillId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Quitar habilidad"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
    </form>
  )
}

export function TechnicianSkillsCard({
  tenantSlug,
  technicianId,
  catalog,
  technicianSkills,
  canWrite,
}: {
  tenantSlug: string
  technicianId: string
  catalog: Skill[]
  technicianSkills: TechnicianSkill[]
  canWrite: boolean
}) {
  const [assignState, assignAction, assignPending] = useActionState(
    assignTechnicianSkillAction,
    initialState,
  )
  const [createState, createAction, createPending] = useActionState(
    createSkillAction,
    initialState,
  )

  const assigned = new Set(technicianSkills.map((s) => s.skillId))
  const available = catalog.filter((s) => !assigned.has(s.id))

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Habilidades</h2>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {technicianSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin habilidades asignadas.</p>
        ) : (
          technicianSkills.map((s) => (
            <span
              key={s.skillId}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 py-0.5 pl-2.5 pr-1 text-xs"
            >
              <span className="font-medium text-foreground">{s.skillName}</span>
              <span className="text-muted-foreground">· {SKILL_LEVEL_LABELS[s.level]}</span>
              {canWrite ? (
                <RemoveSkillButton
                  tenantSlug={tenantSlug}
                  technicianId={technicianId}
                  skillId={s.skillId}
                />
              ) : null}
            </span>
          ))
        )}
      </div>

      {canWrite ? (
        <div className="mt-5 space-y-4 border-t pt-4">
          {/* Assign an existing catalog skill */}
          <form action={assignAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="technician_id" value={technicianId} />
            <div className="flex-1 min-w-40">
              <label htmlFor="skill_id" className="mb-1 block text-xs font-medium text-muted-foreground">
                Habilidad
              </label>
              <select id="skill_id" name="skill_id" required className={`${selectClass} w-full`} disabled={available.length === 0}>
                {available.length === 0 ? (
                  <option value="">Sin habilidades disponibles</option>
                ) : (
                  available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label htmlFor="level" className="mb-1 block text-xs font-medium text-muted-foreground">
                Nivel
              </label>
              <select id="level" name="level" defaultValue="mid" className={selectClass}>
                {SKILL_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {SKILL_LEVEL_LABELS[l]}
                  </option>
                ))}
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

          {/* Create a new catalog skill */}
          <form action={createAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="technician_id" value={technicianId} />
            <div className="flex-1 min-w-40">
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-muted-foreground">
                Nueva habilidad al catálogo
              </label>
              <Input id="name" name="name" maxLength={80} placeholder="p. ej. Refrigeración" />
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
