"use client"

import { CsvImportCard } from "@/components/import/csv-import-card"
import { CONTACT_TEMPLATE_CSV } from "@/modules/crm/domain/contact-import"
import { importContactsAction } from "@/modules/crm/presentation/contact-actions"

/**
 * Contacts CSV import (Inc 2). Thin wrapper over the shared upload card — same
 * UX as Companies, only the template, columns and action change.
 */
export function ContactCsvImport({
  tenantSlug,
  trigger,
}: {
  tenantSlug: string
  trigger: React.ReactNode
}) {
  return (
    <CsvImportCard
      entityPlural="contactos"
      tenantSlug={tenantSlug}
      requiredColumns={["first_name"]}
      previewColumns={[
        { key: "first_name", label: "Nombre" },
        { key: "last_name", label: "Apellido" },
        { key: "email", label: "Email" },
        { key: "company_tax_id", label: "NIT empresa" },
      ]}
      templateCsv={CONTACT_TEMPLATE_CSV}
      templateFileName="plantilla-contactos.csv"
      action={importContactsAction}
      trigger={trigger}
    />
  )
}
