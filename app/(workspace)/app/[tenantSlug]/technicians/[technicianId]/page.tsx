import { Award, ArrowLeft, CheckCircle2, Clock, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { TechnicianDeactivateButton } from "@/components/service/technician-deactivate-button"
import { TechnicianFormDialog } from "@/components/service/technician-form-dialog"
import { TechnicianAvailabilityCard } from "@/components/service/technician-availability-card"
import { TechnicianSkillsCard } from "@/components/service/technician-skills-card"
import { TechnicianZonesCard } from "@/components/service/technician-zones-card"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getTechnicianCapacity,
  getTechnicianRecord,
  listTechnicianAvailability,
  listTechnicianExceptions,
  listTechnicianSkillsRecord,
  listTechnicianZonesRecord,
  listTenantSkills,
  listTenantZones,
} from "@/modules/service/composition"
import {
  TECHNICIAN_STATUS_LABELS,
  technicianFullName,
  type TechnicianStatus,
} from "@/modules/service/domain/technician"
import { getTenantTechnicianOutcomes } from "@/modules/dispatch/composition"
import {
  hasReliableOutcomes,
  type TechnicianOutcome,
} from "@/modules/dispatch/domain/technician-outcomes"
import { formatDate } from "@/lib/format/datetime"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Técnico" }

const statusStyles: Record<TechnicianStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  on_leave: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  )
}

function FuturePanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Award
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function OutcomeStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold text-foreground">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** Récord de cumplimiento histórico (PR-B): credibilidad del técnico, sin scores. */
function OutcomeCard({ outcome }: { outcome: TechnicianOutcome | undefined }) {
  if (!outcome || outcome.resolvedCount === 0) {
    return (
      <FuturePanel
        icon={CheckCircle2}
        title="Récord de cumplimiento"
        description="Aún sin trabajos resueltos. El historial aparece cuando el técnico cierra su primer servicio."
      />
    )
  }

  const successPct =
    outcome.successRate === null ? null : Math.round(outcome.successRate * 100)
  const avgMinutes =
    outcome.avgWorkMinutes === null ? null : Math.round(outcome.avgWorkMinutes)
  const reliable = hasReliableOutcomes(outcome)

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        Récord de cumplimiento
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OutcomeStat
          label="Completados"
          value={String(outcome.completedCount)}
          hint={`${outcome.resolvedCount} resueltos en total`}
        />
        <OutcomeStat
          label="Tasa de éxito"
          value={successPct === null ? "—" : `${successPct}%`}
          hint={reliable ? undefined : "Muestra pequeña"}
        />
        <OutcomeStat
          label="Tiempo promedio"
          value={avgMinutes === null ? "—" : `${avgMinutes} min`}
          hint="En sitio, por trabajo"
        />
        <OutcomeStat
          label="Último cierre"
          value={outcome.lastCompletedAt ? formatDate(outcome.lastCompletedAt) : "—"}
        />
      </dl>
      {outcome.unableCount > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {outcome.unableCount} trabajo(s) no completado(s) — contexto para coordinar mejor.
        </p>
      ) : null}
    </div>
  )
}

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; technicianId: string }>
}) {
  const { tenantSlug, technicianId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.techniciansRead,
  )

  const technician = await getTechnicianRecord(context.tenantId, technicianId)
  if (!technician || technician.deletedAt) notFound()

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.techniciansWrite,
  )

  const [
    catalog,
    technicianSkills,
    zoneCatalog,
    technicianZones,
    availabilityWindows,
    availabilityExceptions,
    capacity,
    outcomes,
  ] = await Promise.all([
    listTenantSkills(context.tenantId),
    listTechnicianSkillsRecord(context.tenantId, technician.id),
    listTenantZones(context.tenantId),
    listTechnicianZonesRecord(context.tenantId, technician.id),
    listTechnicianAvailability(context.tenantId, technician.id),
    listTechnicianExceptions(context.tenantId, technician.id),
    getTechnicianCapacity(context.tenantId, technician.id),
    getTenantTechnicianOutcomes(context.tenantId),
  ])
  const outcome = outcomes.get(technician.id)

  return (
    <>
      <PageHeader
        title={technicianFullName(technician)}
        description="Ficha del técnico de campo."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/app/${tenantSlug}/technicians`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Técnicos
          </Link>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <TechnicianFormDialog
                tenantSlug={tenantSlug}
                technician={technician}
                trigger={
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                }
              />
              <TechnicianDeactivateButton tenantSlug={tenantSlug} id={technician.id} />
            </div>
          ) : null}
        </div>

        {/* Basic info */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Información básica</h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[technician.status]}`}
            >
              {TECHNICIAN_STATUS_LABELS[technician.status]}
            </span>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Nombre" value={technician.firstName} />
            <Detail label="Apellido" value={technician.lastName} />
            <Detail label="Email" value={technician.email} />
            <Detail label="Teléfono" value={technician.phone} />
            <Detail label="ID de empleado" value={technician.employeeId} />
            <Detail
              label="Creado"
              value={new Date(technician.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
            />
            <Detail
              label="Última actualización"
              value={new Date(technician.updatedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
            />
          </dl>
        </div>

        {/* Skills (PR3A) */}
        <TechnicianSkillsCard
          tenantSlug={tenantSlug}
          technicianId={technician.id}
          catalog={catalog}
          technicianSkills={technicianSkills}
          canWrite={canWrite}
        />

        {/* Zones / coverage (PR3C) */}
        <TechnicianZonesCard
          tenantSlug={tenantSlug}
          technicianId={technician.id}
          catalog={zoneCatalog}
          technicianZones={technicianZones}
          canWrite={canWrite}
        />

        {/* Availability & capacity (PR3B) */}
        <TechnicianAvailabilityCard
          tenantSlug={tenantSlug}
          technicianId={technician.id}
          windows={availabilityWindows}
          exceptions={availabilityExceptions}
          capacity={capacity}
          canWrite={canWrite}
        />

        {/* Récord de cumplimiento histórico (PR-B) — credibilidad real del técnico. */}
        <OutcomeCard outcome={outcome} />

        {/* Future Field Service sections (structure ready, not yet implemented) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <FuturePanel
            icon={Award}
            title="Certificaciones"
            description="Próximamente: certificaciones y vencimientos para cumplimiento."
          />
          <FuturePanel
            icon={Wrench}
            title="Órdenes asignadas"
            description="Próximamente: órdenes de trabajo asignadas y carga de trabajo del técnico."
          />
        </div>
      </div>
    </>
  )
}
