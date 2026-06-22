"use client"

import { useEffect, useState } from "react"

/**
 * Cuenta regresiva del ETA hacia el sitio. Reloj 100% en el cliente: cuenta hacia
 * `arrivalAt` (la hora estimada de llegada ya calculada UNA vez al pulsar "Voy en
 * camino"). NO consulta la posición del técnico ni hace polling — no es tracking,
 * es la representación viva de una única estimación. Al llegar a cero muestra
 * "Llegando". El primer render (SSR e hidratación) usa `fallback` para evitar
 * desajustes de hidratación; el tic arranca tras montar.
 */
export function EtaCountdown({
  arrivalAt,
  fallback,
}: {
  arrivalAt: string
  /** Texto estable mostrado hasta que el reloj del cliente arranca (ej. "~12 min"). */
  fallback: string
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // El primer valor se programa en un callback (no setState síncrono en el
    // cuerpo del efecto) → sin renders en cascada; el reloj refresca cada segundo.
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [])

  // Hasta montar: mismo texto en servidor y cliente → sin mismatch de hidratación.
  if (now === null) return <span className="tabular-nums">{fallback}</span>

  const remainingMs = new Date(arrivalAt).getTime() - now
  if (Number.isNaN(remainingMs) || remainingMs <= 0) {
    return <span className="tabular-nums">Llegando</span>
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return (
    <span className="tabular-nums">
      {m}:{s.toString().padStart(2, "0")}
    </span>
  )
}
