"use client"

import {
  Archive,
  Check,
  Loader2,
  Plus,
  RotateCcw,
  Tag,
  Wrench,
} from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { IssueType } from "@/modules/service/domain/issue-type"
import type { Skill } from "@/modules/service/domain/skill"
import {
  createIssueTypeAction,
  setIssueTypeActiveAction,
} from "@/modules/service/presentation/issue-type-actions"
import {
  archiveSkillAction,
  createSkillAction,
  setSkillAliasesAction,
} from "@/modules/service/presentation/skill-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initialState: ServiceActionState = { error: null, ok: false }

/** Botón que activa/archiva un tipo de daño (sin borrarlo). */
function IssueTypeToggle({
  tenantSlug,
  issueType,
}: {
  tenantSlug: string
  issueType: IssueType
}) {
  const [state, formAction, pending] = useActionState(
    setIssueTypeActiveAction,
    initialState,
  )
  return (
    <form action={formAction}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={issueType.id} />
      <input type="hidden" name="active" value={issueType.active ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        aria-label={issueType.active ? "Archivar tipo de daño" : "Reactivar tipo de daño"}
        title={issueType.active ? "Archivar" : "Reactivar"}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : issueType.active ? (
          <Archive className="size-3.5" />
        ) : (
          <RotateCcw className="size-3.5" />
        )}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

/** Form para agregar un tipo de daño a una skill. */
function AddIssueTypeForm({
  tenantSlug,
  skillId,
}: {
  tenantSlug: string
  skillId: string
}) {
  const [state, formAction, pending] = useActionState(
    createIssueTypeAction,
    initialState,
  )
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="skill_id" value={skillId} />
      <div className="min-w-44 flex-1">
        <Input name="name" maxLength={120} placeholder="Nuevo tipo de daño (p. ej. No enfría)" />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state.ok ? (
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Plus className="size-4" />
        )}
        Agregar
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

/** Editor del vocabulario (aliases) de una skill — reconocer en texto libre. */
function AliasesEditor({
  tenantSlug,
  skill,
}: {
  tenantSlug: string
  skill: Skill
}) {
  const [state, formAction, pending] = useActionState(setSkillAliasesAction, initialState)
  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={skill.id} />
      <label className="block text-xs font-medium text-muted-foreground">
        Vocabulario (para reconocer en texto)
      </label>
      <Textarea
        name="aliases"
        rows={2}
        defaultValue={skill.aliases.join(", ")}
        placeholder="aire, clima, AC…"
        className="text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Sinónimos que usan tus clientes.</p>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : state.ok ? (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : null}
          {state.ok ? "Guardado" : "Guardar"}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

/** Archiva (retira) una categoría de servicio sin borrarla. Sale del catálogo. */
function ArchiveSkillButton({
  tenantSlug,
  skill,
}: {
  tenantSlug: string
  skill: Skill
}) {
  const [state, formAction, pending] = useActionState(archiveSkillAction, initialState)
  return (
    <form action={formAction} className="ml-auto">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={skill.id} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Archivar categoría"
        title="Archivar categoría"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Archive className="size-3.5" />
        )}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

function SkillCard({
  skill,
  issueTypes,
  tenantSlug,
  canWrite,
}: {
  skill: Skill
  issueTypes: IssueType[]
  tenantSlug: string
  canWrite: boolean
}) {
  const activeCount = issueTypes.filter((it) => it.active).length
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Wrench className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">{skill.name}</h3>
        <span className="text-xs text-muted-foreground">
          {activeCount} tipo(s) de daño activo(s)
        </span>
        {canWrite ? <ArchiveSkillButton tenantSlug={tenantSlug} skill={skill} /> : null}
      </div>

      {/* Tipos de daño como entidades (lo que ve el reportante en Paso 2). */}
      <div className="mt-3 space-y-1.5">
        {issueTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún sin tipos de daño. Agrega los problemas frecuentes de esta categoría.
          </p>
        ) : (
          issueTypes.map((it) => (
            <div
              key={it.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                it.active ? "bg-muted/20" : "bg-muted/10 opacity-60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Tag className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{it.name}</span>
                {!it.active ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Archivado
                  </span>
                ) : null}
              </span>
              {canWrite ? (
                <IssueTypeToggle tenantSlug={tenantSlug} issueType={it} />
              ) : null}
            </div>
          ))
        )}
      </div>

      {canWrite ? (
        <div className="mt-4 space-y-4 border-t pt-4">
          <AddIssueTypeForm tenantSlug={tenantSlug} skillId={skill.id} />
          <AliasesEditor tenantSlug={tenantSlug} skill={skill} />
        </div>
      ) : null}
    </div>
  )
}

function CreateSkillForm({ tenantSlug }: { tenantSlug: string }) {
  const [state, formAction, pending] = useActionState(createSkillAction, initialState)
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-5">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <div className="min-w-48 flex-1">
          <label htmlFor="new-skill" className="mb-1 block text-xs font-medium text-muted-foreground">
            Nueva categoría de servicio
          </label>
          <Input id="new-skill" name="name" maxLength={80} placeholder="p. ej. Refrigeración" />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Crear categoría
        </Button>
      </form>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">{state.error}</p>
      ) : null}
    </div>
  )
}

export function ServiceCatalogManager({
  tenantSlug,
  skills,
  issueTypes,
  canWrite,
}: {
  tenantSlug: string
  skills: Skill[]
  issueTypes: IssueType[]
  canWrite: boolean
}) {
  const bySkill = new Map<string, IssueType[]>()
  for (const it of issueTypes) {
    const bucket = bySkill.get(it.skillId)
    if (bucket) bucket.push(it)
    else bySkill.set(it.skillId, [it])
  }

  return (
    <div className="space-y-4">
      {canWrite ? <CreateSkillForm tenantSlug={tenantSlug} /> : null}
      {skills.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no hay categorías en el catálogo.
        </div>
      ) : (
        skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            issueTypes={bySkill.get(skill.id) ?? []}
            tenantSlug={tenantSlug}
            canWrite={canWrite}
          />
        ))
      )}
    </div>
  )
}
