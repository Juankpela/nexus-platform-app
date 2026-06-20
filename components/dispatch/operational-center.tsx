import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

import { ActiveOperationCard } from "@/components/dispatch/active-operation-card"
import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { CompletedOperationCard } from "@/components/dispatch/completed-operation-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
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

/** Tile compacto de la barra de PULSO. El dinero va `muted` (menor peso visual). */
function PulseTile({
  label,
  value,
  hint,
  accent = "blue",
  muted = false,
  href,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: "blue" | "emerald" | "orange" | "silver"
  muted?: boolean
  href?: string
}) {
  const accentText = {
    blue: "text-nexus-blue",
    emerald: "text-emerald-500 dark:text-emerald-400",
    orange: "text-orange-500 dark:text-orange-400",
    silver: "text-muted-foreground",
  }[accent]
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${muted ? "bg-muted-foreground/40" : accentText.replace("text-", "bg-")}`} />
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 tabular-nums font-semibold tracking-tight ${
          muted ? "text-base text-muted-foreground" : `text-2xl ${accentText}`
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </>
  )
  const cls = "rounded-xl border bg-card px-3 py-2.5"
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:bg-muted/30`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

/**
 * Centro Operacional — Inicio. Torre de control: barra de PULSO arriba, la
 * decisión de Nexus (héroe) + las excepciones a dos columnas, y la operación viva
 * con su línea de vida full-width. Único orquestador. Reutiliza por completo
 * consultas y tarjetas existentes — sin pantallas, estados ni consultas nuevas.
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

  // Operaciones activas: técnicos con un job en ejecución. Línea de vida con la
  // MISMA función canónica (sin timeline nuevo).
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

  // Completadas: WO completadas + su factura (match por workOrderId).
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

  // Dinero (peso mínimo): por cobrar de las facturas ya cargadas.
  const invoices = invoicesPage?.items ?? []
  const porCobrar = invoices.reduce((s, i) => s + (i.balance > 0 ? i.balance : 0), 0)

  return (
    <div className="space-y-6">
      {/* ── BARRA DE PULSO ── operacional grande, dinero pequeño ──────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <PulseTile label="Operaciones activas" value={activeOps.length} accent="blue" />
        <PulseTile
          label="Requieren atención"
          value={exceptions.length}
          accent={exceptions.length > 0 ? "orange" : "silver"}
        />
        <PulseTile
          label="Decisiones de Nexus"
          value={proposals.length}
          accent={proposals.length > 0 ? "emerald" : "silver"}
        />
        {stats ? (
          <PulseTile
            label="Técnicos disponibles"
            value={stats.availableTechnicians}
            accent="emerald"
            hint={`${stats.busyTechnicians} ocupados · ${stats.overloadedTechnicians} sobrecargados`}
            href={`/app/${tenantSlug}/field-monitor`}
          />
        ) : null}
        {canInvoices ? (
          <PulseTile label="Por cobrar" value={formatCOP(porCobrar)} muted href={`/app/${tenantSlug}/invoices`} />
        ) : null}
      </div>

      {/* ── N1 · Decisión de Nexus (héroe) + Requiere tu atención (excepciones) ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Héroe — el elemento más importante de toda la app */}
        <section aria-label="Nexus recomienda" className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue">
              <Sparkles className="size-4" />
            </span>
            <h2 className="text-base font-semibold text-foreground">
              Nexus recomienda
              {proposals.length ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">· {proposals.length}</span>
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

        {/* Requiere tu atención (excepciones) — columna lateral */}
        <section aria-label="Requiere tu atención">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${exceptions.length > 0 ? "bg-orange-500" : "bg-muted-foreground/40"}`}
            />
            <h2 className="text-base font-semibold text-foreground">
              Requiere tu atención
              {exceptions.length ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">· {exceptions.length}</span>
              ) : null}
            </h2>
          </div>
          {exceptions.length === 0 ? (
            <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              Nada bloqueado. Nexus está coordinando todo solo.
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((e) => (
                <DispatchExceptionCard key={e.caseId} exception={e} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── N2 · Operación en marcha (full-width, línea de vida viva) ── */}
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

      {/* Negocio: enlace tenue al pie (el dinero ya vive pequeño en el pulso). */}
      {canInvoices ? (
        <Link
          href={`/app/${tenantSlug}/invoices`}
          className="inline-flex items-center gap-1 border-t pt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          Ir a Facturación <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}
