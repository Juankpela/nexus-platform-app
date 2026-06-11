# E7 — Leads (Sales Domain) · Closure Report

> **Épica:** E7 (Sales) · **Estado:** CERRADA
> **Rama:** `feat/crm-e7-leads`
> **Fecha de cierre:** 2026-06-11
> **Objetivo:** cerrar el tope del embudo y completar el dominio Sales.
> **Referencias:** `PHASE-1-BACKLOG.md` (E7) · `PRODUCT-VISION-FREEZE.md` (Sales)

---

## 1. Auditoría previa (conclusión)

Confirmado que **Leads era el siguiente paso lógico**: tras eliminar Sales Order del roadmap,
Lead era la única entidad de Sales faltante (el tope del embudo). No bloqueaba ninguna dependencia
(Opportunity ya existe como destino de conversión). Se procedió solo con E7.

---

## 2. Alcance implementado

- **Migración** `20260611004_crm_leads.sql`: tabla `leads` (name, company, email, phone, source,
  status, owner, notes, `converted_opportunity_id`, `converted_at`); enum `lead_status`
  (new/working/qualified/disqualified/converted); FK de trazabilidad a `opportunities`; RLS;
  permisos `crm.leads.read/write`. Sin numeración (no aplica).
- **Dominio** `lead.ts`: estados, transiciones, fuentes sugeridas, `LeadConversionInput`,
  `LeadFunnelMetrics`.
- **Backend**: puerto + repo (list, getById, create, update, setStatus, markConverted,
  getFunnelMetrics) + use-cases (create, update, change-status, **convert**, list) con auditoría.
- **Conversión** Lead → Opportunity: crea Company + Contact desde el lead (estilo Salesforce),
  crea la Opportunity (pipeline vive ahí), marca el lead `converted` y enlaza la oportunidad.
  **El lead nunca se elimina.**
- **UI**: listado con dashboard de embudo (creados, convertidos, tasa, top fuentes) + creación
  inline; detalle con transiciones de estado, edición y panel de conversión; entrada "Leads" en
  el grupo CRM.

---

## 3. Cobertura funcional alcanzada

| Requisito E7 | Estado |
|---|---|
| Captura de Leads | ✅ |
| Calificación básica (estados new→working→qualified→disqualified) | ✅ con máquina de estados |
| Conversión Lead → Opportunity | ✅ con auto-creación de Company + Contact |
| Trazabilidad (no eliminar, referencia a Opportunity) | ✅ `converted_opportunity_id` + `converted_at` |
| Seguimiento comercial | ✅ estados + edición + notas + owner |
| Métricas mínimas de embudo | ✅ creados / convertidos / tasa / por fuente |
| Pipeline NO duplicado en Lead | ✅ el pipeline sigue en Opportunity |

**No se construyó** (fuera de alcance, respetado): marketing automation, territory, forecasting,
scoring IA, cadencias, secuencias de correo, campañas, sales engagement, account planning,
revenue intelligence.

---

## 4. Impacto sobre los tres flujos

| Flujo | Impacto |
|---|---|
| **A — Venta de Producto** (`Lead→Opp→Quote→Invoice`) | El tope (Lead→Opp) **queda cerrado**. ⚠️ Persiste el gap de cola: tras eliminar Sales Order, `Quote→Invoice` para producto **no tiene ruta** (Invoice solo acepta origen work_order/sales_order; falta un origen `quote`). Ver §7. |
| **B — Venta de Servicio** (`Lead→Opp→Quote→WO→…→Invoice→Payment`) | **Cerrado de punta a punta desde el Lead.** Es el flujo que E7 completa íntegramente. |
| **C — Solicitud de Servicio** (`Case→WO→…`) | Sin cambios (no parte de Lead). |

**Hito narrativo:** el Flujo B ahora arranca realmente en el Lead, no en Opportunity. La historia
"desde el primer contacto hasta el cobro" es operable en una sola plataforma.

---

## 5. Criterios de aceptación

- Lead con campos mínimos ✅ · estados mínimos ✅ · conversión con trazabilidad ✅ · pipeline solo
  en Opportunity ✅ · dashboard con creados/convertidos/tasa/por-fuente ✅.

---

## 6. QA ejecutado

| Gate | Resultado |
|---|---|
| Typecheck (`tsc`, proyecto) | ✅ 0 errores |
| Lint | ✅ limpio (se corrigió `set-state-in-effect`: formularios migrados a `useTransition`) |
| Build (`next build`) | ✅ verde; rutas `/leads` y `/leads/[leadId]` |
| Migración + tipos | ✅ aplicada/regenerados (con reverts de inventory) |

---

## 7. Hallazgos fuera de alcance (documentados, NO implementados)

| # | Hallazgo | Acción |
|---|---|---|
| F1 | **Flujo A (producto) no puede facturar.** Al eliminar Sales Order, `Quote → Invoice` para producto carece de ruta: `invoice_origin_type` solo tiene `work_order`/`sales_order`. Se necesitaría un origen `quote` para facturar productos directamente desde la cotización. | **Trabajo de Revenue Ops** (no Sales). Documentado aquí; pendiente de una épica de "facturación de producto desde Quote". |
| F2 | **Conversión puede crear Company/Contact duplicados** si el lead corresponde a una empresa ya existente (no hay matching/dedupe). | Aceptable para el MVP; dedupe es enriquecimiento futuro, no Fase 1. |
| F3 | **`businessType` de la Opportunity** se elige en la conversión desde el catálogo heredado (flexography/inks/…), específico del tenant original. | Cosmético; revisable cuando el catálogo de tipos se generalice. |

---

## 8. Porcentaje del dominio Sales completado

Entidades núcleo de Sales (post-eliminación de Sales Order): **Lead ✅ · Account/Company ✅ ·
Contact ✅ · Opportunity ✅ · Quote ✅**.

**Sales (núcleo CRM) ≈ 95% completo.** El 5% restante no es Sales puro: es el puente
`Quote → Invoice` para producto (F1), que pertenece a Revenue Operations.

Capacidades **dentro de la visión pero fuera de Fase 1** (no cuentan para el MVP de Sales): AI de
ventas, Territory ligero, Forecasting. Quedan congeladas por decisión estratégica.

---

## 9. Qué falta para "Sales MVP Complete"

1. **(Revenue Ops, no Sales) Ruta `Quote → Invoice` para producto** — cerrar F1 para que el Flujo A
   facture de punta a punta. Es el único pendiente que impide declarar los **tres** flujos
   cerrados; Sales como dominio ya está MVP-completo sin él.
2. (Opcional, no bloqueante) Dedupe en conversión (F2).

Con eso, los tres flujos oficiales quedarían operables de punta a punta. **El dominio Sales, en sí
mismo, se considera MVP Complete con E7.**

---

**Veredicto:** E7 cierra el dominio Sales —captura, calificación, conversión con trazabilidad,
seguimiento y métricas de embudo— sin construir nada de Sales Cloud enterprise. El Flujo B queda
cerrado desde el Lead. El único pendiente para cerrar los tres flujos (facturación de producto
desde Quote) es trabajo de Revenue Ops, documentado en F1. QA en verde. Épica **CERRADA**.
