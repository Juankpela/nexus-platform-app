import type { Metadata } from "next"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { MemberRolesEditor } from "@/components/members/member-roles-editor"
import { MemberStatusToggle } from "@/components/members/member-status-toggle"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  FOUNDATION_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import {
  listCachedAssignableRoles,
  listCachedTenantMembers,
} from "@/modules/tenancy/composition"
import type { MembershipStatus } from "@/modules/tenancy/domain/member"

export const metadata: Metadata = { title: "Users" }

const statusStyles: Record<MembershipStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  invited: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended: "bg-muted text-muted-foreground",
}

const statusLabels: Record<MembershipStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
}

export default async function UsersPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.usersRead)

  const canManage = hasPermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.usersWrite,
  )

  const [members, roleOptions] = await Promise.all([
    listCachedTenantMembers(context.tenantId),
    canManage ? listCachedAssignableRoles() : Promise.resolve([]),
  ])

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage workspace access and membership."
      />
      <div className="px-5 py-6 sm:px-8">
        {members.length === 0 ? (
          <EmptyState
            title="No members yet"
            description="Members will appear here once they are added to this workspace."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  {canManage ? (
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((member) => (
                  <tr key={member.membershipId} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">
                        {member.fullName ?? "Unnamed member"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {member.email ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[member.status]}`}
                      >
                        {statusLabels[member.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {canManage ? (
                        <MemberRolesEditor
                          tenantSlug={tenantSlug}
                          membershipId={member.membershipId}
                          roleOptions={roleOptions.map((role) => ({
                            id: role.id,
                            name: role.name,
                          }))}
                          assignedRoleIds={member.roles.map((role) => role.id)}
                        />
                      ) : member.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {member.roles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No roles
                        </span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-4 text-right">
                        <MemberStatusToggle
                          tenantSlug={tenantSlug}
                          membershipId={member.membershipId}
                          status={member.status}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
