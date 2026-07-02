import {
  AlertTriangle,
  ArrowRight,
  Gauge,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react"
import Link from "next/link"

import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { getTenantCaseStats } from "@/modules/service/composition"
import { todayInAppZone } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"
import type { UUID } from "@/types/shared"

type SignalTone = "critical" | "attention" | "neutral"

type Signal = {
  id: string
  icon: typeof AlertTriangle
  tone: SignalTone
  value: string
  label: string
  insight: string
  actionLabel: string
  href: string
}

const TONE_STYLES: Record<
  SignalTone,
  { dot: string; value: string; ring: string }
> = {
  critical: {
    dot: "bg-orange-500",
    value: "text-orange-600 dark:text-orange-400",
    ring: "border-orange-200/70 dark:border-orange-900/40",
  },
  attention: {
    dot: "bg-nexus-blue",
    value: "text-nexus-blue",
    ring: "border-border",
  },
  neutral: {
    dot: "bg-emerald-500",
    value: "text-emerald-600 dark:text-emerald-400",
    ring: "border-emerald-200/60 dark:border-emerald-900/40",
  },
}

/**
 * N-LABS Intelligence Center. Reúsa por completo las consultas existentes del
 * Centro Operacional (sin queries nuevas) para entregar inteligencia operacional
 * REAL desde el primer minuto: problemas detectados, priorizados por impacto, con
 * la acción que los resuelve. Solo se muestra lo que funciona hoy; las capacidades
 * futuras de N-LABS no aparecen hasta que existan.
 */
export async function IntelligenceCenter({
  tenantSlug,
  tenantId,
  permissions,
}: {
  tenantSlug: string
  tenantId: UUID
  permissions: readonly string[]
}) {
  const can = (p: string) => hasPermission(permissions, p)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const canCases = can(SERVICE_PERMISSIONS.casesRead)
  const today = todayInAppZone()

  const [inbox, invoicesPage, stats, caseStats] = await Promise.all([
    listDispatchInbox(tenantId),
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
    canCases ? getTenantCaseStats(tenantId) : Promise.resolve(null),
  ])

  // ── Señales reales, derivadas de datos ya disponibles ──────────────────────
  const stuck = inbox.exceptions.length
  const invoices = invoicesPage?.items ?? []
  const openInvoices = invoices.filter((i) => i.balance > 0.01)
  const porCobrar = openInvoices.reduce((s, i) => s + i.balance, 0)
  const overloaded = stats?.overloadedTechnicians ?? 0
  // Solo los vencidos SIN atender (sin WO activa): los ya despachados están en atención.
  const overdueSla = caseStats?.openBreachedUnattendedCount ?? 0

  const signals: Signal[] = []
  if (overdueSla > 0) {
    signals.push({
      id: "sla",
      icon: ShieldCheck,
      tone: "critical",
      value: String(overdueSla),
      label: overdueSla === 1 ? "SLA vencido" : "SLA vencidos",
      insight:
        "Compromiso de servicio vencido y sin resolver. Cada uno erosiona la confianza del cliente.",
      actionLabel: "Resolver SLA",
      href: `/app/${tenantSlug}/cases?sla=overdue`,
    })
  }
  if (stuck > 0) {
    signals.push({
      id: "stuck",
      icon: AlertTriangle,
      tone: "critical",
      value: String(stuck),
      label: stuck === 1 ? "Trabajo detenido" : "Trabajos detenidos",
      insight:
        "Nexus no pudo coordinarlos solo. Cada uno es un cliente esperando respuesta.",
      actionLabel: "Resolver en Despacho",
      href: `/app/${tenantSlug}/dispatch`,
    })
  }
  if (canInvoices && openInvoices.length > 0) {
    signals.push({
      id: "receivable",
      icon: Receipt,
      tone: "attention",
      value: formatCOP(porCobrar),
      label: "Por cobrar",
      insight: `${openInvoices.length} ${openInvoices.length === 1 ? "factura sin saldar" : "facturas sin saldar"}. Dinero ya ganado, aún no en caja.`,
      actionLabel: "Ir a Facturación",
      href: `/app/${tenantSlug}/invoices`,
    })
  }
  if (canDispatch && overloaded > 0) {
    signals.push({
      id: "overload",
      icon: Users,
      tone: "attention",
      value: String(overloaded),
      label: overloaded === 1 ? "Técnico sobrecargado" : "Técnicos sobrecargados",
      insight:
        "Riesgo de incumplir hoy. Rebalancear carga protege el SLA y la calidad.",
      actionLabel: "Ver Monitor de campo",
      href: `/app/${tenantSlug}/field-monitor`,
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Operational Intelligence en vivo ─────────────────────────────────── */}
      <section aria-label="Problemas detectados">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue">
            <Gauge className="size-4" />
          </span>
          <h2 className="text-base font-semibold text-foreground">
            Problemas detectados ahora
            {signals.length ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {signals.length}
              </span>
            ) : null}
          </h2>
        </div>

        {signals.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <ShieldCheck className="size-5 shrink-0" />
            <p>
              Sin problemas operativos detectados. Tu operación está al día: nada
              detenido, sin SLA vencidos, sin sobrecarga y la cobranza al corriente.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((s) => {
              const tone = TONE_STYLES[s.tone]
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className={`group flex flex-col rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/30 ${tone.ring}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${tone.dot}`} />
                    <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </span>
                    <s.icon className="ml-auto size-4 text-muted-foreground/70" />
                  </div>
                  <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${tone.value}`}>
                    {s.value}
                  </p>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {s.insight}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-nexus-blue">
                    {s.actionLabel}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

