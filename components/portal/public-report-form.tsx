"use client"

import { Camera, CheckCircle2, Loader2, MapPin, Send, X } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  submitReportAction,
  type PublicReportState,
} from "@/modules/service/presentation/public-intake-actions"

const initial: PublicReportState = { ok: false, error: null }

const CATEGORIES = [
  "Eléctrico",
  "Plomería / Hidráulico",
  "Estructura / Civil",
  "Aseo / Limpieza",
  "Seguridad",
  "Otro",
]

const labelCls = "text-sm font-medium text-foreground"
const fieldCls = "mt-1.5"

type GeoState = { status: "idle" | "loading" | "done" | "error"; message?: string }

/** Comprime la imagen en el cliente con canvas nativo (sin librerías). */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("decode"))
      img.onload = () => {
        const max = 1024
        let { width, height } = img
        if (width > height && width > max) {
          height = Math.round((height * max) / width)
          width = max
        } else if (height > max) {
          width = Math.round((width * max) / height)
          height = max
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("ctx"))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.55))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function PublicReportForm({ tenantSlug }: { tenantSlug: string }) {
  const [state, formAction, pending] = useActionState(submitReportAction, initial)
  // El campo de ubicación es controlado para poder autocompletarlo con el GPS.
  const [location, setLocation] = useState("")
  const [geo, setGeo] = useState<GeoState>({ status: "idle" })
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<"idle" | "loading" | "error">("idle")

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoStatus("loading")
    try {
      setPhoto(await compressImage(file))
      setPhotoStatus("idle")
    } catch {
      setPhoto(null)
      setPhotoStatus("error")
    }
  }

  function handleUseLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo({ status: "error", message: "Tu dispositivo no permite ubicación. Escríbela abajo." })
      return
    }
    setGeo({ status: "loading" })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const link = `https://maps.google.com/?q=${latitude},${longitude}`
        // Conserva lo que el usuario haya escrito y agrega el enlace de mapa.
        setLocation((prev) => (prev.trim() ? `${prev.trim()} — ${link}` : link))
        setGeo({ status: "done" })
      },
      () =>
        setGeo({
          status: "error",
          message: "No pudimos obtener tu ubicación. Escríbela manualmente abajo.",
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  if (state.ok) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Reporte recibido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guarda tu folio para hacer seguimiento.
        </p>
        <p className="mt-4 inline-block rounded-lg bg-muted px-4 py-2 text-base font-semibold tabular-nums">
          Folio: {state.folio}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-2xl border bg-card p-6 sm:p-8">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="photo" value={photo ?? ""} />
      {/* Honeypot — oculto para humanos, lo llenan los bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4">
        <div>
          <label htmlFor="description" className={labelCls}>¿Qué ocurrió?</label>
          <Textarea id="description" name="description" required rows={3} className={fieldCls} placeholder="Describe la novedad o el daño" />
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="location" className={labelCls}>¿Dónde ocurrió?</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseLocation}
              disabled={geo.status === "loading"}
            >
              {geo.status === "loading" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 size-4" />
              )}
              {geo.status === "done" ? "Ubicación agregada" : "Usar mi ubicación"}
            </Button>
          </div>
          <Input
            id="location"
            name="location"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={fieldCls}
            placeholder="Sede, escenario, dirección o área"
          />
          {geo.status === "error" && geo.message ? (
            <p className="mt-1 text-xs text-muted-foreground">{geo.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="category" className={labelCls}>Categoría</label>
          <select
            id="category"
            name="category"
            defaultValue={CATEGORIES[0]}
            className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <span className={labelCls}>Foto (opcional)</span>
          {photo ? (
            <div className="mt-1.5 flex items-center gap-3">
              {/* data: URL local; next/image no aplica. CSP permite img-src data:. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Evidencia" className="size-16 rounded-lg border object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                <X className="mr-1 size-4" /> Quitar
              </Button>
            </div>
          ) : (
            <label className="mt-1.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm text-muted-foreground hover:bg-muted/40 sm:w-auto sm:px-4">
              {photoStatus === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
          )}
          {photoStatus === "error" ? (
            <p className="mt-1 text-xs text-muted-foreground">No pudimos procesar la imagen. Intenta otra.</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reporterName" className={labelCls}>Nombre</label>
            <Input id="reporterName" name="reporterName" required className={fieldCls} placeholder="Tu nombre" />
          </div>
          <div>
            <label htmlFor="reporterPhone" className={labelCls}>WhatsApp</label>
            <Input id="reporterPhone" name="reporterPhone" className={fieldCls} placeholder="Opcional, para avisarte" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reporterEmail" className={labelCls}>Email</label>
            <Input id="reporterEmail" name="reporterEmail" type="email" className={fieldCls} placeholder="Opcional, para confirmarte la visita" />
          </div>
        </div>

        {!state.ok && state.error ? (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
          Enviar reporte
        </Button>
      </div>
    </form>
  )
}
