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

  function run(force = false) {
    startTransition(async () => {
      setState(await autoDispatchCaseAction(tenantSlug, caseId, force))
    })
  }

  const r = state?.result
  // Motivos de bloqueo en lenguaje de negocio.
  const blockerLabel = (b: string) =>
    b === "sla_risk"
      ? "El único horario disponible cae fuera del SLA comprometido"
      : b
  // ¿El motor encontró una opción válida (técnico + hora) pero escaló (no la
  // ejecutó)? Entonces el supervisor puede agendarla de todas formas.
  const hasViableOption =
    !!r && !r.workOrderId && r.verdict !== "PROCEED" && !!r.technicianName && !!r.startsAt

  return (
    <div className="space-y-2">
      <Button size="sm" onClick={() => run(false)} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
        Despachar automáticamente
      </Button>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {r ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">
            {r.workOrderId
              ? `Agendado a ${r.technicianName}`
              : r.verdict === "HOLD"
                ? "Propuesta (requiere confirmación)"
                : "Escalado a Despacho"}
            <span className="ml-2 font-normal text-muted-foreground">
              · Nexus Autonomous Dispatch · confianza {Math.round(r.confidenceScore * 100)}%
            </span>
          </p>
          {r.startsAt ? (
            <p className="mt-1 text-muted-foreground">
              {r.workOrderId ? "Visita agendada: " : "Mejor opción encontrada: "}
              {r.technicianName ? `${r.technicianName} · ` : ""}
              {new Date(r.startsAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
            </p>
          ) : null}
          {!r.workOrderId && r.blockers.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {r.blockers.map((b) => (
                <li key={b}>{blockerLabel(b)}</li>
              ))}
            </ul>
          ) : null}

          {/* Override del supervisor: agendar la opción encontrada pese al SLA. */}
          {hasViableOption ? (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Nexus encontró un técnico disponible, pero la visita queda fuera del
                SLA. Puedes agendarla de todas formas bajo tu criterio.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-900/60 dark:text-orange-300 dark:hover:bg-orange-950/30"
                onClick={() => run(true)}
                disabled={pending}
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Agendar de todas formas (fuera de SLA)
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
