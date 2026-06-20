"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import type { Notification } from "@/modules/notifications/domain/notification"
import {
  markAllNotificationsReadAction,
  type NotificationActionState,
} from "@/modules/notifications/presentation/notification-actions"

const initialState: NotificationActionState = { ok: false }

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  })
}

export function NotificationBell({
  tenantSlug,
  notifications,
  unreadCount,
}: {
  tenantSlug: string
  notifications: Notification[]
  unreadCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, markAllAction, pending] = useActionState(
    markAllNotificationsReadAction,
    initialState,
  )

  const seen = useRef(false)
  useEffect(() => {
    if (state.ok && !seen.current) {
      seen.current = true
      router.refresh()
    }
    if (!state.ok) seen.current = false
  }, [state.ok, router])

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border bg-card shadow-soft-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">Notificaciones</span>
              {unreadCount > 0 ? (
                <form action={markAllAction}>
                  <input type="hidden" name="tenantSlug" value={tenantSlug} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Marcar todas leídas
                  </button>
                </form>
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sin notificaciones.
                </p>
              ) : (
                notifications.map((n) => {
                  const href = n.link ? `/app/${tenantSlug}/${n.link}` : null
                  const body = (
                    <div
                      className={`flex gap-2 px-3 py-2.5 text-sm ${n.readAt ? "" : "bg-primary/5"}`}
                    >
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-primary"}`}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">{n.title}</span>
                        {n.body ? (
                          <span className="block truncate text-muted-foreground">{n.body}</span>
                        ) : null}
                        <span className="block text-[11px] text-muted-foreground/70">{fmt(n.createdAt)}</span>
                      </span>
                    </div>
                  )
                  return href ? (
                    <Link key={n.id} href={href} onClick={() => setOpen(false)} className="block hover:bg-muted/40">
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id}>{body}</div>
                  )
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
