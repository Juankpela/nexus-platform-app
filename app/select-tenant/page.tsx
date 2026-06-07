import { ArrowRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { NexusLogo } from "@/components/layout/nexus-logo"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { logoutAction } from "@/modules/identity/presentation/actions"
import { isCurrentUserPlatformAdmin } from "@/modules/platform/composition"
import { listCachedUserTenants } from "@/modules/tenancy/composition"

export default async function SelectTenantPage() {
  const user = await getCachedCurrentUser()
  if (!user) redirect("/login")

  const [tenants, platformAdmin] = await Promise.all([
    listCachedUserTenants(user.id),
    isCurrentUserPlatformAdmin(),
  ])

  // A platform admin with no workspace goes straight to the platform console.
  if (tenants.length === 0 && platformAdmin) {
    redirect("/platform")
  }
  // Regular users with a single workspace skip the chooser.
  if (tenants.length === 1 && !platformAdmin) {
    redirect(`/app/${tenants[0].slug}/dashboard`)
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-5">
        <Link href="/" aria-label="Nexus">
          <NexusLogo variant="full" theme="light" className="h-8" />
        </Link>
        <ThemeSwitcher />
      </header>
      <section className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select the tenant you want to open.
        </p>
        {platformAdmin ? (
          <Link
            href="/platform"
            className="mt-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <p className="font-medium">Consola de Plataforma</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Administrar organizaciones (clientes de Nexus)
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ) : null}
        <div className="mt-8 space-y-3">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/app/${tenant.slug}/dashboard`}
              className="flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tenant.slug}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          {tenants.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center">
              <p className="text-sm font-medium">No workspace access</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask a tenant administrator to add your account.
              </p>
            </div>
          ) : null}
        </div>
        <form action={logoutAction} className="mt-8">
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </section>
    </main>
  )
}
