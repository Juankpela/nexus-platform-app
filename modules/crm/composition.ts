import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  changeActivityStatus,
  type ChangeActivityStatusInput,
} from "@/modules/crm/application/use-cases/change-activity-status"
import {
  changeCompanyStatus,
  type ChangeCompanyStatusInput,
} from "@/modules/crm/application/use-cases/change-company-status"
import {
  createActivity,
  type CreateActivityInput,
} from "@/modules/crm/application/use-cases/create-activity"
import {
  changeContactStatus,
  type ChangeContactStatusInput,
} from "@/modules/crm/application/use-cases/change-contact-status"
import {
  assignOpportunityOwner,
  type AssignOpportunityOwnerInput,
} from "@/modules/crm/application/use-cases/assign-opportunity-owner"
import {
  changeOpportunityStatus,
  type ChangeOpportunityStatusInput,
} from "@/modules/crm/application/use-cases/change-opportunity-status"
import {
  createOpportunity,
  type CreateOpportunityInput,
} from "@/modules/crm/application/use-cases/create-opportunity"
import { listOpportunities } from "@/modules/crm/application/use-cases/list-opportunities"
import {
  updateOpportunity,
  type UpdateOpportunityInput,
} from "@/modules/crm/application/use-cases/update-opportunity"
import {
  createCompany,
  type CreateCompanyInput,
} from "@/modules/crm/application/use-cases/create-company"
import {
  createContact,
  type CreateContactInput,
} from "@/modules/crm/application/use-cases/create-contact"
import {
  listCompanyActivities,
  listContactActivities,
} from "@/modules/crm/application/use-cases/list-activities"
import { listCompanies } from "@/modules/crm/application/use-cases/list-companies"
import { listContacts } from "@/modules/crm/application/use-cases/list-contacts"
import {
  updateActivity,
  type UpdateActivityInput,
} from "@/modules/crm/application/use-cases/update-activity"
import {
  updateCompany,
  type UpdateCompanyInput,
} from "@/modules/crm/application/use-cases/update-company"
import {
  updateContact,
  type UpdateContactInput,
} from "@/modules/crm/application/use-cases/update-contact"
import { SupabaseActivityRepository } from "@/modules/crm/infrastructure/supabase-activity-repository"
import { SupabaseCompanyRepository } from "@/modules/crm/infrastructure/supabase-company-repository"
import { SupabaseContactRepository } from "@/modules/crm/infrastructure/supabase-contact-repository"
import { SupabaseOpportunityRepository } from "@/modules/crm/infrastructure/supabase-opportunity-repository"
import type { ActivityFilters } from "@/modules/crm/domain/activity"
import type { OpportunityFilters } from "@/modules/crm/domain/opportunity"
import type { ListQuery } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

function companyRepo() {
  return new SupabaseCompanyRepository()
}
function contactRepo() {
  return new SupabaseContactRepository()
}
function activityRepo() {
  return new SupabaseActivityRepository()
}
function opportunityRepo() {
  return new SupabaseOpportunityRepository()
}
function audit() {
  return new SupabaseAuditRepository()
}

// --- Companies -------------------------------------------------------------
export function listTenantCompanies(tenantId: UUID, query: ListQuery) {
  return listCompanies(companyRepo(), tenantId, query)
}

export function listCompanyOptions(tenantId: UUID) {
  return companyRepo().listActiveOptions(tenantId)
}

export function getCompanyRecord(tenantId: UUID, id: UUID) {
  return companyRepo().getById(tenantId, id)
}

export function createCompanyRecord(input: CreateCompanyInput) {
  return createCompany({ companies: companyRepo(), audit: audit() }, input)
}

export function updateCompanyRecord(input: UpdateCompanyInput) {
  return updateCompany({ companies: companyRepo(), audit: audit() }, input)
}

export function changeCompanyRecordStatus(input: ChangeCompanyStatusInput) {
  return changeCompanyStatus({ companies: companyRepo(), audit: audit() }, input)
}

// --- Contacts --------------------------------------------------------------
export function listTenantContacts(tenantId: UUID, query: ListQuery) {
  return listContacts(contactRepo(), tenantId, query)
}

export function getContactRecord(tenantId: UUID, id: UUID) {
  return contactRepo().getById(tenantId, id)
}

export function listContactOptions(tenantId: UUID) {
  return contactRepo().listActiveOptions(tenantId)
}

export function createContactRecord(input: CreateContactInput) {
  return createContact({ contacts: contactRepo(), audit: audit() }, input)
}

export function updateContactRecord(input: UpdateContactInput) {
  return updateContact({ contacts: contactRepo(), audit: audit() }, input)
}

export function changeContactRecordStatus(input: ChangeContactStatusInput) {
  return changeContactStatus({ contacts: contactRepo(), audit: audit() }, input)
}

// --- Activities ------------------------------------------------------------
export function listCompanyActivityTimeline(
  tenantId: UUID,
  companyId: UUID,
  filters: ActivityFilters,
) {
  return listCompanyActivities(activityRepo(), tenantId, companyId, filters)
}

export function listContactActivityTimeline(
  tenantId: UUID,
  contactId: UUID,
  filters: ActivityFilters,
) {
  return listContactActivities(activityRepo(), tenantId, contactId, filters)
}

export function listOpportunityActivityTimeline(
  tenantId: UUID,
  opportunityId: UUID,
  filters: ActivityFilters,
) {
  return activityRepo().listForOpportunity(tenantId, opportunityId, filters)
}

export function createActivityRecord(input: CreateActivityInput) {
  return createActivity({ activities: activityRepo(), audit: audit() }, input)
}

export function updateActivityRecord(input: UpdateActivityInput) {
  return updateActivity({ activities: activityRepo(), audit: audit() }, input)
}

export function changeActivityRecordStatus(input: ChangeActivityStatusInput) {
  return changeActivityStatus(
    { activities: activityRepo(), audit: audit() },
    input,
  )
}

// --- Opportunities ---------------------------------------------------------
export function listTenantOpportunities(
  tenantId: UUID,
  filters: OpportunityFilters,
  page: number,
  pageSize: number,
) {
  return listOpportunities(opportunityRepo(), tenantId, filters, page, pageSize)
}

export function getOpportunityRecord(tenantId: UUID, id: UUID) {
  return opportunityRepo().getById(tenantId, id)
}

export function createOpportunityRecord(input: CreateOpportunityInput) {
  return createOpportunity(
    { opportunities: opportunityRepo(), audit: audit() },
    input,
  )
}

export function updateOpportunityRecord(input: UpdateOpportunityInput) {
  return updateOpportunity(
    { opportunities: opportunityRepo(), audit: audit() },
    input,
  )
}

export function changeOpportunityRecordStatus(
  input: ChangeOpportunityStatusInput,
) {
  return changeOpportunityStatus(
    { opportunities: opportunityRepo(), audit: audit() },
    input,
  )
}

export function assignOpportunityRecordOwner(
  input: AssignOpportunityOwnerInput,
) {
  return assignOpportunityOwner(
    { opportunities: opportunityRepo(), audit: audit() },
    input,
  )
}
