import type { TechnicianDispatchSnapshot } from "@/modules/scheduling/domain/dispatch-selection"
import type { UUID } from "@/types/shared"

/**
 * Lee los snapshots de técnicos que `dispatch-selection` necesita (ADR-033):
 * skills, zonas, ventanas, excepciones, capacidad, carga del día y los intervalos
 * ocupados (locales) en el horizonte de búsqueda. Solo lectura; NO recalcula
 * elegibilidad (eso lo hace el dominio puro) ni crea motores nuevos.
 */
export interface DispatchCandidateReader {
  listCandidates(
    tenantId: UUID,
    fromDate: string,
    horizonDays: number,
  ): Promise<TechnicianDispatchSnapshot[]>
}
