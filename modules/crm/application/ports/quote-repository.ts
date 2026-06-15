import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  OpportunityOption,
  PriceBookOption,
  ProductLineOption,
  PublicQuoteView,
  Quote,
  QuoteDetail,
  QuoteInput,
  QuoteListItem,
  QuoteListQuery,
  QuoteLine,
  QuoteLineInput,
  QuoteStatus,
} from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export interface QuoteRepository {
  // ── Quotes ─────────────────────────────────────────────────────────────────
  list(tenantId: UUID, query: QuoteListQuery): Promise<Paginated<QuoteListItem>>
  getById(tenantId: UUID, id: UUID): Promise<QuoteDetail | null>
  create(tenantId: UUID, input: QuoteInput): Promise<Quote>
  update(tenantId: UUID, id: UUID, input: QuoteInput): Promise<Quote>
  setStatus(tenantId: UUID, id: UUID, status: QuoteStatus): Promise<void>
  createRevision(tenantId: UUID, sourceId: UUID): Promise<Quote>

  // ── Public approval (Inc 4) ──────────────────────────────────────────────────
  ensurePublicToken(tenantId: UUID, id: UUID): Promise<string>
  getPublicView(token: string): Promise<PublicQuoteView | null>
  setStatusByPublicToken(token: string, status: QuoteStatus): Promise<void>
  recalculateTotals(tenantId: UUID, quoteId: UUID): Promise<void>

  // ── Lines ──────────────────────────────────────────────────────────────────
  listLines(tenantId: UUID, quoteId: UUID): Promise<QuoteLine[]>
  addLine(
    tenantId: UUID,
    quoteId: UUID,
    input: QuoteLineInput & { lineTotal?: number },
  ): Promise<QuoteLine>
  updateLine(
    tenantId: UUID,
    lineId: UUID,
    input: QuoteLineInput & { lineTotal?: number },
  ): Promise<QuoteLine>
  removeLine(tenantId: UUID, lineId: UUID): Promise<void>

  // ── Option lists for forms ─────────────────────────────────────────────────
  listOpportunityOptions(tenantId: UUID): Promise<OpportunityOption[]>
  listPriceBookOptions(tenantId: UUID): Promise<PriceBookOption[]>
  listProductLineOptions(
    tenantId: UUID,
    priceBookId: UUID | null,
  ): Promise<ProductLineOption[]>
}
