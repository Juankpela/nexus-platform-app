export const FOUNDATION_PERMISSIONS = {
  dashboardRead: "tenant.dashboard.read",
  usersRead: "tenant.users.read",
  usersWrite: "tenant.users.write",
  settingsRead: "tenant.settings.read",
  settingsWrite: "tenant.settings.write",
  auditRead: "tenant.audit.read",
} as const

export const CRM_PERMISSIONS = {
  leadsRead: "crm.leads.read",
  leadsWrite: "crm.leads.write",
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

// Billing / Revenue Operations permissions (20260610006_billing_invoices.sql).
// Granular by design: issue and void are distinct from create/edit (frozen 2026-06-10).
export const BILLING_PERMISSIONS = {
  invoicesRead:  "billing.invoices.read",
  invoicesWrite: "billing.invoices.write",
  invoicesIssue: "billing.invoices.issue",
  invoicesVoid:  "billing.invoices.void",
  paymentsRead:  "billing.payments.read",
  paymentsWrite: "billing.payments.write",
} as const

export const SERVICE_PERMISSIONS = {
  casesRead:   "service.cases.read",
  casesWrite:  "service.cases.write",
  assetsRead:  "service.assets.read",
  assetsWrite: "service.assets.write",
  workOrdersRead:  "service.work_orders.read",
  workOrdersWrite: "service.work_orders.write",
  techniciansRead:  "service.technicians.read",
  techniciansWrite: "service.technicians.write",
  schedulingRead:  "service.scheduling.read",
  schedulingWrite: "service.scheduling.write",
  dispatchRead:    "service.dispatch.read",
  fieldRead:       "service.field.read",
  fieldExecute:    "service.field.execute",
} as const

export const FORECASTING_PERMISSIONS = {
  read:              "forecasting.read",
  write:             "forecasting.write",
  snapshotsRead:     "forecasting.snapshots.read",
  snapshotsWrite:    "forecasting.snapshots.write",
} as const

// Inventory permissions already provisioned in the DB (20260610002_inventory_core.sql).
// Referenced here for the presentation layer (E-1); no new permissions are created.
export const INVENTORY_PERMISSIONS = {
  materialsRead:  "inventory.materials.read",
  materialsWrite: "inventory.materials.write",
  stockRead:      "inventory.stock.read",
  stockManage:    "inventory.stock.manage",
  consume:        "inventory.consume",
} as const

// N-LABS Operational Intelligence read access (20260625001_nlabs_permissions.sql).
// Read-only: the engine observes; it never mutates tenant operational data.
export const NLABS_PERMISSIONS = {
  read: "nlabs.read",
} as const

export type FoundationPermission =
  (typeof FOUNDATION_PERMISSIONS)[keyof typeof FOUNDATION_PERMISSIONS]

export function hasPermission(
  permissions: readonly string[],
  permission: string,
) {
  return permissions.includes(permission)
}
