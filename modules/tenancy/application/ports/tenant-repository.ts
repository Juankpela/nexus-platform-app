import type {
  TenantBusinessProfile,
  TenantSummary,
} from "@/modules/tenancy/domain/tenant"
import type { UUID } from "@/types/shared"

export type ResolvedTenantAccess = TenantSummary & {
  effectivePermissions: string[]
  enabledFeatures: string[]
  /** Claves de los roles del usuario en el tenant (p. ej. tenant_admin, supervisor). */
  roleKeys: string[]
}

export interface TenantRepository {
  resolveAccessBySlug(slug: string): Promise<ResolvedTenantAccess | null>
  listForUser(userId: UUID): Promise<TenantSummary[]>
  getBusinessProfile(tenantId: UUID): Promise<TenantBusinessProfile>
  updateBusinessProfile(
    tenantId: UUID,
    profile: TenantBusinessProfile,
  ): Promise<void>
}
