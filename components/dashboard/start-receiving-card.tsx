import { Inbox } from "lucide-react"

import { PublicLinkPanel } from "@/components/portal/public-link-panel"

/**
 * Tarjeta de activación del Dashboard: hace visible el enlace público de reportes
 * para que un gerente nuevo empiece a recibir trabajos el día 1. Habla en
 * resultado de negocio, no en módulos. Reutiliza `<PublicLinkPanel>`.
 */
export function StartReceivingCard({
  url,
  tenantName,
}: {
  url: string
  tenantName: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Inbox className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            Empieza a recibir solicitudes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte este enlace con tus clientes. Cuando reporten algo (con foto y
            ubicación), entra automáticamente como un caso en NEXUS.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <PublicLinkPanel url={url} tenantName={tenantName} />
      </div>
    </div>
  )
}
