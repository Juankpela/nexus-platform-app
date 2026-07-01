import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { CommandCenter } from "@/components/dashboard/command-center"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { formatDate } from "@/lib/format/datetime"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { buildOnboardingFlow } from "@/modules/platform/application/onboarding-flow"
import { getOnboardingCounts } from "@/modules/platform/infrastructure/onboarding-counts"
import { dashboardTabsFor } from "@/modules/platform/presentation/navigation"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { isTechnicianOnly } from "@/modules/request-context/domain/role"

export const metadata: Metadata = { title: "Centro de Comando" }

/**
 * Inicio — Centro de Comando (rediseño founder, 2026-07-01).
 * La pantalla no resume el sistema: dirige la atención. Un solo protagonista
 * (las decisiones del día); los detalles viven en sus módulos. Los paneles por
 * área (CRM/Servicio/Campo) se degradan a enlaces discretos al pie.
 */
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

  const onboarding = buildOnboardingFlow(await getOnboardingCounts(context.tenantId))

  // Enlace público de reportes: solo durante la activación (después es ruido;
  // vive en Configuración para quien lo necesite).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl =
    onboarding.status === "in_progress" && appUrl ? `${appUrl}/r/${tenantSlug}` : null

  // Paneles de detalle por área (antes tabs): enlaces discretos al pie.
  const areaTabs = dashboardTabsFor(tenantSlug, context.effectivePermissions).filter(
    (t) => t.label !== "Resumen",
  )

  return (
    <div className="px-5 py-6 sm:px-8">
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          En vivo
        </span>
        · {context.tenant.name} · {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <CommandCenter
        tenantSlug={tenantSlug}
        tenantId={context.tenantId}
        permissions={context.effectivePermissions}
        onboarding={onboarding}
      />

      {reportUrl ? (
        <div className="mx-auto mt-12 max-w-2xl">
          <StartReceivingCard url={reportUrl} tenantName={context.tenant.name} />
        </div>
      ) : null}

      {areaTabs.length > 0 ? (
        <p className="mt-14 flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span>Detalle por área:</span>
          {areaTabs.map((t) => (
            <Link key={t.href} href={t.href} className="hover:text-foreground">
              {t.label}
            </Link>
          ))}
        </p>
      ) : null}
    </div>
  )
}
