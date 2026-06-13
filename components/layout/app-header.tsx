import { ChevronsUpDown, LogOut, Plus, Search } from "lucide-react"
import Link from "next/link"

import { NotificationBell } from "@/components/layout/notification-bell"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import type { Notification } from "@/modules/notifications/domain/notification"
import { logoutAction } from "@/modules/identity/presentation/actions"

function initialOf(value: string | null) {
  return (value?.trim()[0] ?? "?").toUpperCase()
}

export function AppHeader({
  tenantName,
  tenantSlug,
  userEmail,
  notifications,
  unreadCount,
}: {
  tenantName: string
  tenantSlug: string
  userEmail: string | null
  notifications: Notification[]
  unreadCount: number
}) {
  return (
    <header
      className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-3 sm:px-5"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        backgroundColor: "color-mix(in srgb, var(--background) 80%, transparent)",
      }}
    >
      {/* Tenant switcher */}
      <Link
        href="/select-tenant"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
        title="Switch workspace"
      >
        <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {initialOf(tenantName)}
        </span>
        <span className="max-w-40 truncate text-sm font-semibold tracking-tight">
          {tenantName}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </Link>

      {/* Global search (visual structure — wiring comes later) */}
      <div
        className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground md:flex"
        title="Search — coming soon"
      >
        <Search className="size-4" />
        <span className="flex-1">Search…</span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Quick actions + account */}
      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quick create"
          title="Quick create — coming soon"
        >
          <Plus />
        </Button>
        <NotificationBell
          tenantSlug={tenantSlug}
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <ThemeSwitcher />
        <div className="mx-1.5 hidden h-5 w-px bg-border sm:block" />
        <Link
          href={`/app/${tenantSlug}/settings`}
          aria-label="Account settings"
          title={userEmail ?? "Account"}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {initialOf(userEmail)}
        </Link>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Sign out"
          >
            <LogOut />
          </Button>
        </form>
      </div>
    </header>
  )
}
