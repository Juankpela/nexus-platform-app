"use client"

import { Bot, Loader2 } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  autoDispatchCaseAction,
  type AutoDispatchActionState,
} from "@/modules/scheduling/presentation/auto-dispatch-actions"

/**
 * Disparador del despacho autónomo (ADR-033, Hito A). La DECISIÓN es 100%
 * automática: este botón solo invoca el motor para el caso. Muestra el veredicto
 * (PROCEED/HOLD/ESCALATE), el técnico elegido y la ventana, o los bloqueos.
 */
export function AutoDispatchButton({
  tenantSlug,
  caseId,
}: {
  tenantSlug: string
  caseId: string
}) {
  const [state, setState] = useState<AutoDispatchActionState | null>(null)
  const [pending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      setState(await autoDispatchCaseAction(tenantSlug, caseId))
    })
  }

  const r = state?.result
  return (
    <div className="space-y-2">
      <Button size="sm" onClick={run} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
        Despachar automáticamente
      </Button>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {r ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">
            {r.verdict === "PROCEED"
              ? `Asignado a ${r.technicianName}`
              : r.verdict === "HOLD"
                ? "Propuesta (requiere confirmación)"
                : "Escalado a Despacho"}
            <span className="ml-2 font-normal text-muted-foreground">
              · Nexus Autonomous Dispatch · confianza {Math.round(r.confidenceScore * 100)}%
            </span>
          </p>
          {r.startsAt ? (
            <p className="mt-1 text-muted-foreground">
              Visita: {new Date(r.startsAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
            </p>
          ) : null}
          {r.blockers.length > 0 ? (
            <p className="mt-1 text-muted-foreground">Bloqueos: {r.blockers.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
