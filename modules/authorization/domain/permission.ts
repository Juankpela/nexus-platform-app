export const FOUNDATION_PERMISSIONS = {
  dashboardRead: "tenant.dashboard.read",
  usersRead: "tenant.users.read",
  usersWrite: "tenant.users.write",
  settingsRead: "tenant.settings.read",
  auditRead: "tenant.audit.read",
} as const

export const CRM_PERMISSIONS = {
  companiesRead: "crm.companies.read",
  companiesWrite: "crm.companies.write",
  contactsRead: "crm.contacts.read",
  contactsWrite: "crm.contacts.write",
  activitiesRead: "crm.activities.read",
  activitiesWrite: "crm.activities.write",
  opportunitiesRead: "crm.opportunities.read",
  opportunitiesWrite: "crm.opportunities.write",
  productsRead: "crm.products.read",
  productsWrite: "crm.products.write",
  priceBooksRead: "crm.pricebooks.read",
  priceBooksWrite: "crm.pricebooks.write",
  quotesRead: "crm.quotes.read",
  quotesWrite: "crm.quotes.write",
} as const

export const FORECASTING_PERMISSIONS = {
  read:              "forecasting.read",
  write:             "forecasting.write",
  snapshotsRead:     "forecasting.snapshots.read",
  snapshotsWrite:    "forecasting.snapshots.write",
} as const

export type FoundationPermission =
  (typeof FOUNDATION_PERMISSIONS)[keyof typeof FOUNDATION_PERMISSIONS]

export function hasPermission(
  permissions: readonly string[],
  permission: string,
) {
  return permissions.includes(permission)
}
