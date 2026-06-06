import { ArrowRight, Boxes } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { logoutAction } from "@/modules/identity/presentation/actions"
import { listCachedUserTenants } from "@/modules/tenancy/composition"

export default async function SelectTenantPage() {
  const user = await getCachedCurrentUser()
  if (!user) redirect("/login")

  const tenants = await listCachedUserTenants(user.id)
  if (tenants.length === 1) {
    redirect(`/app/${tenants[0].slug}/dashboard`)
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Boxes className="size-5" />
          Nexus
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
