import { ArrowRight, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ExecutionActions } from "@/components/worker/execution-actions"
import { WorkerOperationalHeader } from "@/components/worker/operational-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  listMyAssignments,
  resolveCurrentTechnician,
} from "@/modules/field-execution/composition"
import {
  EXECUTION_STATUS_LABELS,
  type ExecutionStatus,
} from "@/modules/field-execution/domain/execution"
import { greetingFor } from "@/modules/platform/presentation/mission-control"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { readEnRouteEta } from "@/modules/scheduling/composition"
import { getTechnicianRecord } from "@/modules/service/composition"
import { etaIfCurrent } from "@/modules/service/domain/eta"
import { formatWhen } from "@/modules/service/domain/service-lifecycle"
import { technicianFullName } from "@/modules/service/domain/technician"
import { notifyLinks, type WhatsAppMessageContext } from "@/modules/notifications/domain/whatsapp-link"
import { env } from "@/lib/config/env"

export const metadata: Metadata = { title: "Campo" }

/** Hora corta (ej. "11:54 p. m.") para la llegada estimada del ETA. */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  })
}

const OPEN_STATUSES: ExecutionStatus[] = ["pending", "accepted", "on_site", "working"]
const ACTIVE_STATUSES: ExecutionStatus[] = ["accepted", "on_site", "working"]

function NotLinked() {
  return (
    <div className="rounded-xl border border-dashed bg-card p-8 text-center">
      <p className="text-sm font-medium text-foreground">No estás vinculado como técnico</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Pide a tu supervisor que asocie tu usuario a un técnico para ver tu trabajo.
      </p>
    </div>
  )
}

/**
 * Home del técnico — responde UNA pregunta: ¿qué debo hacer ahora? El HÉROE es la
 * orden actual (cabecera operacional completa + acción dominante, sin entrar al
 * detalle), reutilizando WorkerOperationalHeader + ExecutionActions. Debajo, las
 * siguientes paradas; al pie, saludo y métricas como elementos secundarios.
 */
export default async function WorkerHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.fieldRead)

  const technician = await resolveCurrentTechnician(context.tenantId, context.userId)
  if (!technician) return <NotLinked />

  const assignments = await listMyAssignments(context.tenantId, technician.id)
  const open = assignments.filter((a) => OPEN_STATUSES.includes(a.executionStatus))
  const done = assignments.length - open.length
  // El héroe es la operación EN CURSO si la hay; si no, la próxima por horario.
  const hero =
    open.find((a) => ACTIVE_STATUSES.includes(a.executionStatus)) ?? open[0] ?? null
  const rest = hero ? open.filter((a) => a.assignmentId !== hero.assignmentId) : []
  const base = `/app/${tenantSlug}/worker`

  // ETA real (Fase 3) del héroe: solo si va en camino y la llegada aún no pasó.
  const heroEta = hero
    ? etaIfCurrent(
        await readEnRouteEta(context.tenantId, hero.assignmentId),
        new Date().toISOString(),
      )
    : null
  const heroEnRoute = heroEta
    ? {
        etaLabel: `${heroEta.durationMinutes} min`,
        arrivalLabel: fmtTime(heroEta.arrivalAt),
        arrivalAtIso: heroEta.arrivalAt,
      }
    : null

  // Aviso CONTEXTUAL al cliente por WhatsApp para el héroe (mismo que el detalle):
  // cada paso muestra el mensaje que toca, ya con el ETA si va en camino.
  let heroNotify = null
  if (hero) {
    const techRecord = await getTechnicianRecord(context.tenantId, technician.id)
    const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""
    const waContext: WhatsAppMessageContext = {
      technicianName: techRecord ? technicianFullName(techRecord) : null,
      caseSubject: hero.workOrderSubject ?? "su solicitud",
      workOrderNumber: hero.workOrderNumber,
      whenText: formatWhen(hero.scheduledStart),
      trackingUrl: hero.trackingToken ? `${appUrl}/seguimiento/${hero.trackingToken}` : null,
      etaMinutes: heroEta?.durationMinutes ?? null,
      arrivalText: heroEta ? fmtTime(heroEta.arrivalAt) : null,
    }
    heroNotify = notifyLinks(waContext, hero.reporterPhone)
  }

  return (
    <div className="space-y-6">
      {/* ── 1 · HÉROE — qué debo hacer ahora ──────────────────────────────── */}
      {hero ? (
        <section className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Lo que debes hacer ahora
          </p>
          <WorkerOperationalHeader
            workOrderNumber={hero.workOrderNumber}
            companyName={hero.companyName}
            subject={hero.workOrderSubject}
            issueTypeLabel={hero.issueTypeLabel}
            priority={hero.priority}
            slaDueAt={hero.slaDueAt}
            enRoute={heroEnRoute}
          />
          {/* Acción dominante visible SIN entrar al detalle. */}
          <ExecutionActions
            tenantSlug={tenantSlug}
            assignmentId={hero.assignmentId}
            status={hero.executionStatus}
            notify={heroNotify}
          />
          <Link
            href={`${base}/${hero.assignmentId}`}
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary"
          >
            Ver detalle y línea de vida <ArrowRight className="size-4" />
          </Link>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          No tienes asignaciones abiertas. ¡Buen trabajo!
        </p>
      )}

      {/* ── 2 · SIGUIENTES PARADAS — lista compacta ───────────────────────── */}
      {rest.length > 0 ? (
        <section>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Siguientes paradas · {rest.length}
          </p>
          <ul className="space-y-2">
            {rest.map((a) => (
              <li key={a.assignmentId}>
                <Link
                  href={`${base}/${a.assignmentId}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.workOrderNumber}
                      </span>{" "}
                      · {a.workOrderSubject}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.companyName ?? "—"} · {EXECUTION_STATUS_LABELS[a.executionStatus]}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 3 · SALUDO + MÉTRICAS — secundario, no compite con la orden ────── */}
      <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span>{greetingFor(new Date().getUTCHours())}, esta es tu jornada</span>
        <span className="tabular-nums">
          {open.length} abiertas · {done} cerradas
        </span>
      </div>

      <Link
        href={`${base}/schedule`}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary"
      >
        Ver toda mi agenda <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
