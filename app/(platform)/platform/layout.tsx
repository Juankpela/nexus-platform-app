import Link from "next/link"
import type { ReactNode } from "react"

import { NexusLogo } from "@/components/layout/nexus-logo"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/modules/identity/presentation/actions"
import { requirePlatformAdmin } from "@/modules/platform/presentation/require-platform-admin"

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode
}) {
  // Gate the entire platform plane: non-super-admins get a 404.
  await requirePlatformAdmin()

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-5">
        <Link href="/platform" aria-label="Nexus" className="flex items-center gap-2">
          <NexusLogo variant="full" theme="light" className="h-8" />
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Plataforma
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  )
}
