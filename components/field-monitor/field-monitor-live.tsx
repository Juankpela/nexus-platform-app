"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"

// Subscribes to the tenant's Field Monitor broadcast channel and refreshes the
// server-rendered board whenever a technician advances their execution. Uses
// Supabase Broadcast (not postgres_changes) so no DB publication is required.
export function FieldMonitorLive({
  tenantId,
  generatedAt,
}: {
  tenantId: string
  generatedAt: string
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
      {connected ? "En vivo" : "Conectando…"}
      <span className="ml-1 tabular-nums opacity-60">
        {new Date(generatedAt).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    </span>
  )
}
