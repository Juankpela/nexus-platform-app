/**
 * remove-price-book-entry.ts — kept for backwards compat; delegates to
 * deactivate-price-book-entry (no-delete policy: entries use active flag).
 */
export {
  deactivatePriceBookEntry as removePriceBookEntry,
  type DeactivatePriceBookEntryInput as RemovePriceBookEntryInput,
  type DeactivatePriceBookEntryDeps as RemovePriceBookEntryDeps,
} from "@/modules/crm/application/use-cases/deactivate-price-book-entry"
