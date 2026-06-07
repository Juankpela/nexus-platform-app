import "server-only"

import { notFound, redirect } from "next/navigation"

import { getCachedCurrentUser } from "@/modules/identity/composition"
import { isCurrentUserPlatformAdmin } from "@/modules/platform/composition"

/**
 * Gate for the platform (provider) plane. Authenticates the request and asserts
 * the caller holds the super_admin platform role. A non-admin gets a 404 (the
 * platform area must not even reveal its existence). Returns the current user.
 */
export async function requirePlatformAdmin() {
  const user = await getCachedCurrentUser()
  if (!user) redirect("/login")

  const isAdmin = await isCurrentUserPlatformAdmin()
  if (!isAdmin) notFound()

  return user
}
