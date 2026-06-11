# E3 — Payments · Closure Report

> **Épica:** E3 (Revenue Operations) · **Estado:** CERRADA
> **Rama:** `feat/billing-e3-payments` (desde el tip de `feat/billing-e2-wo-billable`)
> **Fecha de cierre:** 2026-06-11
> **Decisiones congeladas (2026-06-11):** lógica en **app-layer** (consistente con E1/E2;
> no RPC atómica) · permisos **read/write** (reverse gateado por write).
> **Hito:** cierra el **Hito 1 — Caja**.
> **Referencias:** `PHASE-1-BACKLOG.md` (E3) · `REVENUE-OPERATIONS-SPEC.md` (§4)

---

## 1. Alcance implementado

Registro de pagos contra facturas emitidas, con asignación **multi-factura**, reversa con
rastro, y actualización de saldo/estado de las facturas. Cierra el lazo de dinero.

**Backend**
- Migración `20260611002_billing_payments.sql`: tablas `payments`, `payment_allocations`,
  `payment_sequences`; RPC `next_payment_number` (consecutivo `PAY-AAAA-0000`); enum
  `payment_status` (recorded/reversed); método como **texto abierto** + `reference` (listo para
  pasarelas); RLS; permisos `billing.payments.read/write`. Política de UPDATE de `invoices`
  ampliada para admitir `billing.payments.write` (actualizar saldo/estado).
- Dominio `payment.ts`: tipos, estados, métodos sugeridos, helpers (`totalAllocated`,
  `canReversePayment`).
- Puerto + repo: `list`, `getById`, `listForInvoice`, `listOpenInvoices`, `record`, `reverse`.
- Use-cases: `record-payment`, `reverse-payment`, `list-payments` (guardas + auditoría).

**Actions + UI**
- `recordPaymentAction` / `reversePaymentAction` (gateadas `billing.payments.write`).
- Detalle de factura: sección **Pagos** (lista de pagos aplicados + registrar pago a esta
  factura + reversar). Página de listado **Payments** (grupo Revenue).

---

## 2. Historias cubiertas

| Historia | Estado | Nota |
|---|---|---|
| **E3-H1** — Registrar pago aplicado a factura | ✅ | Estado `recorded`; aplica de inmediato; parcial → `partially_paid`; salda → `paid`; no excede saldo. |
| **E3-H2** — Pago multi-factura | ✅ backend · ⚠️ UI | El backend asigna a varias facturas (array de allocations); la UI mínima registra a una factura desde su detalle. UI multi-factura dedicada diferida (backend listo). |
| **E3-H3** — Revertir pago | ✅ | `reversed` con motivo; recalcula saldos/estados; conserva rastro. |
| **E3-H4** — Cierre del origen al saldar | ✅ (alcance actual) | La factura llega a `paid` (señal de cierre). El WO no requiere nuevo estado; el cierre de Sales Order llega con E6. |

---

## 3. Criterios de aceptación cumplidos

**E3-H1** — CA1 (factura, monto, fecha, método, referencia, nota) ✅ · CA2 (`recorded`, aplica
ya) ✅ · CA3 (monto < saldo → `partially_paid`) ✅ · CA4 (salda → `paid`) ✅ · CA5 (no excede
saldo) ✅ (validado contra balance antes de escribir).

**E3-H2** — CA1 (reparte entre varias facturas del mismo cliente) ✅ backend · CA2 (suma no
excede el pago) ✅ · CA3 (cada factura actualiza estado/saldo) ✅.

**E3-H3** — CA1 (`recorded` → `reversed` con motivo) ✅ · CA2 (facturas recalculan saldo/estado)
✅ · CA3 (conserva rastro, no se elimina) ✅.

**E3-H4** — CA1 (al `paid`, el origen refleja el cierre) ✅ para origen Work Order (la factura
`paid` es la señal; el WO ya está `completed`). Sales Order: con E6.

---

## 4. QA ejecutado

| Gate | Resultado |
|---|---|
| **Typecheck** (`tsc --noEmit`, proyecto) | ✅ **0 errores** |
| **Lint** | ✅ limpio |
| **Build** (`next build`) | ✅ verde; ruta `/app/[tenantSlug]/payments` compilada |
| **Migración** (`db:push`) + **Tipos** (`db:types`) | ✅ aplicada/regenerados (con reverts de inventory) |

---

## 5. Riesgos abiertos

1. **No-atomicidad en multi-factura (decisión app-layer).** `record`/`reverse` secuencian
   escrituras (pago → asignaciones → actualización de facturas) sin transacción. Un fallo a mitad
   puede dejar saldos inconsistentes. **Riesgo aceptado** por decisión 2026-06-11; mitigado
   validando saldos antes de escribir. Endurecible con RPC transaccional si se materializa.
2. **Drift de tipos de inventory** (deuda técnica registrada, `task_eb721530`): revertido a mano
   por **tercera** vez tras `db:types`. No bloquea Revenue Ops.
3. **Comparaciones de dinero con tolerancia `0.0001`** para evitar errores de coma flotante en
   numeric(14,2). Aceptable a esta escala; revisar si se introduce multi-moneda.

---

## 6. Desviaciones respecto a la spec

| # | Desviación | Justificación | Resolución |
|---|---|---|---|
| D1 | **App-layer, sin atomicidad transaccional** (multi-factura). | Decisión congelada (consistencia con E1/E2). | Endurecer con RPC si el riesgo se materializa. |
| D2 | **UI multi-factura mínima**: se registra pago a una factura desde su detalle; el reparto a varias facturas existe en backend pero sin pantalla dedicada. | "UI mínima" + el flujo que cierra el Hito 1 es pago por factura. | Pantalla de pago multi-factura como mejora futura (backend ya lo soporta). |
| D3 | **Sobrepago / saldo a favor** no soportado (validación rechaza exceder saldo). | Fuera de alcance MVP (spec §8). | Futuro. |

---

## 7. Elementos explícitamente fuera de alcance (E3)

- Pasarelas de pago (Wompi/PSE/Mercado Pago) — el modelo (método texto + referencia) las deja listas.
- Saldo a favor / sobrepagos.
- Leads (E7), Sales Orders (E6) — no iniciados.
- PDF de factura (heredado de E1 D2).
- Corrección permanente del drift de tipos de inventory (tarea aparte).

---

## 8. Hito 1 — Caja: CERRADO

Con E1 + E2 + E3, el **Flujo C** opera de punta a punta dentro de Nexus, sin herramientas externas:

```
Service Request → Case → Work Order → (billable + aprobada + completada)
   → Invoice (pre-poblada, editada, emitida) → Payment (registrado) → factura PAID
```

Por primera vez Nexus permite a un cliente **ejecutar trabajo y registrar su cobro en la misma
plataforma**. Esta es la validación central de Revenue Operations.

**Pendiente antes de declarar "listo para cliente" (no bloquea el hito):** PDF de factura (E1 D2).

---

**Veredicto:** E3 cumple su objetivo —registro de pagos parciales/totales, multi-factura
(backend), reversa con rastro, y actualización de saldos/estados— cerrando el lazo de dinero y el
Hito 1. Desviaciones acotadas (no-atomicidad por decisión; UI multi-factura diferida). QA en
verde. Épica **CERRADA**.
