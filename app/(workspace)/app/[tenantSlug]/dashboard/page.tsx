import {
  ArrowRight,
  Building2,
  Contact,
  DollarSign,
  LifeBuoy,
  Target,
  TrendingUp,
  Users2,
  Wrench,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getTenantDashboardStats } from "@/modules/crm/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Dashboard" }

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  if (value === 0) return "$0"
  return `$${value.toLocaleString()}`
}

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.dashboardRead)

  const stats = await getTenantDashboardStats(context.tenantId)
  const base = `/app/${tenantSlug}/dashboard`

  const areas = [
    {
      href: `${base}/crm`,
      title: "CRM",
      description: "Pipeline, oportunidades y conversión.",
      icon: Target,
      show: hasPermission(context.effectivePermissions, "crm.opportunities.read"),
    },
    {
      href: `${base}/service`,
      title: "Service",
      description: "Casos, SLA y activos.",
      icon: LifeBuoy,
      show: hasPermission(context.effectivePermissions, SERVICE_PERMISSIONS.casesRead),
    },
    {
      href: `${base}/field-service`,
      title: "Field Service",
      description: "Asignaciones, técnicos y utilización.",
      icon: Wrench,
      show: hasPermission(
        context.effectivePermissions,
        SERVICE_PERMISSIONS.dispatchRead,
      ),
    },
  ].filter((a) => a.show)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Centro de operaciones — resumen ejecutivo de Nexus."
      />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        {/* Global executive KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Empresas" value={stats.companiesCount} icon={Building2} accent="blue" />
          <KpiCard label="Contactos" value={stats.contactsCount} icon={Contact} accent="silver" />
          <KpiCard label="Oportunidades abiertas" value={stats.openOpportunitiesCount} icon={Target} accent="blue" />
          <KpiCard label="Pipeline" value={formatCurrency(stats.pipelineValue)} icon={TrendingUp} accent="emerald" hint="Oportunidades activas" />
          <KpiCard label="Cotizaciones" value={stats.quotesCount} icon={Users2} accent="orange" />
          <KpiCard label="Ingresos (ganados)" value={formatCurrency(stats.wonRevenue)} icon={DollarSign} accent="emerald" />
        </div>

        {/* Quick access to specialized dashboards */}
        {areas.length > 0 ? (
          <div>
            <h2 className="mb-3 text-base font-semibold">Dashboards por área</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <a.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {a.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
