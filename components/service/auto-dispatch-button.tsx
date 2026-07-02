"use client"

import { Bot, CalendarClock, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  autoDispatchCaseAction,
  scheduleCaseOptionAction,
  type AutoDispatchActionState,
} from "@/modules/scheduling/presentation/auto-dispatch-actions"

/** Motivos de bloqueo del motor en lenguaje de negocio (nunca claves crudas). */
const BLOCKER_LABELS: Record<string, string> = {
  no_skill_identified:
    "No pude identificar la especialidad requerida a partir del reporte",
  no_eligible_technician: "Ningún técnico cumple los requisitos del servicio",
  no_slot: "No hay horario disponible dentro de las reglas de agenda",
  sla_risk: "El único horario disponible cae fuera del SLA comprometido",
  no_capacity: "La agenda de los técnicos está a tope de capacidad",
  low_classification_confidence: "Baja confianza en la clasificación del reporte",
  poor_report_quality: "El reporte tiene muy poco detalle para decidir solo",
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Disparador del despacho autónomo (ADR-033, Hito A). La DECISIÓN es 100%
 * automática: este botón solo invoca el motor para el caso. Muestra el veredicto
 * (PROCEED/HOLD/ESCALATE), el técnico elegido y la ventana, o los bloqueos.
 *
 * SALIDA ASISTIDA (validación founder 2026-07-01): escalar nunca es un callejón
 * sin salida. Si el motor no encontró opción dentro de las reglas, ofrece las
 * mejores alternativas relajando especialidad y SLA, y el supervisor agenda una
 * desde aquí bajo su criterio (auditado como override).
 */
export function AutoDispatchButton({
  tenantSlug,
  caseId,
}: {
  tenantSlug: string
  caseId: string
}) {
  const router = useRouter()
  const [state, setState] = useState<AutoDispatchActionState | null>(null)
  const [scheduled, setScheduled] = useState<{ name: string; when: string } | null>(null)
  const [optionError, setOptionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(force = false) {
    startTransition(async () => {
      const next = await autoDispatchCaseAction(tenantSlug, caseId, force)
      setState(next)
      setOptionError(null)
      if (next.result?.workOrderId) router.refresh()
    })
  }

  function schedule(option: {
    technicianId: string
    technicianName: string
    startsAt: string
    endsAt: string
  }) {
    startTransition(async () => {
      const res = await scheduleCaseOptionAction(tenantSlug, caseId, {
        technicianId: option.technicianId,
        startsAt: option.startsAt,
        endsAt: option.endsAt,
      })
      if (res.error) {
        setOptionError(res.error)
      } else {
        setScheduled({ name: option.technicianName, when: fmtWhen(option.startsAt) })
        router.refresh()
      }
    })
  }

  const r = state?.result
  // ¿El motor encontró una opción válida (técnico + hora) pero escaló (no la
  // ejecutó)? Entonces el supervisor puede agendarla de todas formas.
  const hasViableOption =
    !!r && !r.workOrderId && r.verdict !== "PROCEED" && !!r.technicianName && !!r.startsAt

  if (scheduled) {
    return (
      <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
        <p className="font-medium">Agendado a {scheduled.name}</p>
        <p className="mt-0.5">Visita: {scheduled.when} · decisión del supervisor (auditada)</p>
      </div>
    )
  }

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
                : "No pude coordinarlo solo — te dejo opciones"}
            <span className="ml-2 font-normal text-muted-foreground">
              · Nexus Autonomous Dispatch
            </span>
          </p>
          {r.startsAt ? (
            <p className="mt-1 text-muted-foreground">
              {r.workOrderId ? "Visita agendada: " : "Mejor opción encontrada: "}
              {r.technicianName ? `${r.technicianName} · ` : ""}
              {fmtWhen(r.startsAt)}
            </p>
          ) : null}
          {!r.workOrderId && r.blockers.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {r.blockers.map((b) => (
                <li key={b}>{BLOCKER_LABELS[b] ?? b}</li>
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

          {/* Salida asistida: alternativas relajando especialidad y SLA. */}
          {!r.workOrderId && !hasViableOption && r.options.length > 0 ? (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Estas son las mejores alternativas relajando las reglas
                (especialidad sin verificar{r.options.some((o) => o.outOfSla) ? " y/o fuera de SLA" : ""}).
                Tú decides; la decisión queda auditada.
              </p>
              <div className="mt-2 space-y-2">
                {r.options.map((o) => (
                  <div
                    key={`${o.technicianId}-${o.startsAt}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {o.technicianName}
                        {o.outOfSla ? (
                          <span className="ml-2 rounded-full border border-orange-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                            Fuera de SLA
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtWhen(o.startsAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        schedule({
                          technicianId: o.technicianId,
                          technicianName: o.technicianName,
                          startsAt: o.startsAt,
                          endsAt: o.endsAt,
                        })
                      }
                      disabled={pending}
                    >
                      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Agendar
                    </Button>
                  </div>
                ))}
              </div>
              {optionError ? (
                <p className="mt-2 text-sm text-destructive">{optionError}</p>
              ) : null}
            </div>
          ) : null}

          {/* Sin opción del motor NI alternativas: el vacío también guía. */}
          {!r.workOrderId && !hasViableOption && r.options.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No hay técnicos activos con agenda disponible en las próximas dos
              semanas. Revisa el equipo técnico (disponibilidad y estado) o
              asigna manualmente desde Despacho.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
