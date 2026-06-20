import { BarChart3, TrendingUp } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FORECASTING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Reportes" }

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FORECASTING_PERMISSIONS.read)

  return (
    <>
      <PageHeader title="Reports" description="Reportes personalizados de Nexus." />
      <div className="px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-lg rounded-xl border border-dashed bg-card p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Reportes — próximamente
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            El generador de reportes personalizados llegará en un próximo sprint.
            Mientras tanto, usa Forecast para el análisis de revenue y pipeline.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link href={`/app/${tenantSlug}/forecasting`}>
              <TrendingUp className="size-4" />
              Ir a Forecast
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
