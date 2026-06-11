# E5 — Work Order desde Quote · Closure Report

> **Épica:** E5 (Revenue Operations / Sales↔Service) · **Estado:** CERRADA
> **Rama:** `feat/billing-e5-wo-from-quote`
> **Fecha de cierre:** 2026-06-11
> **Decisión congelada (2026-06-11):** una Quote mixta envía **solo sus líneas de servicio**
> a la Work Order; las líneas de producto esperan a Sales Order (E6).
> **Referencias:** `PHASE-1-BACKLOG.md` (E5) · `PRODUCT-VISION-FREEZE.md` (§4 origen polimórfico)

---

## 1. Significado estratégico

E5 es el punto donde Nexus deja de ser "Service + Field Service con cobro" y se vuelve
**Sales → Service → Revenue en un mismo flujo (Flujo B)**. Una cotización aceptada genera una
orden de trabajo facturable cuya factura lleva los **precios acordados en la venta**. Activa la
rama Quote del origen polimórfico de la Work Order (la otra costura central de la visión, junto a
la Invoice polimórfica de E1).

---

## 2. Alcance implementado

- Migración `20260611003_work_order_quote_origin.sql`: columna `quote_id` en `work_orders` + FK
  compuesta a `quotes` + índice. (Sin tabla nueva; consistente con `case_id`.)
- Dominio `work-order.ts`: `quoteId` + `quoteNumber` en el tipo WorkOrder.
- Repo: `createFromQuote` (valida quote aceptada, WO `billable=true`, hereda empresa, asunto
  `Servicio · {quoteNumber}`) y `findByQuote` (guarda de unicidad). Join de `quotes` en el mapeo.
- Use-case `create-work-order-from-quote` (una WO por quote; auditoría).
- Billing: `createFromWorkOrder` ahora **ramifica** — origen Quote ⇒ siembra líneas desde las
  líneas de **servicio** de la cotización con sus precios acordados; origen Case ⇒ comportamiento
  E2 (consumos + labor a precio 0).
- Actions + UI: botón "Generar orden de trabajo" en el detalle de la cotización (visible si
  aceptada + permiso `service.work_orders.write`); "Cotización origen" en el detalle de la WO.

---

## 3. Historias cubiertas

| Historia | Estado | Nota |
|---|---|---|
| **E5-H1** — Generar WO facturable desde Quote aceptada | ✅ | `billable=true`, hereda empresa, registra origen, una WO por quote. |
| **E5-H2** — Caso mixto (productos + servicios) | ✅ servicio · ⚠️ producto | Solo líneas de servicio → WO (decisión congelada); producto espera a E6. |
| **E5-H3** — Aprobar trabajo extra no cotizado | ⚠️ parcial | Cubierto por la aprobación de facturación (E2-H3) + borrador editable (E1-H2). Aprobación por-línea granular **diferida**. |

---

## 4. Criterios de aceptación cumplidos

**E5-H1** — CA1 (quote aceptada con servicio genera WO) ✅ · CA2 (WO facturable por defecto) ✅ ·
CA3 (hereda líneas/precios/empresa: las líneas de servicio se siembran en la factura con su
precio acordado al generarla; empresa heredada) ✅ · CA4 (Quote inmutable tras generar WO: el
estado `accepted` es terminal, sin ruta de edición) ✅ · CA5 (origen trazable: `quote_id`) ✅.

**E5-H2** — CA1 (servicio → WO) ✅ · CA2 (ninguna línea huérfana/duplicada) ✅ para servicio;
producto **fuera de alcance hasta E6** (no se procesa, no se duplica).

**E5-H3** — CA1 (líneas no cotizadas requieren aprobación antes de cobrarse) ⚠️ se satisface vía
el checkpoint de facturación de la WO (E2-H3): nada se factura sin aprobación; las líneas extra
son visibles en el borrador. La aprobación **por-línea** se difiere.

---

## 5. QA ejecutado

| Gate | Resultado |
|---|---|
| Typecheck (`tsc`, proyecto) | ✅ 0 errores |
| Lint | ✅ limpio |
| Build (`next build`) | ✅ verde |
| Migración + tipos | ✅ aplicada/regenerados (con reverts de inventory) |

---

## 6. Riesgos abiertos

1. **Detección de "servicio" por `product_type='service'`.** Productos mal tipados en el catálogo
   no se sembrarán como línea de servicio. Es correcto por diseño, pero depende de la higiene del
   catálogo del tenant.
2. **Drift de tipos de inventory** (deuda técnica `task_eb721530`): revertido a mano por **cuarta**
   vez tras `db:types`. No bloquea.
3. **Una WO por quote.** Si el negocio necesitara dividir una cotización en varias órdenes, hoy se
   rechaza. Aceptable para el MVP; revisable si surge la necesidad.

---

## 7. Desviaciones respecto a la spec

| # | Desviación | Justificación | Resolución |
|---|---|---|---|
| D1 | **Líneas de producto de una Quote mixta no se procesan.** | Decisión congelada: producto → Sales Order, que es E6. | Se cierra en E6. |
| D2 | **Aprobación por-línea de trabajo extra (E5-H3) diferida.** | El checkpoint de facturación de la WO (E2-H3) ya impide facturar sin aprobación; granularidad por-línea sería sobre-ingeniería para el mínimo. | Futuro si un cliente lo pide. |
| D3 | **Asunto de la WO autogenerado** (`Servicio · {quoteNumber}`), sin personalización al crear. | Minimalismo. | Editable luego con la edición normal de WO. |

---

## 8. Elementos explícitamente fuera de alcance (E5)

- Sales Order (E6) y el procesamiento de líneas de producto.
- Leads (E7).
- Aprobación granular por-línea de trabajo extra.
- División de una cotización en múltiples órdenes.
- Corrección permanente del drift de tipos de inventory (tarea aparte).

---

## 9. Efecto sobre la visión

Activa el **Flujo B** de punta a punta (de Opportunity en adelante):

```
Opportunity → Quote (aceptada) → Work Order (facturable, origen Quote)
   → ejecución → Invoice (líneas de servicio a precio acordado) → Payment
```

Con E1+E2+E3+E5, Nexus opera **dos** orígenes de factura reales (Case y Quote) sobre un único
punto de cobro: la promesa de "Sales + Service + Revenue unificados" deja de ser arquitectura y
pasa a ser flujo operable.

---

**Veredicto:** E5 cumple su objetivo —cotización aceptada ⇒ orden de trabajo facturable ⇒ factura
con precios de venta acordados— uniendo Sales, Service y Revenue en un solo flujo. Desviaciones
acotadas (producto→E6; aprobación por-línea diferida). QA en verde. Épica **CERRADA**.
