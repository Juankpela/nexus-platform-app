import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicReportForm } from "@/components/portal/public-report-form"
import { getPublicReportTarget } from "@/modules/service/composition"

export const metadata: Metadata = { title: "Reportar una novedad" }
export const dynamic = "force-dynamic"

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const target = await getPublicReportTarget(tenantSlug)
  if (!target) notFound()

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reportar una novedad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{target.tenantName}</p>
      </header>
      <PublicReportForm tenantSlug={tenantSlug} />
    </main>
  )
}
