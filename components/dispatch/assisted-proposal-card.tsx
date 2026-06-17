"use client"

import { Bot, Check, ChevronDown, Loader2, X } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { autoDispatchCaseAction } from "@/modules/scheduling/presentation/auto-dispatch-actions"
import {
  failedReasons,
  passedReasons,
  primaryFailure,
} from "@/modules/scheduling/domain/dispatch-explanation"
import type { EligibilityReasons } from "@/modules/scheduling/domain/eligibility"

export type ProposalView = {
  caseId: string
  caseNumber: string
  subject: string
  skillLabel: string | null
  confidenceScore: number
  technicianName: string
  chosenReasons: EligibilityReasons
  startsAt: string
  priority: string
  discarded: { technicianName: string; reasons: EligibilityReasons }[]
}

export function AssistedProposalCard({
  tenantSlug,
  proposal,
}: {
  tenantSlug: string
  proposal: ProposalView
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function approve() {
    start(async () => {
      const r = await autoDispatchCaseAction(tenantSlug, proposal.caseId)
      if (r.error) setError(r.error)
      else if (r.result?.verdict === "PROCEED")
        setDone(`Despachado a ${r.result.technicianName} · técnico notificado`)
      else setError("La propuesta cambió; revísala de nuevo.")
    })
  }

  const when = new Date(proposal.startsAt).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{proposal.caseNumber}</p>
          <h3 className="truncate font-medium text-foreground">{proposal.subject}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {proposal.skillLabel ?? "Servicio"} · <span className="text-foreground">{proposal.technicianName}</span> · {when}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Confianza {Math.round(proposal.confidenceScore * 100)}%
        </span>
      </div>

      {done ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ {done} · Pendiente de aceptación del técnico
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={approve} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
            Aprobar despacho
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            Ver explicación
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
      )}

      {open ? (
        <div className="mt-3 grid gap-4 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">
              Técnico elegido: {proposal.technicianName}
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {passedReasons(proposal.chosenReasons).map((r) => (
                <li key={r} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600" /> {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Técnicos descartados</p>
            {proposal.discarded.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">Sin otros candidatos.</p>
            ) : (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {proposal.discarded.map((d) => (
                  <li key={d.technicianName} className="flex items-center gap-1.5">
                    <X className="size-3.5 text-red-500" /> {d.technicianName} —{" "}
                    {primaryFailure(d.reasons) ?? failedReasons(d.reasons)[0] ?? "no preferido"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
