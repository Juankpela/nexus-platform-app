# Revenue Operations Alignment — Quote-Origin Invoicing · Closure Report

> **Tipo:** Alineación arquitectónica (no es épica nueva) · **Estado:** CERRADA
> **Rama:** `feat/billing-quote-origin-invoicing`
> **Fecha:** 2026-06-11
> **Decisión congelada:** Sales Order eliminado de Nexus. Invoice origin = Work Order | Quote.
> Nunca desde Case, Opportunity o Lead.

---

## 1. Auditoría de impacto

Lugares que asumían origen `work_order` / `sales_order`:

| Capa | Hallazgo | Tocado |
|---|---|---|
| Migración `20260610006` | enum `invoice_origin_type` con `sales_order`; columna `sales_order_id`; CHECK `invoices_origin_chk` | Reemplazado por nueva migración (no se edita la histórica) |
| Dominio `invoice.ts` | `INVOICE_ORIGIN_TYPES`, labels, `salesOrderId`, `InvoiceDetail` | Sí |
| Repo `supabase-invoice-repository` | `toInvoice` (sales_order_id), `getById` (join), `createFromWorkOrder` | Sí (mapeo + join quotes + `createFromQuote`/`findActiveByQuote`) |
| Use-cases | `generate-invoice-from-work-order` (intacto) | Añadido `generate-invoice-from-quote` |
| Composición / Actions | — | Añadidos `generateInvoiceFromQuote*` |
| UI detalle / PDF | mostraban `workOrderNumber` | Generalizado a WO **o** cotización |
| UI cotización | botón "Generar OT" (E5) | Añadido botón "Generar factura"; corregido mensaje de quote mixta |
| Revenue Timeline / Payments / Reportes | NO leen `origin_type` | Sin cambios (compatibles) |
| RLS / permisos / auditoría | reusan `billing.invoices.*` | Sin cambios |

`sales_order` **nunca tuvo filas** (jamás implementado) → recrear el enum es seguro.

---

## 2. Cambios realizados

- **Migración** `20260611005_invoice_quote_origin.sql` (idempotente): añade `quote_id` + FK a
  `quotes`, elimina `sales_order_id`, **recrea** el enum `invoice_origin_type` como
  (`work_order`, `quote`), reemplaza el CHECK de origen. `sales_order` desaparece del modelo.
- **Dominio:** `INVOICE_ORIGIN_TYPES = [work_order, quote]`; label `quote = "Cotización"`;
  `Invoice.quoteId` (en vez de `salesOrderId`); `InvoiceDetail.quoteNumber`. Regla congelada
  reescrita.
- **Repo:** mapeo `quote_id`; join `quotes(quote_number)` en `getById`; **`createFromQuote`**
  (valida quote aceptada + con líneas de producto; siembra líneas de **producto** a precio
  acordado; no crea WO ni entidades intermedias) y **`findActiveByQuote`** (guarda 1-por-quote).
- **Use-case** `generate-invoice-from-quote` + composición + acción
  `generateInvoiceFromQuoteAction` (gateada `billing.invoices.write`).
- **UI:** botón "Generar factura" en cotización aceptada; detalle y PDF muestran el nº de
  cotización cuando el origen es quote; mensaje de quote mixta corregido (productos → factura
  directa, ya no "Sales Order").
- **`createFromWorkOrder` intacto** (origen work_order sin cambios de lógica).

---

## 3. Reglas resultantes

| Origen | Aplica a | Siembra líneas desde | Crea WO |
|---|---|---|---|
| **Quote** | Venta de producto | Líneas de **producto** de la cotización (precio acordado) | No |
| **Work Order** | Venta de servicio / solicitud de servicio | Servicios de la quote (E5) o consumos+labor (Case, E2) | — |

Quote mixta (producto + servicio): servicios → Work Order → su factura; productos → factura
directa desde la cotización. Sin doble cobro (cada factura toma su tipo de línea).

---

## 4. Riesgos encontrados

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Recreación de enum con columna dependiente | Hecho en una transacción (DO block), CHECK eliminado antes, cast vía texto; idempotente por existencia de `sales_order_id`. Sin filas `sales_order`. |
| R2 | Doble facturación en quote mixta | Quote-invoice toma solo líneas de producto; WO-invoice solo servicios. Disjuntos. |
| R3 | Quote pura de servicio intenta facturarse directo | `createFromQuote` rechaza si no hay líneas de producto (usar Work Order). |
| R4 | Drift de tipos de inventory tras `db:types` | Revertido a mano (6ª vez). Deuda técnica registrada, no bloquea. |

---

## 5. Compatibilidad validada

- **Revenue Timeline:** lee invoices por `company_id`, no por origen → sin cambios; enlaces OK.
- **PDF / detalle de factura:** muestran el origen y su número (WO o cotización).
- **Payments:** sin cambios (operan sobre la factura, no el origen).
- **Navegación / Auditoría / RLS / Permisos:** sin cambios; la creación desde quote reusa
  `billing.invoices.write` y la RLS existente de `invoices`.

---

## 6. QA

| Gate | Resultado |
|---|---|
| Typecheck (proyecto) | ✅ 0 errores |
| Lint | ✅ limpio |
| Build | ✅ verde |
| Migración + tipos | ✅ aplicada/regenerados |

**Validación funcional — los tres flujos soportados:**
- **Producto:** Lead → Opportunity → Quote (aceptada, con productos) → **Generar factura** →
  Invoice (origen quote, líneas de producto) → Payment. ✅
- **Servicio vendido:** Quote → Work Order (E5) → Invoice (servicios) → Payment. ✅ (intacto)
- **Solicitud de servicio:** Case → Work Order → Invoice → Payment. ✅ (intacto)

---

## 7. Resultado

`invoice_origin_type` = **Quote | Work Order**. Sales Order desaparece completamente del modelo
de Nexus. Los tres flujos oficiales quedan soportados por la arquitectura actual. Se cierra el
hallazgo **F1 de E7** (facturación de producto desde Quote) sin crear entidad ni épica nueva.

**Veredicto:** alineación completa con la visión congelada. CERRADA.
