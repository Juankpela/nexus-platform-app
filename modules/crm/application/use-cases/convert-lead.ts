import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { LeadRepository } from "@/modules/crm/application/ports/lead-repository"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import { canConvertLead, type LeadConversionInput } from "@/modules/crm/domain/lead"
import type { UUID } from "@/types/shared"

export type ConvertLeadDeps = {
  leads: LeadRepository
  companies: CompanyRepository
  contacts: ContactRepository
  opportunities: OpportunityRepository
  audit: AuditRepository
}

export type ConvertLeadInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: LeadConversionInput
}

export type ConvertLeadResult = {
  opportunityId: UUID
  companyId: UUID
  contactId: UUID
}

/** Split a free-text person name into first/last (best-effort, no enrichment). */
function splitName(full: string): { firstName: string; lastName: string | null } {
  const parts = full.trim().split(/\s+/)
  if (parts.length <= 1) return { firstName: full.trim() || "—", lastName: null }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

/**
 * E7 — convert a Lead into an Opportunity. The Opportunity requires a Company and
 * Contact, so both are created from the lead's data (Salesforce-style conversion).
 * The Lead is never deleted: it is marked `converted` and linked to the Opportunity.
 */
export async function convertLead(
  { leads, companies, contacts, opportunities, audit }: ConvertLeadDeps,
  input: ConvertLeadInput,
): Promise<ConvertLeadResult> {
  const lead = await leads.getById(input.tenantId, input.id)
  if (!lead) {
    throw new ApplicationError("Lead not found.", "LEAD_NOT_FOUND")
  }
  if (!canConvertLead(lead.status)) {
    throw new ApplicationError(
      "This lead cannot be converted (already converted or disqualified).",
      "LEAD_NOT_CONVERTIBLE",
    )
  }

  // 1) Company from the lead (fallback to the person name if no company given).
  const company = await companies.create(input.tenantId, {
    name: lead.company?.trim() || lead.name,
    taxId: null,
    industry: null,
    website: null,
    phone: lead.phone,
    address: null,
    city: null,
    state: null,
    country: null,
    notes: `Generada al convertir el lead ${lead.name}.`,
  })

  // 2) Contact from the lead, linked to the new company.
  const { firstName, lastName } = splitName(lead.name)
  const contact = await contacts.create(input.tenantId, {
    companyId: company.id,
    firstName,
    lastName,
    email: lead.email,
    phone: lead.phone,
    mobile: null,
    title: null,
    department: null,
    notes: null,
  })

  // 3) Opportunity — the destination of the conversion. Pipeline lives here.
  const opportunity = await opportunities.create(
    input.tenantId,
    lead.ownerId ?? input.actorId,
    {
      companyId: company.id,
      contactId: contact.id,
      name: input.data.opportunityName,
      businessType: input.data.businessType,
      estimatedValue: null,
      probability: 0,
      expectedCloseDate: null,
      description: lead.notes,
    },
  )

  // 4) Mark the lead converted with traceability (never deleted).
  await leads.markConverted(
    input.tenantId,
    lead.id,
    opportunity.id,
    new Date().toISOString(),
  )

  await audit.append({
    eventType: "crm.lead.converted",
    action: "lead.converted",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "lead",
    subjectId: lead.id,
    metadata: {
      opportunityId: opportunity.id,
      companyId: company.id,
      contactId: contact.id,
    },
    requestId: input.requestId,
    source: "web",
  })

  return {
    opportunityId: opportunity.id,
    companyId: company.id,
    contactId: contact.id,
  }
}
