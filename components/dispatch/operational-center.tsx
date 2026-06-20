
import { ActiveOperationCard } from "@/components/dispatch/active-operation-card"
import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { CompletedOperationCard } from "@/components/dispatch/completed-operation-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import { MissionAllClear } from "@/components/dashboard/mission/mission-alert-card"
import { MissionSection } from "@/components/dashboard/mission/mission-section"
import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { getWorkOrderLifecycle, listTenantWorkOrders } from "@/modules/service/composition"
import type { UUID } from "@/types/shared"

/**
 * Centro Operacional — la única superficie que responde "¿qué está coordinando
 * Nexus ahora mismo?". Reutiliza por completo consultas y tarjetas existentes; no
 * crea estados ni consultas nuevas. Se renderiza en Inicio (y en la ruta de
 * Coordinación). 4 zonas: atención → coordinado (héroe) → activas → completadas.
 */
export async function OperationalCenter({
  tenantSlug,
  tenantId,
  permissions,
}: {
  tenantSlug: string
  tenantId: UUID
  permissions: readonly string[]
}) {
  const can = (p: string) => hasPermission(permissions, p)
  const canWorkOrders = can(SERVICE_PERMISSIONS.workOrdersRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)

  const [inbox, board, completedPage, invoicesPage] = await Promise.all([
    listDispatchInbox(tenantId),
    getFieldMonitorBoard(tenantId),
    canWorkOrders
      ? listTenantWorkOrders(
          tenantId,
          {
            search: null,
            status: "completed",
            priority: null,
            technicianId: null,
            companyId: null,
            assetId: null,
            dateFrom: null,
            dateTo: null,
          },
          1,
          8,
        )
      : Promise.resolve(null),
    canInvoices
      ? listTenantInvoices(tenantId, {
          search: null,
          status: null,
          companyId: null,
          page: 1,
          pageSize: 1000,
        })
      : Promise.resolve(null),
  ])

  const { proposals, exceptions } = inbox

  // Operaciones activas: técnicos con un job en ejecución. La mini línea de vida
  // se resuelve con la MISMA función canónica (sin timeline nuevo).
  const activeRaw = board.entries.filter((e) => e.activeJob)
  const lifecycles = await Promise.all(
    activeRaw.map((e) => getWorkOrderLifecycle(tenantId, e.activeJob!.workOrderId)),
  )
  const activeOps = activeRaw.map((e, i) => ({
    op: {
      technicianName: e.technicianName,
      workOrderNumber: e.activeJob!.workOrderNumber,
      workOrderSubject: e.activeJob!.workOrderSubject,
      companyName: e.activeJob!.companyName,
      priority: e.activeJob!.priority,
      executionStatus: e.activeJob!.executionStatus,
    },
    milestones: lifecycles[i] ?? [],
  }))

  // Operaciones completadas: WO completadas + su factura (match por workOrderId).
  const invByWo = new Map(
    (invoicesPage?.items ?? [])
      .filter((i) => i.workOrderId)
      .map((i) => [
        i.workOrderId as string,
        { invoiceNumber: i.invoiceNumber, totalAmount: i.totalAmount, balance: i.balance },
      ]),
  )
  const completedOps = (completedPage?.items ?? []).map((w) => ({
    workOrderNumber: w.workOrderNumber,
    subject: w.subject,
    companyName: w.companyName,
    actualStart: w.actualStart,
    actualEnd: w.actualEnd,
    invoice: invByWo.get(w.id) ?? null,
  }))

  return (
    <div className="space-y-7">
      {/* 1 — Requiere tu atención */}
      <MissionSection
        title={`Requiere tu atención${exceptions.length ? ` · ${exceptions.length}` : ""}`}
        description="Casos que Nexus no pudo coordinar solo. Necesitan tu criterio."
      >
        {exceptions.length === 0 ? (
          <MissionAllClear />
        ) : (
          <div className="space-y-3">
            {exceptions.map((e) => (
              <DispatchExceptionCard key={e.caseId} exception={e} />
            ))}
          </div>
        )}
      </MissionSection>

      {/* 2 — Nexus ya coordinó esto (héroe) */}
      <MissionSection
        title={`Nexus ya coordinó esto${proposals.length ? ` · ${proposals.length}` : ""}`}
        description="Decisión recomendada por Nexus. Solo falta tu confirmación."
      >
        {proposals.length === 0 ? (
          <MissionAllClear />
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
            ))}
          </div>
        )}
      </MissionSection>

      {/* 3 — Operaciones activas */}
      <MissionSection
        title={`Operaciones activas${activeOps.length ? ` · ${activeOps.length}` : ""}`}
        description="Nexus está coordinando estas operaciones en este momento."
      >
        {activeOps.length === 0 ? (
          <MissionAllClear />
        ) : (
          <div className="space-y-3">
            {activeOps.map((a, i) => (
              <ActiveOperationCard
                key={a.op.workOrderNumber ?? `op-${i}`}
                op={a.op}
                milestones={a.milestones}
              />
            ))}
          </div>
        )}
      </MissionSection>

      {/* 4 — Operaciones completadas */}
      {canWorkOrders ? (
        <MissionSection
          title="Operaciones completadas"
          description="Ciclo cerrado: Solicitud → Coordinación → Ejecución → Cobro."
        >
          {completedOps.length === 0 ? (
            <MissionAllClear />
          ) : (
            <div className="space-y-3">
              {completedOps.map((op) => (
                <CompletedOperationCard key={op.workOrderNumber} op={op} />
              ))}
            </div>
          )}
        </MissionSection>
      ) : null}
    </div>
  )
}
