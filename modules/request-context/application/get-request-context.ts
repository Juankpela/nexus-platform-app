import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import { getCachedCurrentUser } from "@/modules/identity/composition"
import type { RequestContext } from "@/modules/request-context/domain/request-context"
import { resolveCachedTenantAccess } from "@/modules/tenancy/composition"

export const getRequestContext = cache(
  async (tenantSlug: string): Promise<RequestContext> => {
    const user = await getCachedCurrentUser()
    if (!user) redirect(`/login?next=/app/${encodeURIComponent(tenantSlug)}`)

    const access = await resolveCachedTenantAccess(tenantSlug)
    if (!access) notFound()

    const requestHeaders = await headers()
    const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID()

    return {
      requestId,
      userId: user.id,
      tenantId: access.id,
      membershipId: access.membershipId,
      effectivePermissions: Object.freeze([...access.effectivePermissions]),
      enabledFeatures: Object.freeze([...access.enabledFeatures]),
      roleKeys: Object.freeze([...access.roleKeys]),
      tenant: Object.freeze({
        id: access.id,
        slug: access.slug,
        name: access.name,
      }),
    }
  },
)
