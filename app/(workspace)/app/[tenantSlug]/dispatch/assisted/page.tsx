import { AlertTriangle, Inbox } from "lucide-react"
import type { Metadata } from "next"

import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import { PageHeader } from "@/components/layout/page-header"
import { emailConfigStatus } from "@/lib/email/send-email"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Despacho Asistido" }

export default async function AssistedDispatchPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const { proposals, exceptions } = await listDispatchInbox(context.tenantId)
  const email = emailConfigStatus()

  return (
    <>
      <PageHeader
        title="Despacho Asistido"
        description="Propuestas generadas por Nexus. Apruébalas en un clic; el sistema crea la orden, asigna y notifica al técnico."
      />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        {/* R1 — visibilidad de entregabilidad: nunca afirmar entrega que no ocurre. */}
        {email !== "production" ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {email === "sandbox"
                ? "Email en modo de prueba (remitente @resend.dev): las confirmaciones solo llegan a la cuenta dueña, no a los clientes reales. Verifica un dominio propio en Resend para producción."
                : "El email no está configurado: no se enviarán confirmaciones ni avisos al cliente. Configura RESEND_API_KEY y EMAIL_FROM."}
            </span>
          </div>
        ) : null}

        {/* Excepciones primero: lo que requiere atención humana no debe esconderse. */}
        {exceptions.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Requieren tu atención ({exceptions.length})
            </h2>
            {exceptions.map((e) => (
              <DispatchExceptionCard key={e.caseId} exception={e} />
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          {exceptions.length > 0 ? (
            <h2 className="text-sm font-semibold text-foreground">
              Listas para despachar ({proposals.length})
            </h2>
          ) : null}
          {proposals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card py-12 text-center">
              <Inbox className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay propuestas pendientes. Los reportes que el motor pueda despachar con confianza aparecerán aquí.
              </p>
            </div>
          ) : (
            proposals.map((p) => (
              <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
            ))
          )}
        </section>
      </div>
    </>
  )
}
