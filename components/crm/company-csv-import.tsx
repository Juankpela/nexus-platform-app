"use client"

import { CsvImportCard } from "@/components/import/csv-import-card"
import { COMPANY_TEMPLATE_CSV } from "@/modules/crm/domain/company-import"
import { importCompaniesAction } from "@/modules/crm/presentation/company-actions"

/**
 * Companies CSV import (Inc 1). Thin wrapper that hands the generic upload card
 * the Companies template, required columns and server action. No framework —
 * just configuration for this one entity.
 */
export function CompanyCsvImport({
  tenantSlug,
  trigger,
}: {
  tenantSlug: string
  trigger: React.ReactNode
}) {
  return (
    <CsvImportCard
      entityPlural="empresas"
      tenantSlug={tenantSlug}
      requiredColumns={["name"]}
      previewColumns={[
        { key: "name", label: "Empresa" },
        { key: "tax_id", label: "NIT" },
        { key: "city", label: "Ciudad" },
        { key: "phone", label: "Teléfono" },
      ]}
      templateCsv={COMPANY_TEMPLATE_CSV}
      templateFileName="plantilla-empresas.csv"
      action={importCompaniesAction}
      trigger={trigger}
    />
  )
}
