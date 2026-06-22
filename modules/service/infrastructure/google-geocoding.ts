import "server-only"

import {
  looksLikeServiceAddress,
  parseGeocodeResult,
  type GeocodeResult,
} from "@/modules/service/domain/geocode"

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
/** Cota defensiva: una dirección legítima no necesita más; acota abuso/costo. */
const MAX_ADDRESS_LEN = 200

/**
 * Geocodifica una dirección del sitio del servicio con Google Geocoding API.
 *
 * BEST-EFFORT por diseño: devuelve null ante cualquier fallo (sin key, dirección
 * vacía, timeout, error de red, status≠OK) y NUNCA lanza. Un caso siempre puede
 * crearse aunque el ETA no esté disponible. Bias a Colombia
 * (`components=country:CO`, `region=co`) para precisión con direcciones locales.
 */
export async function geocodeServiceAddress(address: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  const clean = address.trim().slice(0, MAX_ADDRESS_LEN)
  if (!key || !clean) return null
  // No preguntamos a Google por texto que no parece una dirección física: evita
  // resultados basura (centroide del país) guardados como destino "confiable".
  if (!looksLikeServiceAddress(clean)) return null

  const url = new URL(GEOCODE_URL)
  url.searchParams.set("address", clean)
  url.searchParams.set("components", "country:CO")
  url.searchParams.set("region", "co")
  url.searchParams.set("key", key)

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    return parseGeocodeResult(await res.json())
  } catch {
    return null
  }
}
