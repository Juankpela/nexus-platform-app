"use client"

import { Check, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { autoDispatchCaseAction } from "@/modules/scheduling/presentation/auto-dispatch-actions"
import type { DispatchExplanation } from "@/modules/scheduling/domain/dispatch-explanation"

export type ProposalView = {
  caseId: string
  caseNumber: string
  subject: string
  skillLabel: string | null
  technicianName: string
  startsAt: string
  /** Horario YA formateado en el servidor (evita mismatch de hidratación). */
  scheduleLabel: string
  priority: string
  companyName: string | null
  origin: string | null
  slaLabel: string | null
  /** Justificación ejecutiva (por qué este técnico y por qué no los otros). */
  explanation: DispatchExplanation
}

const PRIORITY_LABEL: Record<string, string> = {
  low: "baja",
  medium: "media",
  high: "alta",
  critical: "crítica",
}
const ORIGIN_LABEL: Record<string, string> = {
  web: "web",
  phone: "teléfono",
  email: "email",
  whatsapp: "WhatsApp",
  manual: "manual",
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Tarjeta HÉROE — el elemento más importante de toda la app: la decisión de Nexus.
 * Problema → Técnico asignado + horario coordinado → por qué (sin score) → Acción.
 * Diseño de referencia oficial del Centro Operacional.
 */
export function AssistedProposalCard({
  tenantSlug,
  proposal,
}: {
  tenantSlug: string
  proposal: ProposalView
}) {
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function approve() {
    start(async () => {
      const r = await autoDispatchCaseAction(tenantSlug, proposal.caseId)
      if (r.error) setError(r.error)
      else if (r.result?.verdict === "PROCEED")
        setDone(`Técnico confirmado: ${r.result.technicianName}`)
      else setError("La propuesta cambió; revísala de nuevo.")
    })
  }

  const when = proposal.scheduleLabel
  const skill = proposal.skillLabel ?? "Servicio"
  const { selected, discarded } = proposal.explanation
  const techLine = [selected.level, skill].filter(Boolean).join(" · ")

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950">
            ✓
          </span>
          <div>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{done}</p>
            <p className="text-sm text-muted-foreground">Pendiente de aceptación del técnico</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-nexus-blue/30 bg-card p-5 shadow-sm">
      {/* Glow superior (gradiente de marca) */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-nexus-blue via-emerald-400 to-nexus-blue" />

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-nexus-blue to-emerald-500 text-sm font-black text-white">
            N
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Nexus decidió · PROCEED
            </p>
            <h3 className="text-lg font-bold leading-tight tracking-tight text-foreground">
              Nexus ya coordinó esto
            </h3>
          </div>
        </div>
        <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {proposal.caseNumber}
        </span>
      </div>

      {/* Cuerpo: técnico asignado (izq) + caso (der) */}
      <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
        {/* Técnico asignado por Nexus */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Técnico asignado por Nexus
          </p>
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-nexus-blue to-emerald-500 text-sm font-bold text-white">
              {initials(proposal.technicianName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-foreground">{proposal.technicianName}</p>
              <p className="text-sm text-muted-foreground">{techLine}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg border bg-card p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Horario coordinado</p>
              <p className="truncate font-semibold capitalize text-foreground">{when}</p>
            </div>
          </div>
        </div>

        {/* Caso */}
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Caso
          </p>
          <p className="font-bold leading-snug text-foreground">{proposal.subject}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {proposal.companyName ?? "Sin empresa"}
            {proposal.origin ? ` · Origen: ${ORIGIN_LABEL[proposal.origin] ?? proposal.origin}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
              Prioridad {PRIORITY_LABEL[proposal.priority] ?? proposal.priority}
            </span>
            {proposal.slaLabel ? (
              <span className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {proposal.slaLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Línea técnica (contrato de datos) */}
      <p className="mt-4 truncate border-t border-dashed pt-3 font-mono text-[10px] text-muted-foreground/70">
        propuesta(PROCEED): técnico + horario_coordinado · solicitud: skill + tipo_daño + prioridad + SLA + origen
      </p>

      {/* Por qué — dos columnas */}
      <p className="mt-3 mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-nexus-blue">
        Por qué {selected.name}, y no los demás
      </p>
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {selected.motives.map((m) => (
          <li key={m} className="flex gap-2 text-sm text-foreground">
            <span className="mt-0.5 text-emerald-500 dark:text-emerald-400">✓</span>
            <span>{m}</span>
          </li>
        ))}
      </ul>

      {/* Descartados como chips */}
      {discarded.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {discarded.map((d) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground"
            >
              <span className="line-through">{d.name}</span>
              <span>{d.reason}</span>
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 truncate font-mono text-[10px] text-muted-foreground/70">
        motivos de negocio (sin score) · tasa_éxito_real · descartados con motivo real
      </p>

      {/* Acciones */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Confirmar coordinación
        </button>
        <Link
          href={`/app/${tenantSlug}/cases/${proposal.caseId}`}
          className="flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          Reasignar
        </Link>
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
