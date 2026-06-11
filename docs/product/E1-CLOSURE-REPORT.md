# E1 — Invoice Polimórfica · Closure Report

> **Épica:** E1 (Revenue Operations) · **Estado:** CERRADA
> **Rama:** `feat/billing-e1-invoice` (publicada en GitHub)
> **Commits:** `d49507a` (docs de gobernanza) · `542b460` (feat E1)
> **Fecha de cierre:** 2026-06-11
> **Referencias:** `PHASE-1-BACKLOG.md` (E1) · `REVENUE-OPERATIONS-SPEC.md` (§3, §6, §7) ·
> `PRODUCT-VISION-FREEZE.md` (§4–§5)

---

## 1. Alcance implementado

Módulo nuevo `billing` (dominio Revenue Operations), arquitectura hexagonal calcada del
patrón del repositorio. Factura como **único punto de cobro** con **origen polimórfico**
(Work Order | Sales Order; nunca desde Case — regla congelada y garantizada estructuralmente).

**Backend**
- Migración `20260610006_billing_invoices.sql`: tablas `invoices`, `invoice_lines`,
  `invoice_sequences`; RPC `next_invoice_number` (consecutivo fiscal atómico `INV-AAAA-0000`);
  enums `invoice_status` y `invoice_origin_type`; FKs compuestos `(id, tenant_id)`; RLS por
  tenant; **4 permisos granulares** `billing.invoices.read/write/issue/void`.
- Dominio `invoice.ts`: estados, transiciones, regla de origen congelada, helpers de cálculo
  (impuesto por línea), `isInvoiceMutable`, `canVoidInvoice`.
- Puerto `invoice-repository.ts` + 7 use-cases (generate-from-WO, update-draft,
  add/update/remove-line, issue, void, list) con guardas de inmutabilidad y elegibilidad.
- Repositorio Supabase + composición.

**Actions + UI mínima**
- Server actions con gating por acción (`write` / `issue` / `void`).
- Navegación: grupo **Revenue** → Invoices.
- Listado de facturas (filtros estado/búsqueda), detalle (cabecera, líneas, totales, saldo),
  edición de borrador, gestión de líneas, emitir, anular.
- Botón **Generar factura** en el detalle de Work Order completada.

---

## 2. Historias cubiertas

| Historia | Estado | Nota |
|---|---|---|
| **E1-H1** — Generar factura en borrador desde WO | ✅ con desviación | Cabecera sembrada desde la WO; pre-población de líneas **diferida a E2** (ver §8). |
| **E1-H2** — Editar y completar el borrador | ✅ con desviación | Edición de header + líneas + impuesto por línea; descuento de cabecera fijo en 0 (ver §8). |
| **E1-H3** — Emitir (consecutivo + inmutabilidad) | ✅ con desviación | Número consecutivo + inmutabilidad OK; **PDF presentable no implementado** (ver §8). |
| **E1-H4** — Anular con rastro | ✅ | Completa. |

---

## 3. Criterios de aceptación cumplidos

**E1-H1**
- CA1 (solo WO completadas generan factura) → ✅ gateado en UI por estado `completed`.
  *La validación de "facturable" pertenece a E2 (la bandera aún no existe).*
- CA2 (líneas pre-pobladas) → ⚠️ **diferido a E2** (la factura nace sin líneas; se agregan en el borrador).
- CA3 (hereda cliente/moneda/condiciones) → ✅ empresa + moneda COP; contacto nulo (la WO no tiene contacto).
- CA4 (no segunda factura) → ✅ `findActiveByWorkOrder` bloquea factura duplicada no anulada.
- CA5 (origen trazable) → ✅ `origin_type` + `work_order_id`.

**E1-H2**
- CA1 (editar líneas/descuentos/impuestos) → ✅ líneas + impuesto por línea; ⚠️ descuento de cabecera = 0.
- CA2 (recalcular totales) → ✅ automático.
- CA3 (sin número fiscal hasta emitir) → ✅ `invoice_number` nulo en borrador.

**E1-H3**
- CA1 (issued + número) → ✅
- CA2 (consecutivo sin huecos) → ✅ vía `next_invoice_number` atómico.
- CA3 (inmutable tras emitir) → ✅ enforzado en use-case/repo (app-layer, decisión congelada).
- CA4 (documento presentable / PDF) → ❌ **no implementado** (ver §8/§9).

**E1-H4**
- CA1 (motivo obligatorio + VOID) → ✅
- CA2 (conserva consecutivo) → ✅
- CA3 (libera origen para re-facturar) → ✅
- CA4 (no anular con pagos aplicados) → ✅ guarda sobre `amount_paid` (= 0 hasta E3).

---

## 4. QA ejecutado

| Gate | Resultado |
|---|---|
| **Typecheck** (`tsc --noEmit`, proyecto completo) | ✅ **0 errores** |
| **Lint** (`eslint` sobre archivos E1) | ✅ limpio (1 warning de import sin usar, corregido) |
| **Build** (`next build`) | ✅ verde; rutas `/app/[tenantSlug]/invoices` y `/invoices/[invoiceId]` compiladas |
| **Migración** (`db:push` al proyecto enlazado) | ✅ aplicada |
| **Tipos** (`db:types`) | ✅ regenerados con las tablas nuevas |

*No se añadieron tests automatizados en E1 (el repo tiene cobertura mínima; ver §6).*

---

## 5. Riesgos abiertos

1. **Inmutabilidad solo en app-layer** (no trigger DB). Aceptado y congelado; endurecible luego.
2. **`types/database.ts` — 6 firmas de inventory revertidas a mano.** La regeneración (`db:types`)
   tras el push volvió más estrictos los tipos de inventory (`p_reference_id: string`,
   `quantity_available: number`), rompiendo su compilación. Se revirtieron a su estado previo
   (`| null` / `number`) **sin tocar código de inventory**. **Riesgo:** el próximo `db:types`
   reintroducirá los tipos estrictos y volverá a romper inventory hasta que inventory se corrija
   por separado (drift real pre-existente, fuera del alcance de E1).
3. **Saldo siempre = total.** `amount_paid` lo actualizará E3 (Payments); hasta entonces el balance
   no decrece.
4. **PDF de factura ausente** (ver §8): "emitir" no produce aún un documento enviable al cliente.

---

## 6. Desviaciones respecto a la spec

| # | Desviación | Justificación | Resolución |
|---|---|---|---|
| D1 | **Líneas no pre-pobladas** desde la WO (E1-H1 CA2). La factura nace sin líneas; se agregan a mano. | La acumulación de líneas cobrables y materiales es responsabilidad de **E2-H2**. E1 standalone no podía cumplirlo sin invadir E2. | Se cierra en **E2**. |
| D2 | **PDF presentable no implementado** (E1-H3 CA4 / MVP item 3). | La etapa acordada fue "UI mínima"; el PDF excede ese mínimo. Quotes ya tiene una ruta `/print` reutilizable como molde. | Pendiente: abrir como tarea antes de declarar el **Hito 1 (Caja)** "listo para cliente". |
| D3 | **Descuento de cabecera fijo en 0.** Solo descuentos por línea. | Evita doble descuento y mantiene el cálculo simple; la spec admite descuento por línea como suficiente para el MVP. | Aceptado; reevaluable si un cliente lo pide. |
| D4 | **Contacto de facturación nulo al generar.** | La `work_orders` no tiene `contact_id`. | Editable en el borrador (campo presente); aceptado. |

*Ninguna desviación contradice la identidad congelada (origen polimórfico, punto único de cobro,
Case→WO→Revenue).*

---

## 7. Elementos explícitamente fuera de alcance (E1)

Diseñados/visibles en la visión, **no implementados** y **no iniciados**:
- DIAN / facturación electrónica.
- Notas crédito.
- Pasarelas de pago y estados de procesamiento.
- Saldo a favor / sobrepagos.
- AI Gateway, Analytics operativo, Forecasting, Customer Portal, Integraciones avanzadas.
- Pagos (E3), Leads (E7), Sales Orders (E6) y el origen Sales-Order de la factura.
- Multi-moneda operativa (se opera en COP).
- PDF de factura (ver D2 — diferido, no descartado).

---

## 8. Próximos cierres dependientes

- **E2** cierra D1 (pre-población de líneas) al aportar la WO facturable y la acumulación de líneas/materiales.
- **E3** activará `amount_paid`/balance (riesgo §5.3) y la regla "no anular con pagos".
- **E6** activará el origen `sales_order` de la factura (ya soportado por el modelo).

---

**Veredicto:** E1 cumple su objetivo —Nexus tiene una factura polimórfica, numerada, inmutable y
anulable, operable de punta a punta por UI— con desviaciones acotadas, ninguna que rompa la visión.
La épica queda **CERRADA**. Las desviaciones D1 se resuelve en E2; D2 (PDF) queda como tarea
pendiente antes de marcar el Hito 1 como listo para cliente.
