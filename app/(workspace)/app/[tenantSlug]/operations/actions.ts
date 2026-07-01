"use server"

import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { recordSupervisionDecision } from "@/modules/supervision/composition"
import type { SupervisionDecisionDraft } from "@/modules/supervision/domain/decision-event"

const VALID_ACTIONS = new Set(["reasignar", "expeditar", "renegociar", "escalar", "descartar"])

/**
 * Decision Ledger: registra (append-only) la decisión del supervisor en
 * audit_events. Añade tenantId + actorId del contexto. Si la escritura falla,
 * lanza el error (la UI lo informa y NO simula éxito). No revalida la ruta: la
 * decisión queda registrada, pero el compromiso sigue su curso real (Wizard-of-Oz).
 */
export async function recordDecisionAction(
  tenantSlug: string,
  draft: SupervisionDecisionDraft,
): Promise<void> {
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  if (!VALID_ACTIONS.has(draft.action)) {
    throw new Error(`Acción de supervisión inválida: ${draft.action}`)
  }

  await recordSupervisionDecision({
    tenantId: context.tenantId,
    actorId: context.userId,
    workOrderId: draft.workOrderId,
    action: draft.action,
    reason: draft.reason,
    priorIntent: draft.priorIntent,
    snapshot: draft.snapshot,
  })
}
