import type { CaseStatus } from "@/modules/service/domain/case"
import type { WorkOrderStatus } from "@/modules/service/domain/work-order"

/**
 * Tono semántico de un estado, mapeado a los acentos de marca:
 * success=emerald, active=blue, attention=orange, critical=destructive, neutral=silver.
 * Es la fuente única de "color por significado" para casos y órdenes de trabajo,
 * de modo que la personalidad sea coherente en listas, detalle y tableros.
 */
export type StatusTone =
  | "success"
  | "active"
  | "attention"
  | "critical"
  | "neutral"

export const CASE_STATUS_TONE: Record<CaseStatus, StatusTone> = {
  new: "neutral",
  working: "active",
  waiting_customer: "attention",
  escalated: "attention",
  resolved: "success",
  closed: "neutral",
}

export const WORK_ORDER_STATUS_TONE: Record<WorkOrderStatus, StatusTone> = {
  new: "neutral",
  scheduled: "active",
  dispatched: "active",
  in_progress: "active",
  on_hold: "attention",
  completed: "success",
  cancelled: "neutral",
}
