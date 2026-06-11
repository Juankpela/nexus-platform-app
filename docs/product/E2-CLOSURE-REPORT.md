# E2 — Work Order Facturable · Closure Report

> **Épica:** E2 (Revenue Operations) · **Estado:** CERRADA
> **Rama:** `feat/billing-e2-wo-billable` (desde el tip de `feat/billing-e1-invoice`)
> **Fecha de cierre:** 2026-06-11
> **Decisión congelada:** sin entidad nueva · sin tabla independiente · la facturabilidad
> pertenece a Work Order · persistir en `work_orders`.
> **Referencias:** `PHASE-1-BACKLOG.md` (E2) · `REVENUE-OPERATIONS-SPEC.md` (§2) · `E1-CLOSURE-REPORT.md` (D1)

---

## 1. Alcance implementado

La facturabilidad como **atributo comercial de la Work Order**, su **checkpoint de aprobación**,
y la **pre-población de líneas de factura** desde la WO. Todo persistido en `work_orders`
(columnas), sin entidad ni tabla nuevas.

**Backend**
- Migración `20260611001_work_order_billing.sql`: columnas `billable`, `billing_approved_at`,
  `billing_approved_by` en `work_orders`; índice `(tenant_id, billable, status)`; política
  RLS de UPDATE ampliada para permitir al rol de facturación (`billing.invoices.write`) además
  del coordinador (`service.work_orders.write`).
- Dominio `work-order.ts`: campos nuevos + helper `isWorkOrderInvoiceable` (billable + aprobada
  + completada).
- Puerto + repo: `setBillable` (resetea aprobación previa) y `approveBilling`.
- Use-cases: `set-work-order-billable` y `approve-work-order-billing` (con guardas + auditoría).
- Billing: `createFromWorkOrder` ahora **gateado** (billable + aprobada + completada) y
  **pre-puebla líneas** desde consumos de material (`inventory_transactions` tipo `consumption`,
  `reference_type='work_order'`) + mano de obra (`labor_hours`), a precio 0.

**Actions + UI**
- `setWorkOrderBillableAction` (gateada `service.work_orders.write`) y
  `approveWorkOrderBillingAction` (gateada `billing.invoices.write`).
- Detalle de WO: panel "Facturación" con toggle de facturable, botón "Aprobar para facturación"
  y estado; el botón "Generar factura" ahora exige `isWorkOrderInvoiceable`.

---

## 2. Historias cubiertas

| Historia | Estado | Nota |
|---|---|---|
| **E2-H1** — Marcar facturabilidad según origen | ✅ con desviación | Flag manual en `work_orders`, independiente del estado de ejecución. El default-por-origen (Quote → facturable) llega en **E5**. |
| **E2-H2** — Acumular líneas cobrables y materiales | ✅ con desviación | Pre-población de cantidades (materiales + mano de obra); **precio de venta lo fija el back-office** (decisión A). |
| **E2-H3** — Aprobar la WO para facturación (checkpoint) | ✅ | Rol de facturación aprueba; gatea la generación de factura. |

---

## 3. Criterios de aceptación cumplidos

**E2-H1**
- CA1 (Case bajo garantía → no facturable; sin cobertura → facturable) → ✅ vía flag manual
  (default `false`); el default-por-cobertura/origen automático es E5.
- CA2 (facturabilidad ≠ estado de ejecución) → ✅ el flag es independiente del status.
- CA3 (cambio auditado) → ✅ `work_order.billable_changed`.

**E2-H2**
- CA1 (líneas de servicio con precio) → ⚠️ líneas sembradas con precio 0; el back-office fija el
  precio en el borrador (decisión A, 2026-06-11).
- CA2 (materiales con cantidad y precio de venta; cobrable vs cubierto) → ✅ cantidad sembrada
  desde consumos; precio manual; "cobrable vs cubierto" se expresa por el flag `billable` (una WO
  no facturable no genera factura).
- CA3 (horas/visitas como línea) → ✅ línea "Mano de obra" desde `labor_hours`.

**E2-H3**
- CA1 (solo rol con permiso de facturación aprueba) → ✅ `billing.invoices.write`.
- CA2 (valida antes de habilitar la factura) → ✅ la aprobación es prerequisito; la revisión de
  montos la hace el humano en el borrador (los precios se fijan ahí).
- CA3 (WO facturable completada pero no aprobada no genera factura) → ✅ guarda en
  `createFromWorkOrder` (billable + aprobada + completada).

---

## 4. QA ejecutado

| Gate | Resultado |
|---|---|
| **Typecheck** (`tsc --noEmit`, proyecto) | ✅ **0 errores** |
| **Lint** (`eslint` sobre archivos E2) | ✅ limpio |
| **Build** (`next build`) | ✅ verde |
| **Migración** (`db:push`) | ✅ aplicada |
| **Tipos** (`db:types`) | ✅ regenerados (con reverts de inventory, ver §5) |

---

## 5. Riesgos abiertos

1. **Drift de tipos de inventory recurrente.** Cada `db:types` vuelve a endurecer
   `p_reference_id` (`string`) y `quantity_available` (`number | null`), rompiendo inventory.
   Ya van **dos** reaplicaciones manuales del revert (E1 y E2). **Necesita corrección
   permanente** (alinear el código de inventory con los tipos reales, o ajustar las firmas SQL).
   Fuera del alcance de E2 — pendiente como tarea propia.
2. **Pre-población solo desde consumo directo a la WO** (`reference_type='work_order'`). Si en el
   futuro el consumo se registra vía ejecución (`reference_type='work_order_execution'`), esas
   líneas no se sembrarán hasta extender la query. Hoy no hay flujo de consumo-en-ejecución
   cableado, así que no hay pérdida actual.
3. **Precios en 0 por diseño** (decisión A): el back-office debe fijar el precio de venta antes de
   emitir; una factura sin precios queda en total 0 hasta editarse.

---

## 6. Desviaciones respecto a la spec

| # | Desviación | Justificación | Resolución |
|---|---|---|---|
| D1 | **Precio de venta no auto-derivado** (E2-H2 CA1/CA2). Líneas sembradas a 0; humano fija precio. | Decisión A congelada (2026-06-11): no existe price book por defecto ni tarifa de mano de obra; auto-precio sería ampliar alcance. | El back-office fija precios en el borrador (E1-H2). Reevaluable si se introduce price book por defecto. |
| D2 | **Default-por-origen del flag `billable`** (Quote → facturable) no automático. | El origen Quote de la WO llega en **E5**; hoy solo existe origen Case. | Se cierra en E5 (WO desde Quote nace facturable). |

*Ninguna desviación contradice la decisión congelada ni la identidad del producto.*

---

## 7. Elementos explícitamente fuera de alcance (E2)

- Payments (E3), Leads (E7), Sales Orders (E6) — **no iniciados**.
- Auto-pricing / price book por defecto / tarifa de mano de obra.
- Consumo de material vía ejecución como fuente de líneas (no hay flujo cableado).
- PDF de factura (heredado de E1 D2, sigue pendiente).
- Corrección permanente del drift de tipos de inventory (tarea aparte).

---

## 8. Efecto sobre E1

Cierra la **desviación D1 de E1**: la factura generada desde una WO ahora **nace con líneas
pre-pobladas** (materiales + mano de obra), ya no vacía.

---

**Veredicto:** E2 cumple su objetivo —la Work Order tiene facturabilidad como atributo propio
(sin entidad/tabla nueva), un checkpoint de aprobación por rol de facturación, y siembra las
líneas de la factura— con desviaciones acotadas (precio manual por decisión A; default-por-origen
diferido a E5). QA en verde. Épica **CERRADA**.
