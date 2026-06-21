"use client"

import { Camera, CheckCircle2, Loader2, MapPin, Send, X } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PublicReportCategory } from "@/modules/service/composition"
import {
  submitReportAction,
  type PublicReportState,
} from "@/modules/service/presentation/public-intake-actions"

const initial: PublicReportState = { ok: false, error: null }

const labelCls = "text-sm font-medium text-foreground"
const fieldCls = "mt-1.5"
const selectCls =
  "mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

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

export function PublicReportForm({
  tenantSlug,
  categories,
}: {
  tenantSlug: string
  categories: PublicReportCategory[]
}) {
  const [state, formAction, pending] = useActionState(submitReportAction, initial)
  // Camino A (GPS) vs Camino B (dirección). Por defecto el reportante está en sitio.
  const [atSite, setAtSite] = useState(true)
  // Dirección escrita (camino B). El servidor la geocodifica al enviar.
  const [location, setLocation] = useState("")
  const [geo, setGeo] = useState<GeoState>({ status: "idle" })
  // Coords GPS (camino A). Best-effort: si no se comparten, el caso se crea igual
  // (el ETA es una capacidad adicional, no una condición para operar).
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<"idle" | "loading" | "error">("idle")
  // Paso 1 — categoría (skill). Controla el catálogo del Paso 2.
  const [categoryId, setCategoryId] = useState("")

  const selectedCat = categories.find((c) => c.id === categoryId)
  const isOther = categoryId === "otro"
  const issueTypeOptions = selectedCat?.issueTypes ?? []

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
        const { latitude, longitude, accuracy } = pos.coords
        // Guardamos las coords ESTRUCTURADAS (no las pegamos al texto). El campo de
        // texto queda para la referencia humana (sede/área).
        setCoords({ lat: latitude, lng: longitude, accuracy })
        setGeo({ status: "done" })
      },
      () =>
        setGeo({
          status: "error",
          message:
            "No pudimos obtener tu ubicación. Puedes desmarcar la casilla y escribir la dirección, o enviar igual.",
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
        <a
          href={`/seguimiento/${state.trackingToken}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ver el estado de mi solicitud
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          También te enviaremos este enlace por correo.
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
        {/* Paso 1 — Categoría (desde las skills del tenant) */}
        <div>
          <label htmlFor="categoryId" className={labelCls}>¿Qué tipo de servicio necesitas?</label>
          <select
            id="categoryId"
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>Selecciona una categoría…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Paso 2 — Tipo de daño (catálogo estructurado de la categoría elegida) */}
        {selectedCat && issueTypeOptions.length > 0 ? (
          <div>
            <label htmlFor="issueTypeId" className={labelCls}>¿Qué está pasando?</label>
            <select id="issueTypeId" name="issueTypeId" required className={selectCls} defaultValue="">
              <option value="" disabled>Selecciona el tipo de daño…</option>
              {issueTypeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value="otro">Otro / no estoy seguro</option>
            </select>
          </div>
        ) : null}

        {/* Paso 3 — Descripción (opcional, salvo "Otro") */}
        <div>
          <label htmlFor="description" className={labelCls}>
            Descripción {isOther ? "" : <span className="text-muted-foreground">(opcional)</span>}
          </label>
          <Textarea
            id="description"
            name="description"
            required={isOther}
            rows={3}
            className={fieldCls}
            placeholder="Agrega contexto: ej. el quirófano está a 28° y el equipo no enfría"
          />
        </div>

        {/* Ubicación — Camino A (GPS en sitio) o Camino B (dirección). Best-effort:
            nunca bloquea la creación del caso. */}
        <div>
          <input type="hidden" name="at_site" value={String(atSite)} />
          {/* Coords GPS (camino A); vacías en camino B. La precisión NO se persiste:
              se usa solo para el "±N m" de confirmación al reportante (en memoria). */}
          <input type="hidden" name="service_lat" value={coords?.lat ?? ""} />
          <input type="hidden" name="service_lng" value={coords?.lng ?? ""} />

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={atSite}
              onChange={(e) => {
                const v = e.target.checked
                setAtSite(v)
                // Al cambiar de camino, descartamos coords GPS previas para no mezclar.
                if (!v) {
                  setCoords(null)
                  setGeo({ status: "idle" })
                }
              }}
              className="size-4 rounded border-input accent-primary"
            />
            Estoy en el lugar del reporte
          </label>

          {atSite ? (
            <div className="mt-2">
              <Button
                type="button"
                variant={coords ? "outline" : "default"}
                size="sm"
                onClick={handleUseLocation}
                disabled={geo.status === "loading"}
              >
                {geo.status === "loading" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : coords ? (
                  <CheckCircle2 className="mr-2 size-4" />
                ) : (
                  <MapPin className="mr-2 size-4" />
                )}
                {coords ? "Ubicación compartida" : "Compartir mi ubicación"}
              </Button>
              {coords ? (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  Ubicación compartida · precisión ±{Math.round(coords.accuracy)} m. El técnico
                  llegará exactamente aquí.
                </p>
              ) : geo.status === "error" && geo.message ? (
                <p className="mt-1 text-xs text-muted-foreground">{geo.message}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Comparte tu ubicación para calcular el tiempo de llegada del técnico.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <label htmlFor="location" className={labelCls}>
                Dirección del servicio <span className="text-destructive">*</span>
              </label>
              <Input
                id="location"
                name="location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={fieldCls}
                placeholder="Ej. Cra 43A #5-15 Medellín"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Escribe la dirección del sitio. La usamos para calcular el tiempo de llegada.
              </p>
            </div>
          )}
        </div>

        {/* Foto */}
        <div>
          <span className={labelCls}>Foto (opcional)</span>
          {photo ? (
            <div className="mt-1.5 flex items-center gap-3">
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

        {/* Contacto */}
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
            <Input id="reporterEmail" name="reporterEmail" type="email" required className={fieldCls} placeholder="Te confirmamos la visita y te avisamos cuando el técnico va en camino" />
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
