import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  CRM_PERMISSIONS,
  INVENTORY_PERMISSIONS,
} from "@/modules/authorization/domain/permission"
import { COLUMN_REGISTRY } from "@/modules/integrations/application/column-registry"
import type {
  ExportDefinition,
  ExportRegistry,
} from "@/modules/integrations/application/ports/export-source"
import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import {
  buildExport,
  type BuildExportInput,
} from "@/modules/integrations/application/use-cases/build-export"
import {
  accountsFetch,
  contactsFetch,
  materialsFetch,
} from "@/modules/integrations/infrastructure/export-data-sources"
import { CsvRenderer } from "@/modules/integrations/infrastructure/csv-renderer"
import { XlsxRenderer } from "@/modules/integrations/infrastructure/xlsx-renderer"
import type {
  ExportArtifact,
  ExportFormat,
} from "@/modules/integrations/domain/export-contract"

const DEFINITIONS: Record<string, ExportDefinition> = {
  materials: {
    object: "materials",
    label: "Materials",
    permission: INVENTORY_PERMISSIONS.materialsRead,
    columns: COLUMN_REGISTRY.materials,
    fetch: materialsFetch,
  },
  accounts: {
    object: "accounts",
    label: "Accounts",
    permission: CRM_PERMISSIONS.companiesRead,
    columns: COLUMN_REGISTRY.accounts,
    fetch: accountsFetch,
  },
  contacts: {
    object: "contacts",
    label: "Contacts",
    permission: CRM_PERMISSIONS.contactsRead,
    columns: COLUMN_REGISTRY.contacts,
    fetch: contactsFetch,
  },
}

const registry: ExportRegistry = {
  get: (object) => DEFINITIONS[object],
}

const renderers: Record<ExportFormat, ExportRenderer> = {
  csv: new CsvRenderer(),
  xlsx: new XlsxRenderer(),
}

/** Permission that gates a given export object (used by presentation before building). */
export function exportPermissionFor(object: string): string | null {
  return DEFINITIONS[object]?.permission ?? null
}

export function buildExportArtifact(input: BuildExportInput): Promise<ExportArtifact> {
  return buildExport(
    { registry, renderers, audit: new SupabaseAuditRepository() },
    input,
  )
}
