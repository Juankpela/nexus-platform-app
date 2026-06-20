import type { UUID } from "@/types/shared"

/**
 * Tipo de daño (issue type) — entidad estructurada del catálogo operacional del
 * tenant. Cada uno pertenece a UNA skill. Es el vocabulario controlado que el
 * reporte guiado ofrece (Paso 2) y que el caso guarda como `issue_type_id`
 * (fuente de verdad, no texto libre). Pilar 1: entender el problema.
 */
export type IssueType = {
  id: UUID
  skillId: UUID
  /** Nombre de la skill (categoría) — denormalizado para listados/agrupación. */
  skillName: string | null
  name: string
  description: string | null
  active: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type IssueTypeInput = {
  skillId: UUID
  name: string
  description?: string | null
  displayOrder?: number
}

export type IssueTypePatch = {
  name?: string
  description?: string | null
  active?: boolean
  displayOrder?: number
}

/** Agrupa una lista plana de issue types por skill, preservando el orden recibido. */
export function groupIssueTypesBySkill(
  issueTypes: IssueType[],
): Map<UUID, IssueType[]> {
  const grouped = new Map<UUID, IssueType[]>()
  for (const it of issueTypes) {
    const bucket = grouped.get(it.skillId)
    if (bucket) bucket.push(it)
    else grouped.set(it.skillId, [it])
  }
  return grouped
}
