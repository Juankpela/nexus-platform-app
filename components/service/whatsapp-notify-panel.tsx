import { MessageCircle } from "lucide-react"

/**
 * Panel "Avisar al cliente por WhatsApp" (Nivel 1, enlaces wa.me). Presentacional:
 * recibe los enlaces ya armados en el servidor y los abre en WhatsApp con el
 * mensaje pre-escrito. Sin JS de cliente: son anclas. Si no hay teléfono del
 * cliente, muestra el motivo en vez de botones.
 */
export type WhatsAppAction = {
  label: string
  /** Enlace wa.me listo (o null si el teléfono no es utilizable). */
  url: string | null
  /** Acción sugerida según el estado actual (se resalta). */
  primary?: boolean
}

export function WhatsAppNotifyPanel({
  phonePresent,
  actions,
}: {
  phonePresent: boolean
  actions: WhatsAppAction[]
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-base font-semibold">Avisar al cliente por WhatsApp</h2>
      </div>

      {!phonePresent ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Esta solicitud no tiene un número de WhatsApp del cliente. Pídelo y
          regístralo en la solicitud para poder avisarle.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Abre WhatsApp con el mensaje ya escrito. Solo confirma el envío.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((a) => {
              const base =
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              const tone = a.primary
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-input hover:bg-muted/50"
              if (!a.url) {
                return (
                  <span
                    key={a.label}
                    aria-disabled
                    className={`${base} cursor-not-allowed border border-input opacity-50`}
                  >
                    <MessageCircle className="size-4" />
                    {a.label}
                  </span>
                )
              }
              return (
                <a
                  key={a.label}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${base} ${tone}`}
                >
                  <MessageCircle className="size-4" />
                  {a.label}
                </a>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
