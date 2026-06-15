"use client"

import { CsvImportCard } from "@/components/import/csv-import-card"
import { importAssetsAction } from "@/modules/service/presentation/asset-actions"
import { ASSET_TEMPLATE_CSV } from "@/modules/service/domain/asset-import"

/**
 * Assets CSV import (Inc 3). Thin wrapper over the shared upload card — same UX
 * as Companies/Contacts; only the template, columns and action change.
 */
export function AssetCsvImport({
  tenantSlug,
  trigger,
}: {
  tenantSlug: string
  trigger: React.ReactNode
}) {
  return (
    <CsvImportCard
      entityPlural="activos"
      tenantSlug={tenantSlug}
      requiredColumns={["name"]}
      previewColumns={[
        { key: "name", label: "Activo" },
        { key: "serial_number", label: "Serie" },
        { key: "asset_type", label: "Tipo" },
        { key: "company_tax_id", label: "NIT empresa" },
      ]}
      templateCsv={ASSET_TEMPLATE_CSV}
      templateFileName="plantilla-activos.csv"
      action={importAssetsAction}
      trigger={trigger}
    />
  )
}
