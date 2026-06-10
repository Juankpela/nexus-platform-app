/**
 * INT-1 Centralized Column Registry (ADR-024 required change #2).
 *
 * The SINGLE source of truth for export columns. Every object's output schema lives
 * here as an explicit allowlist — renderers and data sources never decide columns.
 * This is what makes exports auditable, PII-safe (no `select *` reaches a file), and
 * stable for downstream consumers. Application layer: it deliberately knows other
 * modules' read types (Material/Company/Contact) — that coupling is by design.
 */
import type {
  ColumnSpec,
  ExportableObject,
} from "@/modules/integrations/domain/export-contract"
import type { Company } from "@/modules/crm/domain/company"
import type { Contact } from "@/modules/crm/domain/contact"
import type { Material } from "@/modules/inventory/domain/material"

export const MATERIAL_COLUMNS: ColumnSpec<Material>[] = [
  { key: "sku", header: "SKU", accessor: (m) => m.sku },
  { key: "name", header: "Name", accessor: (m) => m.name },
  { key: "unitOfMeasure", header: "Unit of measure", accessor: (m) => m.unitOfMeasure },
  { key: "active", header: "Active", accessor: (m) => m.active },
  { key: "createdAt", header: "Created at", accessor: (m) => m.createdAt },
]

export const ACCOUNT_COLUMNS: ColumnSpec<Company>[] = [
  { key: "name", header: "Name", accessor: (c) => c.name },
  { key: "taxId", header: "Tax ID", accessor: (c) => c.taxId },
  { key: "industry", header: "Industry", accessor: (c) => c.industry },
  { key: "phone", header: "Phone", accessor: (c) => c.phone },
  { key: "city", header: "City", accessor: (c) => c.city },
  { key: "country", header: "Country", accessor: (c) => c.country },
  { key: "status", header: "Status", accessor: (c) => c.status },
  { key: "createdAt", header: "Created at", accessor: (c) => c.createdAt },
]

// Contacts include PII (email/phone). Columns are an explicit allowlist; exports of
// this object MUST be audited (handled in buildExport). No free-form fields leak.
export const CONTACT_COLUMNS: ColumnSpec<Contact>[] = [
  { key: "firstName", header: "First name", accessor: (c) => c.firstName },
  { key: "lastName", header: "Last name", accessor: (c) => c.lastName },
  { key: "email", header: "Email", accessor: (c) => c.email },
  { key: "phone", header: "Phone", accessor: (c) => c.phone },
  { key: "mobile", header: "Mobile", accessor: (c) => c.mobile },
  { key: "title", header: "Title", accessor: (c) => c.title },
  { key: "companyName", header: "Company", accessor: (c) => c.companyName },
  { key: "status", header: "Status", accessor: (c) => c.status },
  { key: "createdAt", header: "Created at", accessor: (c) => c.createdAt },
]

/**
 * The frozen registry. Typed column arrays are erased to `ColumnSpec<unknown>[]` at
 * this boundary — sound because each object's data source yields exactly its Row type
 * at runtime (see export-data-sources). This is the one localized type erasure.
 */
export const COLUMN_REGISTRY: Record<ExportableObject, ColumnSpec<unknown>[]> = {
  materials: MATERIAL_COLUMNS as unknown as ColumnSpec<unknown>[],
  accounts: ACCOUNT_COLUMNS as unknown as ColumnSpec<unknown>[],
  contacts: CONTACT_COLUMNS as unknown as ColumnSpec<unknown>[],
}
