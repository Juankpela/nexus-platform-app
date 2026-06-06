import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  changeCompanyStatus,
  type ChangeCompanyStatusInput,
} from "@/modules/crm/application/use-cases/change-company-status"
import {
  changeContactStatus,
  type ChangeContactStatusInput,
} from "@/modules/crm/application/use-cases/change-contact-status"
import {
  createCompany,
  type CreateCompanyInput,
} from "@/modules/crm/application/use-cases/create-company"
import {
  createContact,
  type CreateContactInput,
} from "@/modules/crm/application/use-cases/create-contact"
import { listCompanies } from "@/modules/crm/application/use-cases/list-companies"
import { listContacts } from "@/modules/crm/application/use-cases/list-contacts"
import {
  updateCompany,
  type UpdateCompanyInput,
} from "@/modules/crm/application/use-cases/update-company"
import {
  updateContact,
  type UpdateContactInput,
} from "@/modules/crm/application/use-cases/update-contact"
import { SupabaseCompanyRepository } from "@/modules/crm/infrastructure/supabase-company-repository"
import { SupabaseContactRepository } from "@/modules/crm/infrastructure/supabase-contact-repository"
import type { ListQuery } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

function companyRepo() {
  return new SupabaseCompanyRepository()
}
function contactRepo() {
  return new SupabaseContactRepository()
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

export function createContactRecord(input: CreateContactInput) {
  return createContact({ contacts: contactRepo(), audit: audit() }, input)
}

export function updateContactRecord(input: UpdateContactInput) {
  return updateContact({ contacts: contactRepo(), audit: audit() }, input)
}

export function changeContactRecordStatus(input: ChangeContactStatusInput) {
  return changeContactStatus({ contacts: contactRepo(), audit: audit() }, input)
}
