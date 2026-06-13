import { WorkspaceChrome } from "@/components/layout/workspace-chrome"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import {
  countMyUnread,
  listMyNotifications,
} from "@/modules/notifications/composition"
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
  const [notifications, unreadCount] = await Promise.all([
    listMyNotifications(context.tenantId, context.userId),
    countMyUnread(context.tenantId, context.userId),
  ])

  return (
    <WorkspaceChrome
      tenantName={context.tenant.name}
      tenantSlug={context.tenant.slug}
      permissions={context.effectivePermissions}
      userEmail={user?.email ?? null}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceChrome>
  )
}
