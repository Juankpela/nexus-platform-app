"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowRight, Loader2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TRANSITIONS,
  canConvertLead,
  type Lead,
  type LeadStatus,
} from "@/modules/crm/domain/lead"
import {
  OPPORTUNITY_BUSINESS_TYPES,
  OPPORTUNITY_BUSINESS_TYPE_LABELS,
} from "@/modules/crm/domain/opportunity"
import {
  changeLeadStatusAction,
  convertLeadAction,
  updateLeadAction,
} from "@/modules/crm/presentation/lead-actions"

export function LeadDetailActions({
  tenantSlug,
  lead,
  canWrite,
}: {
  tenantSlug: string
  lead: Lead
  canWrite: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, startBusy] = useTransition()
  const [editPending, startEdit] = useTransition()
  const [convertPending, startConvert] = useTransition()
  const [editError, setEditError] = useState<string | null>(null)
  const [convertError, setConvertError] = useState<string | null>(null)

  if (!canWrite) return null

  if (lead.status === "converted") {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Lead convertido.{" "}
        {lead.convertedOpportunityId && (
          <Link
            href={`/app/${tenantSlug}/opportunities/${lead.convertedOpportunityId}`}
            className="font-medium text-foreground hover:underline"
          >
            Ver oportunidad →
          </Link>
        )}
      </div>
    )
  }

  const transitions = LEAD_STATUS_TRANSITIONS[lead.status]

  function handleStatus(status: LeadStatus) {
    startBusy(async () => {
      const r = await changeLeadStatusAction(tenantSlug, lead.id, status)
      if (r.ok) router.refresh()
      else if (r.error) window.alert(r.error)
    })
  }

  function handleEdit(formData: FormData) {
    setEditError(null)
    startEdit(async () => {
      const r = await updateLeadAction(
        tenantSlug,
        lead.id,
        { ok: false, error: null },
        formData,
      )
      if (r.ok) {
        setEditing(false)
        router.refresh()
      } else {
        setEditError(r.error)
      }
    })
  }

  function handleConvert(formData: FormData) {
    setConvertError(null)
    startConvert(async () => {
      const r = await convertLeadAction(
        tenantSlug,
        lead.id,
        { ok: false, error: null },
        formData,
      )
      if (r.ok && r.opportunityId) {
        router.push(`/app/${tenantSlug}/opportunities/${r.opportunityId}`)
      } else if (r.error) {
        setConvertError(r.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((s) => (
          <Button
            key={s}
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => handleStatus(s)}
          >
            {LEAD_STATUS_LABELS[s]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      {editing && (
        <form action={handleEdit} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Nombre *</span>
              <Input name="name" defaultValue={lead.name} required className="h-9" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Empresa</span>
              <Input name="company" defaultValue={lead.company ?? ""} className="h-9" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Email</span>
              <Input name="email" defaultValue={lead.email ?? ""} className="h-9" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Teléfono</span>
              <Input name="phone" defaultValue={lead.phone ?? ""} className="h-9" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Fuente</span>
              <select
                name="source"
                defaultValue={lead.source ?? "web"}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Notas</span>
              <Input name="notes" defaultValue={lead.notes ?? ""} className="h-9" />
            </label>
          </div>
          <Button type="submit" size="sm" disabled={editPending}>
            {editPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
          {editError && <p className="text-sm text-destructive">{editError}</p>}
        </form>
      )}

      {canConvertLead(lead.status) && (
        <form action={handleConvert} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Convertir a oportunidad</h2>
          <p className="text-xs text-muted-foreground">
            Se crearán empresa y contacto a partir del lead, y una oportunidad. El
            lead quedará marcado como convertido (no se elimina).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">
                Nombre de la oportunidad *
              </span>
              <Input
                name="opportunityName"
                defaultValue={`${lead.name} — Oportunidad`}
                required
                className="h-9"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Tipo de negocio</span>
              <select
                name="businessType"
                defaultValue={OPPORTUNITY_BUSINESS_TYPES[0]}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {OPPORTUNITY_BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {OPPORTUNITY_BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button type="submit" size="sm" disabled={convertPending}>
            {convertPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Convertir
          </Button>
          {convertError && <p className="text-sm text-destructive">{convertError}</p>}
        </form>
      )}
    </div>
  )
}
