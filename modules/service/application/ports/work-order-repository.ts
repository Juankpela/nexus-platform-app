import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  WorkOrder,
  WorkOrderFilters,
  WorkOrderInput,
  WorkOrderSlaView,
  WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import type {
  AssetServiceSummary,
  WorkOrderStats,
} from "@/modules/service/domain/work-order-stats"
import type { UUID } from "@/types/shared"

/** Result of generating a Work Order from a Quote (E5 + hardening counts). */
export type CreateFromQuoteResult = {
  workOrder: WorkOrder
  serviceLineCount: number
  productLineCount: number
}

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
  /** Open WOs carrying an SLA deadline — for live SLA-timing views (dispatch card). */
  listOpenWithSla(tenantId: UUID): Promise<WorkOrderSlaView[]>
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
  /** E5 — guard: an existing work order generated from this quote. */
  findByQuote(tenantId: UUID, quoteId: UUID): Promise<WorkOrder | null>
  /** E5 — create a billable work order from an accepted quote (service lines). */
  createFromQuote(
    tenantId: UUID,
    params: { quoteId: UUID; createdBy: UUID; workOrderNumber: string },
  ): Promise<CreateFromQuoteResult>
  nextWorkOrderNumber(tenantId: UUID): Promise<string>
  getStats(tenantId: UUID): Promise<WorkOrderStats>
  getAssetServiceSummary(
    tenantId: UUID,
    assetId: UUID,
  ): Promise<AssetServiceSummary>
}
