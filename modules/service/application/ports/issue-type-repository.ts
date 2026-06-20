import type {
  IssueType,
  IssueTypeInput,
  IssueTypePatch,
} from "@/modules/service/domain/issue-type"
import type { UUID } from "@/types/shared"

export interface IssueTypeRepository {
  /** Todos los tipos de daño del tenant (activos + inactivos), para gestión. */
  listByTenant(tenantId: UUID): Promise<IssueType[]>
  /** Tipos ACTIVOS de una skill, en orden de despliegue (reporte guiado). */
  listActiveBySkill(tenantId: UUID, skillId: UUID): Promise<IssueType[]>
  create(tenantId: UUID, input: IssueTypeInput): Promise<IssueType>
  update(tenantId: UUID, id: UUID, patch: IssueTypePatch): Promise<void>
}
