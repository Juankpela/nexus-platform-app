import "server-only"

import { cache } from "react"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import { SupabaseIdentityAdminRepository } from "@/modules/identity/infrastructure/supabase-identity-admin-repository"
import {
  changeMemberStatus,
  type ChangeMemberStatusInput,
} from "@/modules/tenancy/application/use-cases/change-member-status"
import {
  createTenantMember,
  type CreateTenantMemberInput,
} from "@/modules/tenancy/application/use-cases/create-tenant-member"
import { listAssignableRoles } from "@/modules/tenancy/application/use-cases/list-assignable-roles"
import { listTenantMembers } from "@/modules/tenancy/application/use-cases/list-tenant-members"
import { listUserTenants } from "@/modules/tenancy/application/use-cases/list-user-tenants"
import {
  replaceMemberRoles,
  type ReplaceMemberRolesInput,
} from "@/modules/tenancy/application/use-cases/replace-member-roles"
import { resolveTenantAccess } from "@/modules/tenancy/application/use-cases/resolve-tenant-access"
import { SupabaseMemberRepository } from "@/modules/tenancy/infrastructure/supabase-member-repository"
import { SupabaseTenantRepository } from "@/modules/tenancy/infrastructure/supabase-tenant-repository"
import type { UUID } from "@/types/shared"

export const resolveCachedTenantAccess = cache((tenantSlug: string) =>
  resolveTenantAccess(new SupabaseTenantRepository(), tenantSlug),
)

export const listCachedUserTenants = cache((userId: UUID) =>
  listUserTenants(new SupabaseTenantRepository(), userId),
)

export const listCachedTenantMembers = cache((tenantId: UUID) =>
  listTenantMembers(
    new SupabaseMemberRepository(),
    new SupabaseIdentityAdminRepository(),
    tenantId,
  ),
)

export const listCachedAssignableRoles = cache(() =>
  listAssignableRoles(new SupabaseMemberRepository()),
)

// Mutations are intentionally not cached.
export function changeTenantMemberStatus(input: ChangeMemberStatusInput) {
  return changeMemberStatus(
    {
      members: new SupabaseMemberRepository(),
      audit: new SupabaseAuditRepository(),
    },
    input,
  )
}

export function replaceTenantMemberRoles(input: ReplaceMemberRolesInput) {
  return replaceMemberRoles(
    {
      members: new SupabaseMemberRepository(),
      audit: new SupabaseAuditRepository(),
    },
    input,
  )
}

export function addTenantMember(input: CreateTenantMemberInput) {
  return createTenantMember(
    {
      identity: new SupabaseIdentityAdminRepository(),
      members: new SupabaseMemberRepository(),
      audit: new SupabaseAuditRepository(),
    },
    input,
  )
}
