import { Plus, Upload } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ContactCsvImport } from "@/components/crm/contact-csv-import"
import { ContactFormDialog } from "@/components/crm/contact-form-dialog"
import { CrmStatusToggle } from "@/components/crm/crm-status-toggle"
import { Pagination } from "@/components/crm/pagination"
import { ExportButton } from "@/components/integrations/export-button"
import { ClientOnly } from "@/components/layout/client-only"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  listCompanyOptions,
  listTenantContacts,
} from "@/modules/crm/composition"
import type { CrmStatus } from "@/modules/crm/domain/company"
import type { CompanyOption } from "@/modules/crm/domain/company"
import { setContactStatusAction } from "@/modules/crm/presentation/contact-actions"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Contactos" }

const PAGE_SIZE = 10

const statusStyles: Record<CrmStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
}

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.contactsRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.contactsWrite,
  )

  const search = sp.search?.trim() ? sp.search.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/contacts`

  const [result, companyOptions] = await Promise.all([
    listTenantContacts(context.tenantId, { search, page, pageSize: PAGE_SIZE }),
    canWrite
      ? listCompanyOptions(context.tenantId)
      : Promise.resolve([] as CompanyOption[]),
  ])

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Gestiona los contactos de tu espacio de trabajo."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form action={basePath} className="w-full max-w-xs">
            <Input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Buscar contactos..."
            />
          </form>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ExportButton tenantSlug={tenantSlug} object="contacts" filters={{ search }} />
            {canWrite ? (
              // The create dialog renders FIRST in the DOM (pushed to the visual
              // end with order-last) to dodge a Next 16 SSR bug where a Radix
              // Dialog placed after another Dialog client subtree fails to
              // render its trigger.
              <>
                <ContactFormDialog
                  tenantSlug={tenantSlug}
                  companyOptions={companyOptions}
                  trigger={
                    <Button className="order-last">
                      <Plus />
                      Nuevo contacto
                    </Button>
                  }
                />
                <ContactCsvImport
                  tenantSlug={tenantSlug}
                  trigger={
                    <Button variant="outline">
                      <Upload />
                      Importar contactos
                    </Button>
                  }
                />
              </>
            ) : null}
          </div>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="Sin contactos"
            description={
              search
                ? "Ningún contacto coincide con tu búsqueda."
                : "Crea tu primer contacto para empezar."
            }
            actions={
              canWrite ? (
                <ClientOnly>
                  <ContactFormDialog
                    tenantSlug={tenantSlug}
                    companyOptions={companyOptions}
                    trigger={
                      <Button>
                        <Plus />
                        Crear contacto
                      </Button>
                    }
                  />
                  <ContactCsvImport
                    tenantSlug={tenantSlug}
                    trigger={
                      <Button variant="outline">
                        <Upload />
                        Importar contactos
                      </Button>
                    }
                  />
                </ClientOnly>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {canWrite ? (
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((contact) => (
                  <tr key={contact.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/app/${tenantSlug}/contacts/${contact.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {[contact.firstName, contact.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </Link>
                      {contact.title ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {contact.title}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {contact.companyId && contact.companyName ? (
                        <Link href={`/app/${tenantSlug}/companies/${contact.companyId}`} className="hover:underline">
                          {contact.companyName}
                        </Link>
                      ) : (
                        (contact.companyName ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {contact.email ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {contact.phone ?? contact.mobile ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[contact.status]}`}
                      >
                        {contact.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ContactFormDialog
                            tenantSlug={tenantSlug}
                            companyOptions={companyOptions}
                            contact={contact}
                            trigger={
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            }
                          />
                          <CrmStatusToggle
                            tenantSlug={tenantSlug}
                            id={contact.id}
                            status={contact.status}
                            action={setContactStatusAction}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath={basePath}
          search={search}
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
        />
      </div>
    </>
  )
}
