import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Brain } from "lucide-react"

import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { OnboardingCard } from "@/components/dashboard/onboarding-card"
import { OperationalCenter } from "@/components/dispatch/operational-center"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  FOUNDATION_PERMISSIONS,
  NLABS_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { buildOnboardingFlow } from "@/modules/platform/application/onboarding-flow"
import { getOnboardingCounts } from "@/modules/platform/infrastructure/onboarding-counts"
import { dashboardTabsFor } from "@/modules/platform/presentation/navigation"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { isTechnicianOnly } from "@/modules/request-context/domain/role"

export const metadata: Metadata = { title: "Centro Operacional" }

export default async function MissionControlPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  // El técnico puro no vive en el back-office: su casa es el móvil de campo.
  if (isTechnicianOnly(context.roleKeys)) redirect(`/app/${tenantSlug}/worker`)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.dashboardRead)

  // Enlace público de reportes: hace visible la entrada del Golden Path (reporte).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl = appUrl ? `${appUrl}/r/${tenantSlug}` : null

  // Pestañas del dashboard (Resumen + paneles de detalle por área, por permiso).
  const tabs = dashboardTabsFor(tenantSlug, context.effectivePermissions)
  const canNlabs = hasPermission(context.effectivePermissions, NLABS_PERMISSIONS.read)

  // Activación: el siguiente paso para un tenant que aún no cierra su 1ª factura.
  const onboarding = buildOnboardingFlow(await getOnboardingCounts(context.tenantId))

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Centro de Monitoreo Operacional
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Operación en vivo
          </span>
          · {context.tenant.name} · ¿Qué necesita tu atención ahora?
        </p>
      </header>

      {/* Guía de activación: por encima de los KPIs hasta cerrar la 1ª factura. */}
      {onboarding.status === "in_progress" ? (
        <OnboardingCard step={onboarding.step} tenantSlug={tenantSlug} />
      ) : null}

      <DashboardTabs tabs={tabs} />

      {canNlabs ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <Link href={`/app/${tenantSlug}/nlabs`}>
              <Brain className="size-4" />
              N-LABS · Inteligencia
            </Link>
          </Button>
        </div>
      ) : null}

      <OperationalCenter
        tenantSlug={tenantSlug}
        tenantId={context.tenantId}
        permissions={context.effectivePermissions}
      />

      {/* Herramienta de activación (no es "atención"): al pie. */}
      {reportUrl ? (
        <StartReceivingCard url={reportUrl} tenantName={context.tenant.name} />
      ) : null}
    </div>
  )
}
