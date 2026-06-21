/**
 * Geocoding del sitio del servicio — modelo de dominio PURO (sin red).
 *
 * Aísla el parseo de la respuesta de Google Geocoding para poder testearlo sin
 * tocar la red. El intake lo usa cuando el reportante NO está en el sitio
 * (camino B): la dirección escrita se geocodifica y, si resuelve, fija las
 * coordenadas del destino del ETA. Sin scores ni heurísticas: tomamos el primer
 * resultado y mostramos/guardamos su dirección normalizada.
 */
export type GeocodeResult = {
  lat: number
  lng: number
  formattedAddress: string
}

type GoogleGeocodeResponse = {
  status?: string
  results?: Array<{
    formatted_address?: string
    geometry?: { location?: { lat?: number; lng?: number } }
  }>
}

/**
 * Extrae el mejor resultado (results[0]) de una respuesta de Google Geocoding.
 * Devuelve null si el status no es "OK", no hay resultados, o las coordenadas
 * están ausentes / fuera de rango. Best-effort: null nunca bloquea la creación
 * del caso (el ETA es una capacidad adicional, no una condición para operar).
 */
export function parseGeocodeResult(json: unknown): GeocodeResult | null {
  const body = json as GoogleGeocodeResponse | null
  if (!body || body.status !== "OK") return null
  const first = body.results?.[0]
  const loc = first?.geometry?.location
  const lat = loc?.lat
  const lng = loc?.lng
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return {
    lat,
    lng,
    formattedAddress: first?.formatted_address?.trim() || "",
  }
}
