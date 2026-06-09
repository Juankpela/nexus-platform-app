import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  assignCaseOwner,
  type AssignCaseOwnerInput,
} from "@/modules/service/application/use-cases/assign-case-owner"
import {
  changeCaseStatus,
  type ChangeCaseStatusInput,
} from "@/modules/service/application/use-cases/change-case-status"
import {
  createCase,
  type CreateCaseInput,
} from "@/modules/service/application/use-cases/create-case"
import { listCases } from "@/modules/service/application/use-cases/list-cases"
import {
  updateCase,
  type UpdateCaseInput,
} from "@/modules/service/application/use-cases/update-case"
import {
  changeAssetStatus,
  type ChangeAssetStatusInput,
} from "@/modules/service/application/use-cases/change-asset-status"
import {
  createAsset,
  type CreateAssetInput,
} from "@/modules/service/application/use-cases/create-asset"
import { listAssets } from "@/modules/service/application/use-cases/list-assets"
import {
  updateAsset,
  type UpdateAssetInput,
} from "@/modules/service/application/use-cases/update-asset"
import {
  assignWorkOrderTechnician,
  type AssignWorkOrderTechnicianInput,
} from "@/modules/service/application/use-cases/assign-work-order-technician"
import {
  changeWorkOrderStatus,
  type ChangeWorkOrderStatusInput,
} from "@/modules/service/application/use-cases/change-work-order-status"
import {
  createWorkOrder,
  type CreateWorkOrderInput,
} from "@/modules/service/application/use-cases/create-work-order"
import { listWorkOrders } from "@/modules/service/application/use-cases/list-work-orders"
import {
  updateWorkOrder,
  type UpdateWorkOrderInput,
} from "@/modules/service/application/use-cases/update-work-order"
import { SupabaseAssetRepository } from "@/modules/service/infrastructure/supabase-asset-repository"
import { SupabaseCaseRepository } from "@/modules/service/infrastructure/supabase-case-repository"
import { SupabaseWorkOrderRepository } from "@/modules/service/infrastructure/supabase-work-order-repository"
import type { AssetFilters } from "@/modules/service/domain/asset"
import type { CaseFilters } from "@/modules/service/domain/case"
import type { WorkOrderFilters } from "@/modules/service/domain/work-order"
import type { UUID } from "@/types/shared"

function caseRepo() {
  return new SupabaseCaseRepository()
}

function assetRepo() {
  return new SupabaseAssetRepository()
}

function workOrderRepo() {
  return new SupabaseWorkOrderRepository()
}

function audit() {
  return new SupabaseAuditRepository()
}

export function listTenantCases(
  tenantId: UUID,
  filters: CaseFilters,
  page: number,
  pageSize: number,
) {
  return listCases(caseRepo(), tenantId, filters, page, pageSize)
}

export function getCaseRecord(tenantId: UUID, id: UUID) {
  return caseRepo().getById(tenantId, id)
}

export function getTenantCaseStats(tenantId: UUID) {
  return caseRepo().getStats(tenantId)
}

export function createCaseRecord(input: CreateCaseInput) {
  return createCase({ cases: caseRepo(), audit: audit() }, input)
}

export function updateCaseRecord(input: UpdateCaseInput) {
  return updateCase({ cases: caseRepo(), audit: audit() }, input)
}

export function changeCaseRecordStatus(input: ChangeCaseStatusInput) {
  return changeCaseStatus({ cases: caseRepo(), audit: audit() }, input)
}

export function assignCaseRecordOwner(input: AssignCaseOwnerInput) {
  return assignCaseOwner({ cases: caseRepo(), audit: audit() }, input)
}

export function listCasesForAsset(tenantId: UUID, assetId: UUID) {
  return caseRepo().listForAsset(tenantId, assetId)
}

// --- Assets ----------------------------------------------------------------
export function listTenantAssets(
  tenantId: UUID,
  filters: AssetFilters,
  page: number,
  pageSize: number,
) {
  return listAssets(assetRepo(), tenantId, filters, page, pageSize)
}

export function getAssetRecord(tenantId: UUID, id: UUID) {
  return assetRepo().getById(tenantId, id)
}

export function listAssetOptions(tenantId: UUID) {
  return assetRepo().listOptions(tenantId)
}

export function createAssetRecord(input: CreateAssetInput) {
  return createAsset({ assets: assetRepo(), audit: audit() }, input)
}

export function updateAssetRecord(input: UpdateAssetInput) {
  return updateAsset({ assets: assetRepo(), audit: audit() }, input)
}

export function changeAssetRecordStatus(input: ChangeAssetStatusInput) {
  return changeAssetStatus({ assets: assetRepo(), audit: audit() }, input)
}

// --- Work Orders -----------------------------------------------------------
export function listTenantWorkOrders(
  tenantId: UUID,
  filters: WorkOrderFilters,
  page: number,
  pageSize: number,
) {
  return listWorkOrders(workOrderRepo(), tenantId, filters, page, pageSize)
}

export function getWorkOrderRecord(tenantId: UUID, id: UUID) {
  return workOrderRepo().getById(tenantId, id)
}

export function getTenantWorkOrderStats(tenantId: UUID) {
  return workOrderRepo().getStats(tenantId)
}

export function listWorkOrdersForCase(tenantId: UUID, caseId: UUID) {
  return workOrderRepo().listForCase(tenantId, caseId)
}

export function listWorkOrdersForAsset(tenantId: UUID, assetId: UUID) {
  return workOrderRepo().listForAsset(tenantId, assetId)
}

export function getAssetServiceSummary(tenantId: UUID, assetId: UUID) {
  return workOrderRepo().getAssetServiceSummary(tenantId, assetId)
}

export function createWorkOrderRecord(input: CreateWorkOrderInput) {
  return createWorkOrder({ workOrders: workOrderRepo(), audit: audit() }, input)
}

export function updateWorkOrderRecord(input: UpdateWorkOrderInput) {
  return updateWorkOrder({ workOrders: workOrderRepo(), audit: audit() }, input)
}

export function changeWorkOrderRecordStatus(input: ChangeWorkOrderStatusInput) {
  return changeWorkOrderStatus(
    { workOrders: workOrderRepo(), audit: audit() },
    input,
  )
}

export function assignWorkOrderRecordTechnician(
  input: AssignWorkOrderTechnicianInput,
) {
  return assignWorkOrderTechnician(
    { workOrders: workOrderRepo(), audit: audit() },
    input,
  )
}
