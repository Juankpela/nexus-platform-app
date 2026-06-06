export const FOUNDATION_PERMISSIONS = {
  dashboardRead: "tenant.dashboard.read",
  usersRead: "tenant.users.read",
  usersWrite: "tenant.users.write",
  settingsRead: "tenant.settings.read",
  auditRead: "tenant.audit.read",
} as const

export type FoundationPermission =
  (typeof FOUNDATION_PERMISSIONS)[keyof typeof FOUNDATION_PERMISSIONS]

export function hasPermission(
  permissions: readonly string[],
  permission: string,
) {
  return permissions.includes(permission)
}
