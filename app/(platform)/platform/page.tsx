import type { Metadata } from "next"

import { CreateOrganizationForm } from "./_components/create-organization-form"
import { OrganizationStatusToggle } from "./_components/organization-status-toggle"

import { EmptyState } from "@/components/layout/empty-state"
import { listCachedOrganizations } from "@/modules/platform/composition"
import {
  ORGANIZATION_STATUS_COLORS,
  ORGANIZATION_STATUS_LABELS,
} from "@/modules/platform/domain/organization"

export const metadata: Metadata = { title: "Organizaciones · Nexus Plataforma" }

export default async function PlatformOrganizationsPage() {
  const organizations = await listCachedOrganizations()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Los clientes de Nexus. Cada organización es un espacio de trabajo
            aislado con sus propios usuarios y datos.
          </p>
        </div>
        <CreateOrganizationForm />
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          title="Aún no hay organizaciones"
          description="Crea la primera organización para empezar a operar."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Organización</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Usuarios</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {organizations.map((org) => (
                <tr key={org.id} className="align-middle">
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      /{org.slug}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ORGANIZATION_STATUS_COLORS[org.status]}`}
                    >
                      {ORGANIZATION_STATUS_LABELS[org.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {org.memberCount}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {org.status === "archived" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <OrganizationStatusToggle
                        tenantId={org.id}
                        status={org.status}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
