import "server-only"

import { listTenantCompanies, listTenantContacts } from "@/modules/crm/composition"
import type { ExportFetch } from "@/modules/integrations/application/ports/export-source"
import { searchInventoryMaterials } from "@/modules/inventory/composition"

/**
 * Export data sources delegate to existing hexagonal READS (RLS-scoped). They never
 * touch tables directly (ADR-024). Each fetches up to `cap` rows; `total` lets
 * buildExport reject over-cap exports.
 */

export const materialsFetch: ExportFetch = async (tenantId, filters, cap) => {
  const active =
    filters.active === "true" ? true : filters.active === "false" ? false : null
  const { items, total } = await searchInventoryMaterials(tenantId, {
    search: filters.search ?? null,
    sku: filters.sku ?? null,
    active,
    limit: cap,
    offset: 0,
  })
  return { rows: items, total }
}

export const accountsFetch: ExportFetch = async (tenantId, filters, cap) => {
  const { items, total } = await listTenantCompanies(tenantId, {
    search: filters.search ?? null,
    page: 1,
    pageSize: cap,
  })
  return { rows: items, total }
}

export const contactsFetch: ExportFetch = async (tenantId, filters, cap) => {
  const { items, total } = await listTenantContacts(tenantId, {
    search: filters.search ?? null,
    page: 1,
    pageSize: cap,
  })
  return { rows: items, total }
}
