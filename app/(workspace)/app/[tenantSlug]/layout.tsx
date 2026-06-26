import { WorkspaceChrome } from "@/components/layout/workspace-chrome"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import {
  countMyUnread,
  listMyNotifications,
} from "@/modules/notifications/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { isTechnicianOnly } from "@/modules/request-context/domain/role"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)

  // El técnico puro vive en su móvil de campo (WorkerShell, su propio layout).
  // NUNCA hereda el chrome administrativo (sidebar/barra superior): toda su
  // navegación la aporta WorkerShell. Sin chrome admin = no hay puerta al dashboard.
  if (isTechnicianOnly(context.roleKeys)) {
    return <>{children}</>
  }

  const user = await getCachedCurrentUser()
  const [notifications, unreadCount] = await Promise.all([
    listMyNotifications(context.tenantId, context.userId),
    countMyUnread(context.tenantId, context.userId),
  ])

  return (
    <WorkspaceChrome
      tenantName={context.tenant.name}
      tenantSlug={context.tenant.slug}
      permissions={context.effectivePermissions}
      enabledFeatures={context.enabledFeatures}
      userEmail={user?.email ?? null}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceChrome>
  )
}
