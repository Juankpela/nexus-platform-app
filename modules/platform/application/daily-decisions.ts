import { formatCOP } from "@/lib/format/money"

/**
 * Las decisiones del día — el corazón del Centro de Comando (Inicio).
 *
 * Builder PURO: recibe señales ya derivadas por las consultas existentes del
 * dashboard (cero queries nuevas) y las convierte en una lista corta de
 * decisiones accionables con una gramática fija: VERBO + OBJETO + CONSECUENCIA.
 * La pantalla inicial muestra máximo `MAX_VISIBLE_DECISIONS`; el resto se
 * reporta como `hiddenCount` (la Estación de Supervisión es la vista completa).
 *
 * Regla de producto (founder, 2026-07-01): la primera pantalla no informa —
 * dirige la atención. Todo lo que no genere una decisión no entra aquí.
 */

export const MAX_VISIBLE_DECISIONS = 3

export type DecisionTone = "critical" | "attention" | "positive"

export type DailyDecision = {
  id: string
  tone: DecisionTone
  /** Frase accionable: verbo + objeto + consecuencia (es-CO, lenguaje de negocio). */
  title: string
  detail: string
  /** Etiqueta corta de severidad/naturaleza para el badge de la fila. */
  badge: string
  actionLabel: string
  /** Ruta relativa dentro del tenant donde se ejecuta la decisión. */
  segment: string
}

export type DailyBriefing = {
  decisions: DailyDecision[]
  /** Decisiones que no cupieron en la primera pantalla. */
  hiddenCount: number
}

export type DailyDecisionsInput = {
  /**
   * Casos con SLA vencido SIN atender (sin orden de trabajo activa). Un vencido
   * ya despachado está "en atención": no es una decisión pendiente.
   */
  openBreachedCount: number
  /** Propuestas de coordinación que N-LABS dejó listas para aprobar. */
  proposals: readonly {
    caseNumber: string
    subject: string
    technicianName: string
    scheduleLabel: string
  }[]
  /** Solicitudes que el motor no pudo asignar solo (HOLD/ESCALATE). */
  exceptions: readonly { caseNumber: string; subject: string }[]
  overloadedTechnicians: number
  /** Cobranza pendiente; null cuando el usuario no puede ver facturación. */
  receivable: { total: number; count: number; oldestIssueAt: string | null } | null
}

export function buildDailyDecisions(
  input: DailyDecisionsInput,
  /** Inyectable para tests; los componentes lo omiten (reloj real). */
  nowMs: number = Date.now(),
): DailyBriefing {
  const all: DailyDecision[] = []

  if (input.openBreachedCount > 0) {
    const n = input.openBreachedCount
    all.push({
      id: "sla-breached",
      tone: "critical",
      title:
        n === 1
          ? "Atender el compromiso vencido que nadie está atendiendo"
          : `Atender ${n} compromisos vencidos que nadie está atendiendo`,
      detail:
        n === 1
          ? "SLA incumplido y aún sin orden de trabajo — el cliente espera respuesta"
          : "SLA incumplido y aún sin orden de trabajo — los clientes esperan respuesta",
      badge: "SLA vencido",
      actionLabel: "Resolver",
      segment: "cases?sla=overdue",
    })
  }

  if (input.proposals.length === 1) {
    const p = input.proposals[0]
    all.push({
      id: "proposal",
      tone: "attention",
      title: `Confirmar a ${p.technicianName} para "${p.subject}"`,
      detail: `N-LABS ya encontró técnico y horario · ${p.scheduleLabel}`,
      badge: "Listo para aprobar",
      actionLabel: "Decidir",
      segment: "dispatch",
    })
  } else if (input.proposals.length > 1) {
    all.push({
      id: "proposal",
      tone: "attention",
      title: `Confirmar ${input.proposals.length} coordinaciones que N-LABS dejó listas`,
      detail: "Técnico y horario ya propuestos; solo falta tu visto bueno",
      badge: "Listo para aprobar",
      actionLabel: "Decidir",
      segment: "dispatch",
    })
  }

  if (input.exceptions.length === 1) {
    const e = input.exceptions[0]
    all.push({
      id: "exception",
      tone: "attention",
      title: `Coordinar la solicitud ${e.caseNumber} que el motor no pudo asignar`,
      detail: e.subject,
      badge: "Sin coordinar",
      actionLabel: "Coordinar",
      segment: "dispatch",
    })
  } else if (input.exceptions.length > 1) {
    all.push({
      id: "exception",
      tone: "attention",
      title: `Coordinar ${input.exceptions.length} solicitudes que el motor no pudo asignar`,
      detail: "Cada una es un cliente esperando respuesta",
      badge: "Sin coordinar",
      actionLabel: "Coordinar",
      segment: "dispatch",
    })
  }

  if (input.overloadedTechnicians > 0) {
    const n = input.overloadedTechnicians
    all.push({
      id: "overload",
      tone: "attention",
      title:
        n === 1
          ? "Rebalancear la carga del técnico sobrecargado"
          : `Rebalancear la carga de ${n} técnicos sobrecargados`,
      detail: "Riesgo de incumplir los compromisos de hoy",
      badge: "Impacto alto",
      actionLabel: "Rebalancear",
      segment: "field-monitor",
    })
  }

  if (input.receivable && input.receivable.total > 0) {
    const r = input.receivable
    const oldestDays = r.oldestIssueAt
      ? Math.max(0, Math.floor((nowMs - new Date(r.oldestIssueAt).getTime()) / 86_400_000))
      : null
    all.push({
      id: "receivable",
      tone: "positive",
      title: `Cobrar ${formatCOP(r.total)} ya ganados en ${r.count} ${r.count === 1 ? "factura" : "facturas"}`,
      detail:
        oldestDays != null && oldestDays > 0
          ? `La más antigua lleva ${oldestDays} ${oldestDays === 1 ? "día emitida" : "días emitida"}`
          : "Dinero ya ganado, aún no en caja",
      badge: "Por cobrar",
      actionLabel: "Cobrar",
      segment: "invoices",
    })
  }

  return {
    decisions: all.slice(0, MAX_VISIBLE_DECISIONS),
    hiddenCount: Math.max(0, all.length - MAX_VISIBLE_DECISIONS),
  }
}

/** La Frase — el titular del día. Responde "¿qué merece mi atención ahora?". */
export function buildHeadline(
  briefing: DailyBriefing,
  opts: { onboardingInProgress: boolean },
): string {
  const total = briefing.decisions.length + briefing.hiddenCount
  if (total === 0) {
    return opts.onboardingInProgress
      ? "Tu primera decisión: pon a NEXUS a operar."
      : "Tu operación está sana. No hay decisiones pendientes."
  }
  if (total === 1) return "Hoy hay 1 decisión que puede cambiar tu operación."
  return `Hoy hay ${total} decisiones que pueden cambiar tu operación.`
}
