"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { formatTime } from "@/lib/format/datetime"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"

// Subscribes to the tenant's Field Monitor broadcast channel and refreshes the
// server-rendered board whenever a technician advances their execution. Uses
// Supabase Broadcast (not postgres_changes) so no DB publication is required.
export function FieldMonitorLive({
  tenantId,
  generatedAt,
  connectedLabel = "En vivo",
  connectingLabel = "Conectando…",
  showClock = true,
}: {
  tenantId: string
  generatedAt: string
  /** Etiquetas configurables para reusar el indicador en la página del cliente. */
  connectedLabel?: string
  connectingLabel?: string
  showClock?: boolean
}) {
  const router = useRouter()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`field-monitor:${tenantId}`)
      .on("broadcast", { event: "execution_changed" }, () => {
        router.refresh()
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED")
      })

    // Safety net: refresh periodically in case a broadcast is missed.
    const interval = setInterval(() => router.refresh(), 30_000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [tenantId, router])

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-2 rounded-full",
          connected ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
      {connected ? connectedLabel : connectingLabel}
      {showClock ? (
        <span className="ml-1 tabular-nums opacity-60">
          {formatTime(generatedAt, { second: "2-digit" })}
        </span>
      ) : null}
    </span>
  )
}
