import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { MemberRepository } from "@/modules/tenancy/application/ports/member-repository"
import { replaceMemberRoles } from "@/modules/tenancy/application/use-cases/replace-member-roles"
import { TENANT_ADMIN_ROLE_KEY } from "@/modules/tenancy/domain/member"

const TENANT = "11111111-1111-1111-1111-111111111111"
const MEMBERSHIP = "22222222-2222-2222-2222-222222222222"
const OTHER_MEMBERSHIP = "55555555-5555-5555-5555-555555555555"
const ADMIN_ROLE = "aaaaaaaa-0000-0000-0000-000000000001"
const SALES_ROLE = "aaaaaaaa-0000-0000-0000-000000000002"

const ROLES = [
  { id: ADMIN_ROLE, key: TENANT_ADMIN_ROLE_KEY, name: "Tenant Admin" },
  { id: SALES_ROLE, key: "sales_representative", name: "Sales Representative" },
]

function setup(opts: {
  activeAdmins: string[]
  summaryRoleKeys?: string[]
}) {
  const replace = vi.fn().mockResolvedValue(undefined)
  const append = vi.fn().mockResolvedValue(undefined)
  const members = {
    getMembershipSummary: vi.fn().mockResolvedValue({
      userId: "99999999-9999-9999-9999-999999999999",
      roleKeys: opts.summaryRoleKeys ?? [TENANT_ADMIN_ROLE_KEY],
    }),
    listAssignableRoles: vi.fn().mockResolvedValue(ROLES),
    listActiveAdminMembershipIds: vi.fn().mockResolvedValue(opts.activeAdmins),
    replaceMemberRoles: replace,
  } as unknown as MemberRepository
  const audit = { append } as unknown as AuditRepository
  return { members, audit, replace, append }
}

const input = (roleIds: string[]) => ({
  actorId: "33333333-3333-3333-3333-333333333333",
  tenantId: TENANT,
  requestId: "44444444-4444-4444-4444-444444444444",
  membershipId: MEMBERSHIP,
  roleIds,
})

describe("replaceMemberRoles — last-admin invariant", () => {
  it("blocks demoting the only active administrator", async () => {
    const { members, audit, replace } = setup({ activeAdmins: [MEMBERSHIP] })
    await expect(
      replaceMemberRoles({ members, audit }, input([SALES_ROLE])),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" })
    expect(replace).not.toHaveBeenCalled()
  })

  it("allows demoting an admin when another active admin remains", async () => {
    const { members, audit, replace } = setup({
      activeAdmins: [MEMBERSHIP, OTHER_MEMBERSHIP],
    })
    await replaceMemberRoles({ members, audit }, input([SALES_ROLE]))
    expect(replace).toHaveBeenCalledWith(MEMBERSHIP, TENANT, [SALES_ROLE])
  })

  it("allows changing roles while keeping the admin role on the last admin", async () => {
    const { members, audit, replace } = setup({ activeAdmins: [MEMBERSHIP] })
    await replaceMemberRoles(
      { members, audit },
      input([ADMIN_ROLE, SALES_ROLE]),
    )
    expect(replace).toHaveBeenCalledWith(MEMBERSHIP, TENANT, [
      ADMIN_ROLE,
      SALES_ROLE,
    ])
  })

  it("rejects an unknown role id", async () => {
    const { members, audit, replace } = setup({ activeAdmins: [MEMBERSHIP] })
    await expect(
      replaceMemberRoles(
        { members, audit },
        input(["00000000-0000-0000-0000-000000000000"]),
      ),
    ).rejects.toMatchObject({ code: "UNKNOWN_ROLE" })
    expect(replace).not.toHaveBeenCalled()
  })

  it("throws when the membership does not exist", async () => {
    const members = {
      getMembershipSummary: vi.fn().mockResolvedValue(null),
      listAssignableRoles: vi.fn(),
      listActiveAdminMembershipIds: vi.fn(),
      replaceMemberRoles: vi.fn(),
    } as unknown as MemberRepository
    const audit = { append: vi.fn() } as unknown as AuditRepository
    await expect(
      replaceMemberRoles({ members, audit }, input([SALES_ROLE])),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" })
  })
})
