import type { HealthSnapshot } from "@/components/operations/health-strip"
import type { SupervisionItem } from "@/components/operations/mock"
import { todayInAppZone } from "@/lib/format/datetime"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { getActiveAssignmentsByWorkOrder } from "@/modules/scheduling/composition"
import { listTenantWorkOrders } from "@/modules/service/composition"
import { isOpenStatus, type RawCommitment } from "@/modules/supervision/domain/commitment"
import { buildHealth } from "@/modules/supervision/domain/health"
import { judge } from "@/modules/supervision/domain/judge"
import { prioritize } from "@/modules/supervision/domain/ranking"
import { toHealthSnapshot, toSupervisionItem } from "@/modules/supervision/presentation/to-view-model"
import {
  buildSupervisionDecisionEvent,
  toDecisionSnapshot,
  type DecisionSnapshot,
  type SupervisionDecisionInput,
} from "@/modules/supervision/domain/decision-event"
import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import type { UUID } from "@/types/shared"

/**
 * Composición del Read Model: capa IMPURA (fetch del estado real vía las
 * composiciones existentes de service/billing/scheduling/dispatch) que alimenta
 * el pipeline PURO (judge → prioritize → buildHealth) y adapta a los contratos
 * congelados. `now` se inyecta para que el núcleo puro sea determinístico.
 */
export type SupervisionStationView = {
  items: SupervisionItem[]
  health: HealthSnapshot
  belowThresholdCount: number
  /** Snapshot por compromiso accionable (id → estado al decidir), para el Decision Ledger. */
  snapshots: Record<string, DecisionSnapshot>
}

/** Solo una factura emitida representa valor económico real ligado a la orden. */
const VALUED_INVOICE_STATUSES = new Set(["issued", "partially_paid", "paid"])

export async function getSupervisionStation(
  tenantId: UUID,
  now: Date,
): Promise<SupervisionStationView> {
  const [woPage, invoicePage] = await Promise.all([
    listTenantWorkOrders(
      tenantId,
      {
        search: null,
        status: null,
        priority: null,
        technicianId: null,
        companyId: null,
        assetId: null,
        dateFrom: null,
        dateTo: null,
      },
      1,
      200,
    ),
    listTenantInvoices(tenantId, {
      search: null,
      status: null,
      companyId: null,
      page: 1,
      pageSize: 1000,
    }),
  ])

  // Compromisos = órdenes abiertas con plazo SLA comprometido.
  const openWos = woPage.items.filter((w) => isOpenStatus(w.status) && w.slaDueAt != null)

  // Valor económico real: solo facturas emitidas ligadas a la orden.
  const valueByWo = new Map<string, number>()
  for (const inv of invoicePage.items) {
    if (inv.workOrderId && VALUED_INVOICE_STATUSES.has(inv.status)) {
      valueByWo.set(inv.workOrderId, (valueByWo.get(inv.workOrderId) ?? 0) + inv.totalAmount)
    }
  }

  const assignments = await getActiveAssignmentsByWorkOrder(
    tenantId,
    openWos.map((w) => w.id),
  )

  const raw: RawCommitment[] = openWos.map((w) => {
    const a = assignments.get(w.id)
    return {
      id: w.id,
      workOrderNumber: w.workOrderNumber,
      company: w.companyName,
      subject: w.subject,
      priority: w.priority,
      status: w.status,
      slaDueAt: w.slaDueAt,
      scheduledEnd: a?.scheduledEnd ?? w.scheduledEnd,
      resolvedAt: w.actualEnd,
      hasActiveAssignment: a != null,
      technicianName: a?.technicianName ?? null,
      estimatedDurationMinutes: a?.estimatedDurationMinutes ?? null,
      exposedValue: valueByWo.get(w.id) ?? null,
    }
  })

  const judgments = raw.map((c) => judge(c, now))
  const { actionable, belowThresholdCount } = prioritize(judgments)

  const capacity = await getTenantDispatchStats(tenantId, todayInAppZone())
  const figures = buildHealth(actionable, capacity)
  const cap = { available: capacity.availableTechnicians, active: capacity.activeTechnicians }

  return {
    items: actionable.map((j) => toSupervisionItem(j, cap)),
    health: toHealthSnapshot(figures),
    belowThresholdCount,
    snapshots: Object.fromEntries(actionable.map((j) => [j.commitment.id, toDecisionSnapshot(j)])),
  }
}

// ── Decision Ledger (DECISION_LEDGER_SPEC_v1) ──────────────────────────────
// Registra (append-only) la decisión del supervisor en audit_events. NO decide
// ni recomienda: solo persiste la decisión humana como evidencia.
function audit() {
  return new SupabaseAuditRepository()
}

export function recordSupervisionDecision(input: SupervisionDecisionInput): Promise<void> {
  return audit().append(buildSupervisionDecisionEvent(input))
}
