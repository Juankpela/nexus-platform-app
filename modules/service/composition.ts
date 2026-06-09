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
import { SupabaseCaseRepository } from "@/modules/service/infrastructure/supabase-case-repository"
import type { CaseFilters } from "@/modules/service/domain/case"
import type { UUID } from "@/types/shared"

function caseRepo() {
  return new SupabaseCaseRepository()
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
