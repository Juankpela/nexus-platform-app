"use client"

import { Check, ChevronDown, Clock, Loader2 } from "lucide-react"
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
  /** Justificación ejecutiva (por qué este técnico y por qué no los otros). */
  explanation: DispatchExplanation
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
 * Pieza B — Tarjeta "Listo para confirmar". Héroe del momento de decisión:
 * Problema → Decisión de Nexus (técnico + horario) → Acción humana (Confirmar).
 * Sin porcentajes/score: el razonamiento es prosa ejecutiva. Props sin cambios.
 */
export function AssistedProposalCard({
  tenantSlug,
  proposal,
}: {
  tenantSlug: string
  proposal: ProposalView
}) {
  const [open, setOpen] = useState(true)
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

  // Formateado en el servidor (proposal.scheduleLabel): el cliente solo lo muestra.
  const when = proposal.scheduleLabel
  const skill = proposal.skillLabel ?? "Servicio"
  const { selected, discarded } = proposal.explanation

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950">
            ✓
          </span>
          <div>
            <p className="font-semibold text-emerald-400">{done}</p>
            <p className="text-sm text-muted-foreground">Pendiente de aceptación del técnico</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      {/* Encabezado: folio + estado coordinado */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] text-blue-400">
          {proposal.caseNumber}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Coordinado
        </span>
      </div>

      {/* Problema */}
      <h3 className="text-lg font-bold leading-tight tracking-tight text-foreground">
        {proposal.subject}
      </h3>

      {/* Decisión de Nexus */}
      <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-sm font-bold text-blue-300">
            {initials(proposal.technicianName)}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Técnico recomendado
            </p>
            <p className="truncate text-lg font-bold text-foreground">{proposal.technicianName}</p>
            <p className="text-xs text-muted-foreground">{skill}</p>
          </div>
        </div>
        <div className="my-3 h-px bg-white/5" />
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
            <Clock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Horario recomendado
            </p>
            <p className="truncate text-lg font-bold capitalize text-foreground">{when}</p>
            <p className="text-xs text-muted-foreground">Dentro del tiempo comprometido</p>
          </div>
        </div>
      </div>

      {/* Acción humana */}
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Confirmar coordinación
      </button>

      {/* Resumen del razonamiento — visible SIN expandir: el usuario entiende que
          Nexus tomó una decisión fundamentada antes de hacer clic. */}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{selected.summary}</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-blue-500 transition-colors hover:text-blue-400 dark:text-blue-400"
      >
        {open ? "Ocultar razonamiento" : "Ver razonamiento de Nexus"}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="mt-2 space-y-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.06] p-3">
          {/* Por qué el seleccionado */}
          <div>
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400">
              Por qué {selected.name}, y no los demás
            </p>
            <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {selected.motives.map((m) => (
                <li key={m} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-emerald-500 dark:text-emerald-400">✓</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Por qué no los otros */}
          {discarded.length > 0 ? (
            <div className="border-t border-white/5 pt-2.5">
              <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Otros técnicos evaluados
              </p>
              <ul className="space-y-1.5">
                {discarded.map((d) => (
                  <li key={d.name} className="text-sm">
                    <span className="font-medium text-foreground">{d.name}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {d.skillLabel}
                      {d.level ? ` ${d.level}` : ""} — {d.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
