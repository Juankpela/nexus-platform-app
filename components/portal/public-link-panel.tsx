"use client"

import { Check, Copy, ExternalLink, MessageCircle, QrCode } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { toQrSvg } from "@/lib/qr/qr"

/**
 * Panel reutilizable que hace VISIBLE el enlace público de reportes de un tenant
 * (`/r/{slug}`). Acciones: copiar, compartir por WhatsApp, descargar QR, abrir el
 * formulario. Todo en cliente, sin dependencias ni servicios externos —
 * reutiliza el patrón `wa.me` ya usado en cotizaciones/facturas y el QR vendido
 * en `lib/qr`.
 */
export function PublicLinkPanel({
  url,
  tenantName,
}: {
  url: string
  tenantName: string
}) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  // El QR se calcula una sola vez por URL (síncrono, barato para una URL corta).
  const qrSvg = useMemo(() => {
    try {
      return toQrSvg(url)
    } catch {
      return null
    }
  }, [url])

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Hola, te comparto el enlace para reportar una novedad o solicitud a ${tenantName}. Puedes incluir foto y ubicación: ${url}`,
  )}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin clipboard API: selección manual como respaldo.
      window.prompt("Copia tu enlace:", url)
    }
  }

  function downloadQr() {
    if (!qrSvg) return
    const blob = new Blob([qrSvg], { type: "image/svg+xml" })
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = "nexus-reportes-qr.svg"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="space-y-3">
      {/* URL grande y legible */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{url}</span>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiado" : "Copiar enlace"}
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" />
            Compartir por WhatsApp
          </a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowQr((v) => !v)}
          disabled={!qrSvg}
        >
          <QrCode className="size-4" />
          {showQr ? "Ocultar QR" : "Ver QR"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Abrir formulario
          </a>
        </Button>
      </div>

      {/* QR + descarga */}
      {showQr && qrSvg ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
          {/* SVG inline (CSP permite img-src data:; aquí va incrustado directo). */}
          <div
            className="size-40 shrink-0 [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            aria-label="Código QR del enlace público de reportes"
            role="img"
          />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Imprímelo o pégalo en tu local. Quien lo escanee abre tu formulario de reportes.
            </p>
            <Button size="sm" variant="outline" onClick={downloadQr}>
              <QrCode className="size-4" />
              Descargar QR
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
