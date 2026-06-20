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
import {
  importAssets,
  type ImportAssetsInput,
} from "@/modules/service/application/use-cases/import-assets"
import { listAssets } from "@/modules/service/application/use-cases/list-assets"
import {
  updateAsset,
  type UpdateAssetInput,
} from "@/modules/service/application/use-cases/update-asset"
import {
  changeWorkOrderStatus,
  type ChangeWorkOrderStatusInput,
} from "@/modules/service/application/use-cases/change-work-order-status"
import {
  setWorkOrderBillable,
  type SetWorkOrderBillableInput,
} from "@/modules/service/application/use-cases/set-work-order-billable"
import {
  approveWorkOrderBilling,
  type ApproveWorkOrderBillingInput,
} from "@/modules/service/application/use-cases/approve-work-order-billing"
import {
  createWorkOrder,
  type CreateWorkOrderInput,
} from "@/modules/service/application/use-cases/create-work-order"
import {
  createWorkOrderFromQuote,
  type CreateWorkOrderFromQuoteInput,
} from "@/modules/service/application/use-cases/create-work-order-from-quote"
import { listWorkOrders } from "@/modules/service/application/use-cases/list-work-orders"
import {
  updateWorkOrder,
  type UpdateWorkOrderInput,
} from "@/modules/service/application/use-cases/update-work-order"
import {
  createTechnician,
  type CreateTechnicianInput,
} from "@/modules/service/application/use-cases/create-technician"
import {
  deactivateTechnician,
  type DeactivateTechnicianInput,
} from "@/modules/service/application/use-cases/deactivate-technician"
import { getTechnicianStats } from "@/modules/service/application/use-cases/get-technician-stats"
import { listTechnicians } from "@/modules/service/application/use-cases/list-technicians"
import {
  updateTechnician,
  type UpdateTechnicianInput,
} from "@/modules/service/application/use-cases/update-technician"
import { archiveSkill, type ArchiveSkillInput } from "@/modules/service/application/use-cases/archive-skill"
import { assignTechnicianSkill, type AssignTechnicianSkillInput } from "@/modules/service/application/use-cases/assign-technician-skill"
import { createSkill, type CreateSkillInput } from "@/modules/service/application/use-cases/create-skill"
import { setSkillAliases, type SetSkillAliasesInput } from "@/modules/service/application/use-cases/set-skill-aliases"
import { setSkillIncidentTypes, type SetSkillIncidentTypesInput } from "@/modules/service/application/use-cases/set-skill-incident-types"
import { createIssueType, type CreateIssueTypeInput } from "@/modules/service/application/use-cases/create-issue-type"
import { updateIssueType, type UpdateIssueTypeInput } from "@/modules/service/application/use-cases/update-issue-type"
import { removeTechnicianSkill, type RemoveTechnicianSkillInput } from "@/modules/service/application/use-cases/remove-technician-skill"
import {
  addAvailabilityException,
  addAvailabilityWindow,
  removeAvailabilityException,
  removeAvailabilityWindow,
  setTechnicianCapacity,
  type AddExceptionInput,
  type AddWindowInput,
  type RemoveExceptionInput,
  type RemoveWindowInput,
  type SetCapacityInput,
} from "@/modules/service/application/use-cases/availability-use-cases"
import { archiveZone, type ArchiveZoneInput } from "@/modules/service/application/use-cases/archive-zone"
import { assignTechnicianZone, type AssignTechnicianZoneInput } from "@/modules/service/application/use-cases/assign-technician-zone"
import { createZone, type CreateZoneInput } from "@/modules/service/application/use-cases/create-zone"
import { removeTechnicianZone, type RemoveTechnicianZoneInput } from "@/modules/service/application/use-cases/remove-technician-zone"
import { SupabaseAssetRepository } from "@/modules/service/infrastructure/supabase-asset-repository"
import { SupabaseCaseRepository } from "@/modules/service/infrastructure/supabase-case-repository"
import { SupabaseSkillRepository } from "@/modules/service/infrastructure/supabase-skill-repository"
import { SupabaseIssueTypeRepository } from "@/modules/service/infrastructure/supabase-issue-type-repository"
import { SupabaseTechnicianRepository } from "@/modules/service/infrastructure/supabase-technician-repository"
import { SupabaseAvailabilityRepository } from "@/modules/service/infrastructure/supabase-availability-repository"
import { SupabaseZoneRepository } from "@/modules/service/infrastructure/supabase-zone-repository"
import { SupabaseWorkOrderRepository } from "@/modules/service/infrastructure/supabase-work-order-repository"
import type { AssetFilters } from "@/modules/service/domain/asset"
import type { CaseFilters } from "@/modules/service/domain/case"
import type {
  TechnicianFilters,
  TechnicianSort,
} from "@/modules/service/domain/technician"
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

function technicianRepo() {
  return new SupabaseTechnicianRepository()
}

function skillRepo() {
  return new SupabaseSkillRepository()
}

function issueTypeRepo() {
  return new SupabaseIssueTypeRepository()
}

function zoneRepo() {
  return new SupabaseZoneRepository()
}

function availabilityRepo() {
  return new SupabaseAvailabilityRepository()
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

export function importAssetRecords(input: ImportAssetsInput) {
  return importAssets({ assets: assetRepo(), audit: audit() }, input)
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

export function createWorkOrderFromQuoteRecord(
  input: CreateWorkOrderFromQuoteInput,
) {
  return createWorkOrderFromQuote(
    { workOrders: workOrderRepo(), audit: audit() },
    input,
  )
}

export function setWorkOrderRecordBillable(input: SetWorkOrderBillableInput) {
  return setWorkOrderBillable(
    { workOrders: workOrderRepo(), audit: audit() },
    input,
  )
}

export function approveWorkOrderRecordBilling(
  input: ApproveWorkOrderBillingInput,
) {
  return approveWorkOrderBilling(
    { workOrders: workOrderRepo(), audit: audit() },
    input,
  )
}


// --- Technicians -----------------------------------------------------------
export function listTenantTechnicians(
  tenantId: UUID,
  filters: TechnicianFilters,
  sort: TechnicianSort,
  page: number,
  pageSize: number,
) {
  return listTechnicians(technicianRepo(), tenantId, filters, sort, page, pageSize)
}

export function getTechnicianRecord(tenantId: UUID, id: UUID) {
  return technicianRepo().getById(tenantId, id)
}

export function getTenantTechnicianStats(tenantId: UUID) {
  return getTechnicianStats(technicianRepo(), tenantId)
}

export function createTechnicianRecord(input: CreateTechnicianInput) {
  return createTechnician({ technicians: technicianRepo(), audit: audit() }, input)
}

export function updateTechnicianRecord(input: UpdateTechnicianInput) {
  return updateTechnician({ technicians: technicianRepo(), audit: audit() }, input)
}

export function deactivateTechnicianRecord(input: DeactivateTechnicianInput) {
  return deactivateTechnician(
    { technicians: technicianRepo(), audit: audit() },
    input,
  )
}

// --- Skills (PR3A) ---------------------------------------------------------
export function listTenantSkills(tenantId: UUID) {
  return skillRepo().listSkills(tenantId)
}

export function listTechnicianSkillsRecord(tenantId: UUID, technicianId: UUID) {
  return skillRepo().listTechnicianSkills(tenantId, technicianId)
}

export function createSkillRecord(input: CreateSkillInput) {
  return createSkill({ skills: skillRepo(), audit: audit() }, input)
}

export function setSkillAliasesRecord(input: SetSkillAliasesInput) {
  return setSkillAliases({ skills: skillRepo(), audit: audit() }, input)
}

export function setSkillIncidentTypesRecord(input: SetSkillIncidentTypesInput) {
  return setSkillIncidentTypes({ skills: skillRepo(), audit: audit() }, input)
}

// --- Issue Types (catálogo operacional estructurado) -----------------------
export function listTenantIssueTypes(tenantId: UUID) {
  return issueTypeRepo().listByTenant(tenantId)
}

export function listActiveIssueTypesForSkill(tenantId: UUID, skillId: UUID) {
  return issueTypeRepo().listActiveBySkill(tenantId, skillId)
}

export function createIssueTypeRecord(input: CreateIssueTypeInput) {
  return createIssueType({ issueTypes: issueTypeRepo(), audit: audit() }, input)
}

export function updateIssueTypeRecord(input: UpdateIssueTypeInput) {
  return updateIssueType({ issueTypes: issueTypeRepo(), audit: audit() }, input)
}

export function archiveSkillRecord(input: ArchiveSkillInput) {
  return archiveSkill({ skills: skillRepo(), audit: audit() }, input)
}

export function assignTechnicianSkillRecord(input: AssignTechnicianSkillInput) {
  return assignTechnicianSkill({ skills: skillRepo(), audit: audit() }, input)
}

export function removeTechnicianSkillRecord(input: RemoveTechnicianSkillInput) {
  return removeTechnicianSkill({ skills: skillRepo(), audit: audit() }, input)
}

// --- Zones (PR3C) ----------------------------------------------------------
export function listTenantZones(tenantId: UUID) {
  return zoneRepo().listZones(tenantId)
}

export function listTechnicianZonesRecord(tenantId: UUID, technicianId: UUID) {
  return zoneRepo().listTechnicianZones(tenantId, technicianId)
}

export function createZoneRecord(input: CreateZoneInput) {
  return createZone({ zones: zoneRepo(), audit: audit() }, input)
}

export function archiveZoneRecord(input: ArchiveZoneInput) {
  return archiveZone({ zones: zoneRepo(), audit: audit() }, input)
}

export function assignTechnicianZoneRecord(input: AssignTechnicianZoneInput) {
  return assignTechnicianZone({ zones: zoneRepo(), audit: audit() }, input)
}

export function removeTechnicianZoneRecord(input: RemoveTechnicianZoneInput) {
  return removeTechnicianZone({ zones: zoneRepo(), audit: audit() }, input)
}

// --- Availability & capacity (PR3B) ----------------------------------------
export function listTechnicianAvailability(tenantId: UUID, technicianId: UUID) {
  return availabilityRepo().listWindows(tenantId, technicianId)
}

export function listTechnicianExceptions(tenantId: UUID, technicianId: UUID) {
  return availabilityRepo().listExceptions(tenantId, technicianId)
}

export function getTechnicianCapacity(tenantId: UUID, technicianId: UUID) {
  return availabilityRepo().getCapacity(tenantId, technicianId)
}

function availabilityDeps() {
  return { availability: availabilityRepo(), audit: audit() }
}

export function addAvailabilityWindowRecord(input: AddWindowInput) {
  return addAvailabilityWindow(availabilityDeps(), input)
}
export function removeAvailabilityWindowRecord(input: RemoveWindowInput) {
  return removeAvailabilityWindow(availabilityDeps(), input)
}
export function addAvailabilityExceptionRecord(input: AddExceptionInput) {
  return addAvailabilityException(availabilityDeps(), input)
}
export function removeAvailabilityExceptionRecord(input: RemoveExceptionInput) {
  return removeAvailabilityException(availabilityDeps(), input)
}
export function setTechnicianCapacityRecord(input: SetCapacityInput) {
  return setTechnicianCapacity(availabilityDeps(), input)
}

// ── Public work intake (anonymous report → Case) ─────────────────────────────
export {
  getPublicReportTarget,
  getPublicReportContext,
  submitPublicReport,
  type PublicReportInput,
  type PublicReportCategory,
} from "@/modules/service/infrastructure/supabase-public-intake-repository"

// ── Línea de vida (seguimiento público + detalle de WO) ──────────────────────
export {
  getPublicTracking,
  getWorkOrderLifecycle,
  type PublicTrackingView,
} from "@/modules/service/infrastructure/supabase-service-lifecycle-repository"
