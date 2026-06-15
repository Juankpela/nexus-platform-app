import type { Metadata } from "next"

import { BusinessProfileForm } from "@/components/settings/business-profile-form"
import { PageHeader } from "@/components/layout/page-header"
import {
  FOUNDATION_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { getTenantBusinessProfile } from "@/modules/tenancy/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.settingsRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.settingsWrite,
  )
  const profile = await getTenantBusinessProfile(context.tenantId)

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Configura tu espacio de trabajo."
      />
      <div className="max-w-2xl px-5 py-6 sm:px-8">
        <BusinessProfileForm
          tenantSlug={tenantSlug}
          tenantName={context.tenant.name}
          profile={profile}
          canWrite={canWrite}
        />
      </div>
    </>
  )
}
