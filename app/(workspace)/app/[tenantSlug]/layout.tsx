import { WorkspaceChrome } from "@/components/layout/workspace-chrome"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const [context, user] = await Promise.all([
    getRequestContext(tenantSlug),
    getCachedCurrentUser(),
  ])

  return (
    <WorkspaceChrome
      tenantName={context.tenant.name}
      tenantSlug={context.tenant.slug}
      permissions={context.effectivePermissions}
      userEmail={user?.email ?? null}
    >
      {children}
    </WorkspaceChrome>
  )
}
