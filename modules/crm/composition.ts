import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  changeProductActive,
  type ChangeProductActiveInput,
} from "@/modules/crm/application/use-cases/change-product-active"
import {
  changePriceBookActive,
  type ChangePriceBookActiveInput,
} from "@/modules/crm/application/use-cases/change-price-book-active"
import {
  createPriceBook,
  type CreatePriceBookInput,
} from "@/modules/crm/application/use-cases/create-price-book"
import {
  createProduct,
  type CreateProductInput,
} from "@/modules/crm/application/use-cases/create-product"
import {
  importProducts,
  type ImportProductsInput,
} from "@/modules/crm/application/use-cases/import-products"
import { listPriceBooks } from "@/modules/crm/application/use-cases/list-price-books"
import { listProducts } from "@/modules/crm/application/use-cases/list-products"
import {
  deactivatePriceBookEntry,
  type DeactivatePriceBookEntryInput,
} from "@/modules/crm/application/use-cases/deactivate-price-book-entry"
import {
  updatePriceBook,
  type UpdatePriceBookInput,
} from "@/modules/crm/application/use-cases/update-price-book"
import {
  updateProduct,
  type UpdateProductInput,
} from "@/modules/crm/application/use-cases/update-product"
import {
  upsertPriceBookEntry,
  type UpsertPriceBookEntryInput,
} from "@/modules/crm/application/use-cases/upsert-price-book-entry"
import { SupabasePriceBookRepository } from "@/modules/crm/infrastructure/supabase-price-book-repository"
import { SupabaseProductRepository } from "@/modules/crm/infrastructure/supabase-product-repository"
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
  importCompanies,
  type ImportCompaniesInput,
} from "@/modules/crm/application/use-cases/import-companies"
import {
  createContact,
  type CreateContactInput,
} from "@/modules/crm/application/use-cases/create-contact"
import {
  importContacts,
  type ImportContactsInput,
} from "@/modules/crm/application/use-cases/import-contacts"
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
import {
  addQuoteLine,
  type AddQuoteLineInput,
} from "@/modules/crm/application/use-cases/add-quote-line"
import {
  changeQuoteStatus,
  type ChangeQuoteStatusInput,
} from "@/modules/crm/application/use-cases/change-quote-status"
import {
  createQuote,
  type CreateQuoteInput,
} from "@/modules/crm/application/use-cases/create-quote"
import {
  createQuoteRevision,
  type CreateQuoteRevisionInput,
} from "@/modules/crm/application/use-cases/create-quote-revision"
import { listQuotes } from "@/modules/crm/application/use-cases/list-quotes"
import {
  removeQuoteLine,
  type RemoveQuoteLineInput,
} from "@/modules/crm/application/use-cases/remove-quote-line"
import {
  updateQuote,
  type UpdateQuoteInput,
} from "@/modules/crm/application/use-cases/update-quote"
import {
  updateQuoteLine,
  type UpdateQuoteLineInput,
} from "@/modules/crm/application/use-cases/update-quote-line"
import { SupabaseQuoteRepository } from "@/modules/crm/infrastructure/supabase-quote-repository"
import { SupabaseDashboardStatsRepository } from "@/modules/crm/infrastructure/supabase-dashboard-stats-repository"
import { getDashboardStats } from "@/modules/crm/application/use-cases/get-dashboard-stats"
import { SupabaseLeadRepository } from "@/modules/crm/infrastructure/supabase-lead-repository"
import { createLead, type CreateLeadInput } from "@/modules/crm/application/use-cases/create-lead"
import { updateLead, type UpdateLeadInput } from "@/modules/crm/application/use-cases/update-lead"
import {
  changeLeadStatus,
  type ChangeLeadStatusInput,
} from "@/modules/crm/application/use-cases/change-lead-status"
import { convertLead, type ConvertLeadInput } from "@/modules/crm/application/use-cases/convert-lead"
import { listLeads } from "@/modules/crm/application/use-cases/list-leads"
import type { LeadListQuery } from "@/modules/crm/domain/lead"
import type { QuoteListQuery } from "@/modules/crm/domain/quote"
import type { ActivityFilters } from "@/modules/crm/domain/activity"
import type { OpportunityFilters } from "@/modules/crm/domain/opportunity"
import type { ListQuery } from "@/modules/crm/domain/pagination"
import type { ProductListQuery } from "@/modules/crm/domain/product"
import type { UUID } from "@/types/shared"

function productRepo() {
  return new SupabaseProductRepository()
}
function priceBookRepo() {
  return new SupabasePriceBookRepository()
}

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

export function importCompanyRecords(input: ImportCompaniesInput) {
  return importCompanies({ companies: companyRepo(), audit: audit() }, input)
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

export function importContactRecords(input: ImportContactsInput) {
  return importContacts({ contacts: contactRepo(), audit: audit() }, input)
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

export function listCaseActivityTimeline(
  tenantId: UUID,
  caseId: UUID,
  filters: ActivityFilters,
) {
  return activityRepo().listForCase(tenantId, caseId, filters)
}

export function listAssetActivityTimeline(
  tenantId: UUID,
  assetId: UUID,
  filters: ActivityFilters,
) {
  return activityRepo().listForAsset(tenantId, assetId, filters)
}

export function listWorkOrderActivityTimeline(
  tenantId: UUID,
  workOrderId: UUID,
  filters: ActivityFilters,
) {
  return activityRepo().listForWorkOrder(tenantId, workOrderId, filters)
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

// --- Products ---------------------------------------------------------------
export function listTenantProducts(tenantId: UUID, query: ProductListQuery) {
  return listProducts(productRepo(), tenantId, query)
}

export function getProductRecord(tenantId: UUID, id: UUID) {
  return productRepo().getById(tenantId, id)
}

export function listProductOptions(tenantId: UUID) {
  return productRepo().listActiveOptions(tenantId)
}

export function createProductRecord(input: CreateProductInput) {
  return createProduct({ products: productRepo(), audit: audit() }, input)
}

export function updateProductRecord(input: UpdateProductInput) {
  return updateProduct({ products: productRepo(), audit: audit() }, input)
}

export function changeProductRecordActive(input: ChangeProductActiveInput) {
  return changeProductActive({ products: productRepo(), audit: audit() }, input)
}

export function importProductRecords(input: ImportProductsInput) {
  return importProducts({ products: productRepo(), audit: audit() }, input)
}

export function exportTenantProducts(tenantId: UUID) {
  return productRepo().exportAll(tenantId)
}

export function listProductPriceAssignments(tenantId: UUID, productId: UUID) {
  return priceBookRepo().listEntriesForProduct(tenantId, productId)
}

// --- Price Books ------------------------------------------------------------
export function listTenantPriceBooks(tenantId: UUID, query: ListQuery) {
  return listPriceBooks(priceBookRepo(), tenantId, query)
}

export function getPriceBookRecord(tenantId: UUID, id: UUID) {
  return priceBookRepo().getById(tenantId, id)
}

export function listPriceBookEntries(tenantId: UUID, priceBookId: UUID) {
  return priceBookRepo().listEntries(tenantId, priceBookId)
}

export function createPriceBookRecord(input: CreatePriceBookInput) {
  return createPriceBook({ priceBooks: priceBookRepo(), audit: audit() }, input)
}

export function updatePriceBookRecord(input: UpdatePriceBookInput) {
  return updatePriceBook({ priceBooks: priceBookRepo(), audit: audit() }, input)
}

export function changePriceBookRecordActive(input: ChangePriceBookActiveInput) {
  return changePriceBookActive(
    { priceBooks: priceBookRepo(), audit: audit() },
    input,
  )
}

export function upsertPriceBookEntryRecord(input: UpsertPriceBookEntryInput) {
  return upsertPriceBookEntry(
    { priceBooks: priceBookRepo(), audit: audit() },
    input,
  )
}

export function deactivatePriceBookEntryRecord(
  input: DeactivatePriceBookEntryInput,
) {
  return deactivatePriceBookEntry(
    { priceBooks: priceBookRepo(), audit: audit() },
    input,
  )
}

// --- Quotes ----------------------------------------------------------------
function quoteRepo() {
  return new SupabaseQuoteRepository()
}

export function listTenantQuotes(tenantId: UUID, query: QuoteListQuery) {
  return listQuotes(quoteRepo(), tenantId, query)
}

export function getQuoteRecord(tenantId: UUID, id: UUID) {
  return quoteRepo().getById(tenantId, id)
}

// ── Public approval (Inc 4) ──────────────────────────────────────────────────
export function ensureQuotePublicToken(tenantId: UUID, id: UUID) {
  return quoteRepo().ensurePublicToken(tenantId, id)
}

export function getPublicQuoteView(token: string) {
  return quoteRepo().getPublicView(token)
}

export function setQuoteStatusByPublicToken(
  token: string,
  status: "accepted" | "rejected",
) {
  return quoteRepo().setStatusByPublicToken(token, status)
}

export function createQuoteRecord(input: CreateQuoteInput) {
  return createQuote({ quotes: quoteRepo(), audit: audit() }, input)
}

export function updateQuoteRecord(input: UpdateQuoteInput) {
  return updateQuote({ quotes: quoteRepo(), audit: audit() }, input)
}

export function changeQuoteRecordStatus(input: ChangeQuoteStatusInput) {
  return changeQuoteStatus({ quotes: quoteRepo(), audit: audit() }, input)
}

export function addQuoteLineRecord(input: AddQuoteLineInput) {
  return addQuoteLine({ quotes: quoteRepo(), audit: audit() }, input)
}

export function updateQuoteLineRecord(input: UpdateQuoteLineInput) {
  return updateQuoteLine({ quotes: quoteRepo(), audit: audit() }, input)
}

export function removeQuoteLineRecord(input: RemoveQuoteLineInput) {
  return removeQuoteLine({ quotes: quoteRepo(), audit: audit() }, input)
}

export function createQuoteRevisionRecord(input: CreateQuoteRevisionInput) {
  return createQuoteRevision({ quotes: quoteRepo(), audit: audit() }, input)
}

export function listQuoteLines(tenantId: UUID, quoteId: UUID) {
  return quoteRepo().listLines(tenantId, quoteId)
}

export function listQuoteOpportunityOptions(tenantId: UUID) {
  return quoteRepo().listOpportunityOptions(tenantId)
}

export function listQuotePriceBookOptions(tenantId: UUID) {
  return quoteRepo().listPriceBookOptions(tenantId)
}

export function listQuoteProductLineOptions(
  tenantId: UUID,
  priceBookId: UUID | null,
) {
  return quoteRepo().listProductLineOptions(tenantId, priceBookId)
}

// --- Leads (E7) ------------------------------------------------------------
function leadRepo() {
  return new SupabaseLeadRepository()
}

export function listTenantLeads(tenantId: UUID, query: LeadListQuery) {
  return listLeads(leadRepo(), tenantId, query)
}

export function getLeadRecord(tenantId: UUID, id: UUID) {
  return leadRepo().getById(tenantId, id)
}

export function getLeadFunnelMetrics(tenantId: UUID) {
  return leadRepo().getFunnelMetrics(tenantId)
}

export function createLeadRecord(input: CreateLeadInput) {
  return createLead({ leads: leadRepo(), audit: audit() }, input)
}

export function updateLeadRecord(input: UpdateLeadInput) {
  return updateLead({ leads: leadRepo(), audit: audit() }, input)
}

export function changeLeadRecordStatus(input: ChangeLeadStatusInput) {
  return changeLeadStatus({ leads: leadRepo(), audit: audit() }, input)
}

export function convertLeadRecord(input: ConvertLeadInput) {
  return convertLead(
    {
      leads: leadRepo(),
      companies: companyRepo(),
      contacts: contactRepo(),
      opportunities: opportunityRepo(),
      audit: audit(),
    },
    input,
  )
}

// --- Dashboard -------------------------------------------------------------
export function getTenantDashboardStats(tenantId: UUID) {
  return getDashboardStats(new SupabaseDashboardStatsRepository(), tenantId)
}

// --- Audit -----------------------------------------------------------------
export function listSubjectAuditEvents(
  tenantId: UUID,
  subjectId: string,
  limit = 10,
) {
  return audit().listBySubject(tenantId, subjectId, limit)
}
