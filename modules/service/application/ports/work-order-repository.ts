import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  WorkOrder,
  WorkOrderFilters,
  WorkOrderInput,
  WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import type {
  AssetServiceSummary,
  WorkOrderStats,
} from "@/modules/service/domain/work-order-stats"
import type { UUID } from "@/types/shared"

export interface WorkOrderRepository {
  list(
    tenantId: UUID,
    filters: WorkOrderFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<WorkOrder>>
  getById(tenantId: UUID, id: UUID): Promise<WorkOrder | null>
  listForCase(tenantId: UUID, caseId: UUID): Promise<WorkOrder[]>
  listForAsset(tenantId: UUID, assetId: UUID): Promise<WorkOrder[]>
  create(
    tenantId: UUID,
    params: { createdBy: UUID; workOrderNumber: string; input: WorkOrderInput },
  ): Promise<WorkOrder>
  update(tenantId: UUID, id: UUID, input: WorkOrderInput): Promise<WorkOrder>
  setStatus(
    tenantId: UUID,
    id: UUID,
    status: WorkOrderStatus,
    timestamps: { actualStart?: string | null; actualEnd?: string | null },
  ): Promise<void>
  setTechnician(
    tenantId: UUID,
    id: UUID,
    technicianId: UUID | null,
  ): Promise<void>
  /** E2-H1 — mark/unmark a work order as billable (resets prior approval). */
  setBillable(tenantId: UUID, id: UUID, billable: boolean): Promise<void>
  /** E2-H3 — record the billing approval (approver + timestamp). */
  approveBilling(
    tenantId: UUID,
    id: UUID,
    approvedBy: UUID,
    approvedAt: string,
  ): Promise<void>
  nextWorkOrderNumber(tenantId: UUID): Promise<string>
  getStats(tenantId: UUID): Promise<WorkOrderStats>
  getAssetServiceSummary(
    tenantId: UUID,
    assetId: UUID,
  ): Promise<AssetServiceSummary>
}
