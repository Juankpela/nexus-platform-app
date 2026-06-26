"use client"

import { usePathname } from "next/navigation"
import type * as React from "react"

import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import type { Notification } from "@/modules/notifications/domain/notification"

/**
 * Renders the back-office shell (sidebar + header + breadcrumbs) for workspace
 * routes, but steps out of the way on the Field Worker area (/worker), which
 * brings its own mobile-first shell. Keeps a single workspace layout while
 * giving the worker a distinct, focused experience.
 */
export function WorkspaceChrome({
  tenantName,
  tenantSlug,
  permissions,
  enabledFeatures,
  userEmail,
  notifications,
  unreadCount,
  children,
}: {
  tenantName: string
  tenantSlug: string
  permissions: readonly string[]
  enabledFeatures: readonly string[]
  userEmail: string | null
  notifications: Notification[]
  unreadCount: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isWorker = pathname?.includes(`/app/${tenantSlug}/worker`)

  if (isWorker) return <>{children}</>

  return (
    <div className="workspace-bg flex min-h-screen">
      <AppSidebar
        tenantName={tenantName}
        tenantSlug={tenantSlug}
        permissions={permissions}
        enabledFeatures={enabledFeatures}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          userEmail={userEmail}
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <Breadcrumbs tenantSlug={tenantSlug} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
