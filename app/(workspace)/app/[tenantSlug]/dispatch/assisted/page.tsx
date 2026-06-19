import { AlertTriangle } from "lucide-react"
import type { Metadata } from "next"

import { ActiveOperationCard } from "@/components/dispatch/active-operation-card"
import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { CompletedOperationCard } from "@/components/dispatch/completed-operation-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import { MissionAllClear } from "@/components/dashboard/mission/mission-alert-card"
import { MissionSection } from "@/components/dashboard/mission/mission-section"
import { PageHeader } from "@/components/layout/page-header"
import { emailConfigStatus } from "@/lib/email/send-email"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { listTenantWorkOrders } from "@/modules/service/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Coordinación" }

export default async function CoordinacionPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const can = (p: string) => hasPermission(context.effectivePermissions, p)
  const canWorkOrders = can(SERVICE_PERMISSIONS.workOrdersRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)

  const [inbox, board, completedPage, invoicesPage] = await Promise.all([
    listDispatchInbox(context.tenantId),
    getFieldMonitorBoard(context.tenantId),
    canWorkOrders
      ? listTenantWorkOrders(
          context.tenantId,
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
      ? listTenantInvoices(context.tenantId, {
          search: null,
          status: null,
          companyId: null,
          page: 1,
          pageSize: 1000,
        })
      : Promise.resolve(null),
  ])

  const email = emailConfigStatus()
  const { proposals, exceptions } = inbox

  // Operaciones activas: técnicos con un job en ejecución (accepted/on_site/working).
  const activeOps = board.entries
    .filter((e) => e.activeJob)
    .map((e) => ({
      technicianName: e.technicianName,
      workOrderNumber: e.activeJob!.workOrderNumber,
      workOrderSubject: e.activeJob!.workOrderSubject,
      companyName: e.activeJob!.companyName,
      priority: e.activeJob!.priority,
      executionStatus: e.activeJob!.executionStatus,
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
    <>
      <PageHeader
        title="Coordinación Operacional"
        description="¿Qué está coordinando Nexus ahora mismo?"
      />
      <div className="space-y-7 px-5 pb-10 sm:px-8">
        {email !== "production" ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {email === "sandbox"
                ? "Email en modo de prueba (remitente @resend.dev): las confirmaciones solo llegan a la cuenta dueña, no a los clientes reales. Verifica un dominio propio en Resend para producción."
                : "El email no está configurado: no se enviarán confirmaciones ni avisos al cliente. Configura RESEND_API_KEY y EMAIL_FROM."}
            </span>
          </div>
        ) : null}

        {/* 1 — Requiere tu atención */}
        <MissionSection
          title="Requiere tu atención"
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
          title="Nexus ya coordinó esto"
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
          title="Operaciones activas"
          description="Nexus está coordinando estas operaciones en este momento."
        >
          {activeOps.length === 0 ? (
            <MissionAllClear />
          ) : (
            <div className="space-y-3">
              {activeOps.map((op, i) => (
                <ActiveOperationCard key={op.workOrderNumber ?? `op-${i}`} op={op} />
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
    </>
  )
}
