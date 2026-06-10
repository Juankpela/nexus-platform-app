import { WorkerShell } from "@/components/worker/worker-shell"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export default async function WorkerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)

  return (
    <WorkerShell tenantName={context.tenant.name} tenantSlug={context.tenant.slug}>
      {children}
    </WorkerShell>
  )
}
