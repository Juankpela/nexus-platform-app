/**
 * change-product-status.ts — superseded by change-product-active.ts
 * Kept as a re-export so any old import paths continue to compile.
 */
export {
  changeProductActive as changeProductStatus,
  type ChangeProductActiveInput as ChangeProductStatusInput,
  type ChangeProductActiveDeps as ChangeProductStatusDeps,
} from "@/modules/crm/application/use-cases/change-product-active"
