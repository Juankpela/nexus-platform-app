/**
 * ETA del técnico hacia el sitio del servicio — modelo de dominio PURO (sin red).
 *
 * Aísla el parseo de la respuesta de Google Directions y el ensamblado del objeto
 * ETA, para poder testearlo sin tocar la red. best-effort: ante datos faltantes o
 * inválidos devuelve null → no se muestra ETA y la operación sigue igual.
 */
export type Eta = {
  durationMinutes: number
  /** Hora estimada de llegada (ISO). */
  arrivalAt: string
  /** Instante en que se calculó (ISO). */
  computedAt: string
  distanceM: number
  source: "google_directions"
}

type DirectionsResponse = {
  status?: string
  routes?: Array<{
    legs?: Array<{
      duration?: { value?: number } // segundos
      duration_in_traffic?: { value?: number } // segundos (si departure_time=now)
      distance?: { value?: number } // metros
    }>
  }>
}

/**
 * Extrae duración (minutos, prefiere la de tráfico) y distancia (metros) del primer
 * leg de la primera ruta. Devuelve null si el status no es OK o faltan los valores.
 */
export function parseDirectionsResult(
  json: unknown,
): { durationMinutes: number; distanceM: number } | null {
  const body = json as DirectionsResponse | null
  if (!body || body.status !== "OK") return null
  const leg = body.routes?.[0]?.legs?.[0]
  const seconds = leg?.duration_in_traffic?.value ?? leg?.duration?.value
  const meters = leg?.distance?.value
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) return null
  return { durationMinutes: Math.round(seconds / 60), distanceM: meters }
}

/** Arma el objeto Eta a partir de duración/distancia y el instante de cómputo. */
export function buildEta(
  parsed: { durationMinutes: number; distanceM: number },
  computedAtIso: string,
): Eta {
  const arrival = new Date(
    new Date(computedAtIso).getTime() + parsed.durationMinutes * 60_000,
  )
  return {
    durationMinutes: parsed.durationMinutes,
    arrivalAt: arrival.toISOString(),
    computedAt: computedAtIso,
    distanceM: parsed.distanceM,
    source: "google_directions",
  }
}

/**
 * Regla de UI (condición aprobada): si la hora estimada de llegada YA PASÓ respecto
 * a `nowIso`, el ETA se oculta (devuelve null). Si sigue vigente, devuelve el Eta.
 * Pura y reutilizable por todas las superficies (worker, cliente, centro operacional).
 */
export function etaIfCurrent(eta: Eta | null | undefined, nowIso: string): Eta | null {
  if (!eta) return null
  return new Date(eta.arrivalAt).getTime() > new Date(nowIso).getTime() ? eta : null
}
