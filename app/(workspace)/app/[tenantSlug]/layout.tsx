import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
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
    <div className="flex min-h-screen bg-muted/20">
      <AppSidebar
        tenantName={context.tenant.name}
        tenantSlug={context.tenant.slug}
        permissions={context.effectivePermissions}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          tenantName={context.tenant.name}
          userEmail={user?.email ?? null}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
