# E4 — Revenue Timeline · Closure Report

> **Épica:** E4 (Revenue Operations) · **Estado:** CERRADA
> **Rama:** `feat/billing-e4-revenue-timeline`
> **Fecha de cierre:** 2026-06-11
> **Naturaleza:** vista de negocio (read-only, derivada). **NO** contabilidad, ERP, cartera
> avanzada ni estados financieros.
> **Referencias:** `PHASE-1-BACKLOG.md` (E4) · `REVENUE-OPERATIONS-SPEC.md` (§5)

---

## 1. Objetivo cumplido

Una vista unificada de la **relación económica del cliente** en su ficha de empresa, que responde
únicamente: qué se vendió, qué se ejecutó, qué se facturó, qué se cobró y qué saldo permanece.
Consolida eventos de Quotes, Work Orders, Invoices y Payments, navegables hasta su origen.

---

## 2. Alcance implementado

- **Dominio** `revenue-timeline.ts`: `RevenueTimelineEvent` (tipo, fecha, título, detalle, monto,
  enlace, estado), `CustomerRevenueSummary` (facturado/cobrado/saldo), `CustomerRevenueTimeline`.
- **Puerto + repo** `RevenueTimelineRepository.getForCompany`: lee las 4 fuentes por `company_id`,
  arma eventos cronológicos y deriva el resumen. **Sin tablas nuevas** (vista derivada).
- **Composición** `getCustomerRevenueTimeline(tenantId, companyId)`.
- **UI** componente `RevenueTimeline`: cabecera con los 3 totales + lista cronológica de eventos
  (íconos por tipo, enlaces al origen). Renderizado en la ficha de empresa, gateado por
  `billing.invoices.read`.

---

## 3. Principios obligatorios — cumplimiento

| Principio | Cumplido |
|---|---|
| Vista de negocio, no herramienta contable | ✅ solo lectura, sin escritura ni cálculo contable |
| Consolida Quotes + Work Orders + Invoices + Payments | ✅ las 4 fuentes |
| Eventos navegables hasta su origen | ✅ quote/WO/invoice → detalle; payment → listado de pagos |
| Muestra facturado / pagado / saldo | ✅ tres tarjetas de resumen |
| Compatible con Customer Portal / Analytics / Revenue Dashboard / AI | ✅ eventos tipados, montos explícitos, enlaces — es la semilla |
| NO asientos / centros de costo / impuestos avanzados / conciliación / ERP | ✅ nada de eso |

---

## 4. Historias cubiertas

| Historia | Estado | Nota |
|---|---|---|
| **E4-H1** — Línea de tiempo financiera del cliente | ✅ | En la ficha de empresa; eventos navegables; 3 totales. |
| **E4-H2** — Listado de facturas (cartera básica) | ✅ (existente) | El listado `/invoices` (E1) ya cubre la cartera mínima por estado/saldo; E4 añade el resumen por cliente. No se construye edad de cartera (anti-ERP). |

---

## 5. Criterios de aceptación

**E4-H1** — CA1 (cronología con eventos de los 3+ flujos mezclados) ✅ · CA2 (cada evento enlaza
a su documento) ✅ (pago enlaza al listado de pagos, ver §7) · CA3 (cabecera facturado/cobrado/
saldo) ✅.

**E4-H2** — CA1 (lista filtrable por estado/cliente) ✅ vía `/invoices` (E1) · CA2 (número,
cliente, total, saldo, estado, vencimiento) ✅.

---

## 6. QA ejecutado

| Gate | Resultado |
|---|---|
| Typecheck (`tsc`, proyecto) | ✅ 0 errores |
| Lint | ✅ limpio |
| Build (`next build`) | ✅ verde |
| Migración | — (no aplica: vista derivada, sin esquema nuevo) |

*Sin migración ⇒ sin regeneración de tipos ⇒ el drift de inventory no se tocó esta vez.*

---

## 7. Riesgos abiertos / Desviaciones

| # | Punto | Nota |
|---|---|---|
| R1 | **Agregación en memoria por cliente** (lee 4 tablas y mezcla en app). | Acotado a la escala de un cliente (no es agregación global); sin preocupación de rendimiento. |
| R2 | **Resumen derivado solo de invoices** (facturado/cobrado/saldo). Los pagos se listan como eventos pero no se doble-cuentan. | Decisión: una sola fuente de verdad evita drift entre "suma de pagos" y "amount_paid". |
| D1 | **Eventos de pago enlazan al listado de pagos**, no a un detalle de pago (no existe ruta de detalle de pago). | Navegabilidad parcial; aceptable para el mínimo. |
| D2 | **Sin edad de cartera / dunning / dashboards**. | Fuera de alcance por diseño (anti-ERP, anti-cartera avanzada). |

---

## 8. Compatibilidad con la visión futura

El timeline está diseñado como **semilla** de:
- **Customer Portal:** será un subconjunto read-only de esta misma vista (eventos del cliente).
- **Analytics / Revenue Dashboard:** los eventos tipados con montos explícitos son la materia prima.
- **AI:** la historia económica estructurada por cliente alimenta resúmenes y next-best-action.

Por eso los eventos son tipados, navegables y con montos explícitos — no un render ad-hoc.

---

**Veredicto:** E4 cumple su objetivo —una vista unificada y navegable de la relación económica del
cliente, con facturado/cobrado/saldo— **sin cruzar a contabilidad ni ERP**. Respeta los seis
principios obligatorios. QA en verde. Épica **CERRADA**.
