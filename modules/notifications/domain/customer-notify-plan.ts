/**
 * Plan de avisos al cliente por WhatsApp, DERIVADO de la línea de vida de la
 * solicitud. Una sola función PURA que decide, para cada aviso (confirmar visita,
 * voy en camino, llegué al sitio, trabajo completado), si ya pasó (reenviable),
 * si es el actual (resaltado) o si todavía no aplica (atenuado). Así el panel
 * "Avisar al cliente por WhatsApp" deja de mostrar siempre los mismos botones y
 * avanza en lockstep con el estado real de la WO — coordinador, técnico y cliente
 * ven una progresión coherente, sin riesgo de mandar "voy en camino" antes de que
 * el técnico siquiera acepte.
 *
 * Reutiliza los mensajes de `whatsapp-link` y los hitos de `service-lifecycle`:
 * es el puente entre ambos dominios, sin red ni proveedor.
 */

import type { LifecycleMilestone } from "@/modules/service/domain/service-lifecycle"
import {
  arrivedMessage,
  buildWhatsAppUrl,
  completedMessage,
  confirmationMessage,
  enRouteMessage,
  type WhatsAppMessageContext,
} from "./whatsapp-link"

/** Posición de un aviso respecto al avance de la operación. */
export type NotifyPhase = "past" | "current" | "future"

export type CustomerNotifyAction = {
  label: string
  /** Enlace wa.me listo, o null si el aviso aún no aplica o no hay teléfono. */
  url: string | null
  phase: NotifyPhase
  /** Conveniencia: equivale a `phase === "current"`. */
  primary: boolean
  /** Motivo legible cuando el aviso todavía no aplica (phase "future"). */
  hint: string | null
}

/** Los 4 avisos al cliente, en el orden en que ocurren en una visita. */
const STEPS = [
  {
    label: "Confirmar visita",
    message: confirmationMessage,
    hint: "Disponible cuando la visita esté agendada",
  },
  {
    label: "Voy en camino",
    message: enRouteMessage,
    hint: "Disponible cuando el técnico vaya en camino",
  },
  {
    label: "Llegué al sitio",
    message: arrivedMessage,
    hint: "Disponible cuando el técnico llegue al sitio",
  },
  {
    label: "Trabajo completado",
    message: completedMessage,
    hint: "Disponible cuando el trabajo esté completado",
  },
] as const

/**
 * Mapea el hito ACTUAL (el que está en curso/esperado) de la línea de vida al
 * paso de aviso que toca resaltar. Varios hitos colapsan en un mismo aviso: hasta
 * que el técnico no aceptó, lo único que se le dice al cliente es "confirmamos su
 * visita"; recién cuando va en camino el resalte avanza, y así sucesivamente.
 */
const MILESTONE_TO_STEP: Record<string, number> = {
  reported: 0,
  coordinated: 0,
  accepted: 0,
  en_route: 1,
  on_site: 2,
  working: 2,
  completed: 3,
  invoiced: 3,
  paid: 3,
}

/**
 * Paso activo = el aviso correspondiente al hito en curso/bloqueado. Si ya no hay
 * hito en curso (toda la línea de vida está cumplida) → el último paso. Si no hay
 * línea de vida (lista vacía) → el primero (aún no arranca la operación).
 */
function resolveActiveStep(milestones: LifecycleMilestone[]): number {
  if (milestones.length === 0) return 0
  const current = milestones.find(
    (m) => m.state === "current" || m.state === "blocked",
  )
  if (!current) return STEPS.length - 1
  return MILESTONE_TO_STEP[current.key] ?? 0
}

/**
 * Construye los avisos al cliente alineados con la línea de vida. Los pasos
 * futuros NO llevan enlace (se muestran atenuados con su hint); los pasados y el
 * actual sí, para poder reenviarlos. `rawPhone` null/ inválido → todos sin enlace.
 */
export function buildCustomerNotifyActions(
  milestones: LifecycleMilestone[],
  ctx: WhatsAppMessageContext,
  rawPhone: string | null | undefined,
): CustomerNotifyAction[] {
  const activeStep = resolveActiveStep(milestones)
  return STEPS.map((step, i) => {
    const phase: NotifyPhase =
      i < activeStep ? "past" : i === activeStep ? "current" : "future"
    return {
      label: step.label,
      url: phase === "future" ? null : buildWhatsAppUrl(rawPhone, step.message(ctx)),
      phase,
      primary: phase === "current",
      hint: phase === "future" ? step.hint : null,
    }
  })
}
