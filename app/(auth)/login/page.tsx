import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { NexusLogo } from "@/components/layout/nexus-logo"
import { getCachedCurrentUser } from "@/modules/identity/composition"

export const metadata: Metadata = { title: "Iniciar sesión" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getCachedCurrentUser()
  if (user) redirect("/select-tenant")

  const { next } = await searchParams

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center lg:hidden">
        <NexusLogo variant="full" theme="light" className="h-14" />
      </div>
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">Bienvenido de nuevo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Sign in to Nexus
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Use your organization credentials to continue.
        </p>
      </div>
      <LoginForm nextPath={next} />
    </div>
  )
}
