import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { SlaStatus } from "@/modules/service/domain/sla"
import type { UUID } from "@/types/shared"
import type { InterventionType } from "./commitment"
import type { Estado, Judgment } from "./judge"

/**
 * Decision Ledger (DECISION_LEDGER_SPEC_v1) — DOMINIO PURO.
 *
 * Una decisión de supervisión = un evento append-only en `audit_events`
 * (reutiliza la infra; sin tabla ni esquema nuevos). Esto NO decide ni recomienda:
 * solo REGISTRA la decisión humana como evidencia. Mapeo determinístico.
 */

/** Lo que el supervisor decidió hacer (las acciones de la ActionBar/Hero). */
export type SupervisionActionKind =
  | "reasignar"
  | "expeditar"
  | "renegociar"
  | "escalar"
  | "descartar"

/** Estado del compromiso AL decidir (evidencia; evita re-derivar el pasado). */
export type DecisionSnapshot = {
  /** Lo que NEXUS clasificó como requerido (para comparar con lo que hizo el humano). */
  surfacedIntervention: InterventionType | null
  exposedValue: number | null
  pointOfNoReturnStatus: "KNOWN" | "UNKNOWN"
  msToPointOfNoReturn: number | null
  slaStatus: SlaStatus | null
  estado: Estado
}

/** Deriva el snapshot a partir del juicio del Read Model. Puro. */
export function toDecisionSnapshot(j: Judgment): DecisionSnapshot {
  return {
    surfacedIntervention: j.requiredIntervention,
    exposedValue: j.commitment.exposedValue,
    pointOfNoReturnStatus: j.pointOfNoReturn.status,
    msToPointOfNoReturn: j.pointOfNoReturn.ms,
    slaStatus: j.slaStatus,
    estado: j.estado,
  }
}

export type SupervisionDecisionInput = {
  tenantId: UUID
  actorId: UUID
  workOrderId: string
  /** Lo que el humano hizo. */
  action: SupervisionActionKind
  /** "¿por qué?" */
  reason: string
  /** Contrafactual "¿qué ibas a hacer?" (Gate-1). null si no se elicitó. */
  priorIntent: string | null
  snapshot: DecisionSnapshot
}

/**
 * Mapeo puro y determinístico al contrato congelado de `audit_events`
 * (DECISION_LEDGER_SPEC_v1 §2). Misma entrada ⇒ mismo evento.
 */
export function buildSupervisionDecisionEvent(input: SupervisionDecisionInput): AuditEvent {
  const decisionKind: "act" | "dismiss" = input.action === "descartar" ? "dismiss" : "act"
  return {
    eventType: "supervision.decision",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order",
    subjectId: input.workOrderId,
    action: decisionKind,
    metadata: {
      schemaVersion: 1,
      decisionKind,
      action: input.action,
      reason: input.reason,
      priorIntent: input.priorIntent,
      surfacedIntervention: input.snapshot.surfacedIntervention,
      exposedValue: input.snapshot.exposedValue,
      pointOfNoReturnStatus: input.snapshot.pointOfNoReturnStatus,
      msToPointOfNoReturn: input.snapshot.msToPointOfNoReturn,
      slaStatus: input.snapshot.slaStatus,
      estado: input.snapshot.estado,
    },
  }
}
