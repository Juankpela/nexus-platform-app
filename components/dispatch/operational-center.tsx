import { ArrowRight, Gauge, Sparkles, UserCheck, Users, Wallet } from "lucide-react"
import Link from "next/link"

import { ActiveOperationCard } from "@/components/dispatch/active-operation-card"
import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { CompletedOperationCard } from "@/components/dispatch/completed-operation-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import { MissionMetricCard } from "@/components/dashboard/mission/mission-metric-card"
import { MissionSection } from "@/components/dashboard/mission/mission-section"
import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { getWorkOrderLifecycle, listTenantWorkOrders } from "@/modules/service/composition"
import { formatCOP } from "@/lib/format/money"
import type { UUID } from "@/types/shared"

/**
 * Centro Operacional — la ÚNICA superficie de Inicio. Responde una sola pregunta:
 * "¿Qué necesita mi atención ahora?". Por eso todo es un gradiente de atención:
 * la decisión de Nexus manda; lo que ya fluye pesa menos; el dinero es contexto
 * al pie. Reutiliza por completo consultas y tarjetas existentes — no crea
 * pantallas, estados ni consultas nuevas. Único orquestador visual.
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
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })

  const [inbox, board, completedPage, invoicesPage, stats] = await Promise.all([
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
    canDispatch ? getTenantDispatchStats(tenantId, today) : Promise.resolve(null),
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

  // Dinero (peso mínimo): por cobrar + borradores, de las facturas ya cargadas.
  const invoices = invoicesPage?.items ?? []
  const porCobrar = invoices.reduce((s, i) => s + (i.balance > 0 ? i.balance : 0), 0)
  const borradores = invoices.filter((i) => i.status === "draft").length

  // Línea de pulso (una sola fila, tenue): el subtítulo de "¿qué necesita atención?".
  const pulse = [
    proposals.length > 0
      ? `${proposals.length} ${proposals.length === 1 ? "decisión pendiente" : "decisiones pendientes"}`
      : null,
    exceptions.length > 0 ? `${exceptions.length} requieren tu criterio` : null,
    activeOps.length > 0 ? `${activeOps.length} en marcha` : null,
  ].filter(Boolean)
  const pulseText = pulse.length > 0 ? pulse.join(" · ") : "Operación al día — nada requiere tu decisión ahora."

  return (
    <div className="space-y-7">
      {/* Pulso: una sola fila tenue, responde el subtítulo de la pregunta única. */}
      <p className="text-sm text-muted-foreground">{pulseText}</p>

      {/* ── NIVEL 1 · Decisión de Nexus (el elemento más importante de la app) ── */}
      <section aria-label="Nexus recomienda">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue">
            <Sparkles className="size-4" />
          </span>
          <h2 className="text-base font-semibold text-foreground">
            Nexus recomienda
            {proposals.length ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {proposals.length}
              </span>
            ) : null}
          </h2>
        </div>
        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            Nexus tiene la operación al día. Nada requiere tu decisión en este momento.
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── NIVEL 1b · Requiere tu criterio (solo si Nexus no pudo coordinar solo) ── */}
      {exceptions.length > 0 ? (
        <MissionSection
          title={`Requiere tu criterio · ${exceptions.length}`}
          description="Casos que Nexus no pudo coordinar solo. Necesitan tu decisión."
        >
          <div className="space-y-3">
            {exceptions.map((e) => (
              <DispatchExceptionCard key={e.caseId} exception={e} />
            ))}
          </div>
        </MissionSection>
      ) : null}

      {/* ── NIVEL 2 · Operación en marcha (fluye sola; la operación viva manda) ── */}
      <MissionSection
        title={`Operación en marcha${activeOps.length ? ` · ${activeOps.length}` : ""}`}
        description="Nexus está coordinando estas operaciones en este momento."
      >
        {activeOps.length === 0 ? (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            No hay operaciones en ejecución ahora.
          </p>
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

        {/* Completadas: secundario, plegado. */}
        {canWorkOrders && completedOps.length > 0 ? (
          <details className="mt-3 rounded-2xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Completadas recientemente · {completedOps.length}
            </summary>
            <div className="mt-3 space-y-3">
              {completedOps.map((op) => (
                <CompletedOperationCard key={op.workOrderNumber} op={op} />
              ))}
            </div>
          </details>
        ) : null}
      </MissionSection>

      {/* ── NIVEL 3 · Capacidad operativa (¿podemos tomar más? — NO directorio) ── */}
      {canDispatch && stats ? (
        <section aria-label="Capacidad operativa">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Capacidad operativa</h2>
            <Link
              href={`/app/${tenantSlug}/field-monitor`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Monitor de campo <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MissionMetricCard
              label="Disponibles"
              value={stats.availableTechnicians}
              icon={UserCheck}
              accent="emerald"
              hint={
                stats.availableTechnicians > 0
                  ? "Con cupo para tomar más trabajo hoy"
                  : "Sin cupo libre ahora"
              }
            />
            <MissionMetricCard
              label="Ocupados"
              value={stats.busyTechnicians}
              icon={Users}
              accent="blue"
              hint={
                stats.averageUtilization != null
                  ? `Utilización promedio ${stats.averageUtilization}%`
                  : undefined
              }
            />
            <MissionMetricCard
              label="Sobrecargados"
              value={stats.overloadedTechnicians}
              icon={Gauge}
              accent={stats.overloadedTechnicians > 0 ? "orange" : "silver"}
              hint={stats.overloadedTechnicians > 0 ? "Reasignar para equilibrar carga" : "Carga equilibrada"}
            />
          </div>
        </section>
      ) : null}

      {/* ── NIVEL 4 · Negocio (visible, pero el MENOR peso visual de la pantalla) ── */}
      {canInvoices ? (
        <Link
          href={`/app/${tenantSlug}/invoices`}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Negocio
          </span>
          <span>
            Por cobrar <span className="font-medium tabular-nums text-foreground">{formatCOP(porCobrar)}</span>
          </span>
          {borradores > 0 ? (
            <span>
              {borradores} {borradores === 1 ? "factura en borrador" : "facturas en borrador"}
            </span>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-1">
            Ir a Facturación <ArrowRight className="size-3.5" />
          </span>
        </Link>
      ) : null}
    </div>
  )
}
