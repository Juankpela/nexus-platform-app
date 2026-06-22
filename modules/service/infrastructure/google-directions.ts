import "server-only"

import { parseDirectionsResult } from "@/modules/service/domain/eta"

const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"

/**
 * Calcula duración (con tráfico) y distancia entre el técnico (origen) y el sitio
 * del servicio (destino) con Google Directions API.
 *
 * BEST-EFFORT por diseño: devuelve null ante cualquier fallo (sin key, timeout,
 * error de red, status≠OK) y NUNCA lanza. Sin ETA la operación sigue igual.
 * `departure_time=now` pide la duración considerando tráfico actual.
 */
export async function computeDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{ durationMinutes: number; distanceM: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null

  const url = new URL(DIRECTIONS_URL)
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`)
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`)
  url.searchParams.set("departure_time", "now")
  url.searchParams.set("region", "co")
  url.searchParams.set("key", key)

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    return parseDirectionsResult(await res.json())
  } catch {
    return null
  }
}
