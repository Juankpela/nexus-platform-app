# ADR-023 — Inventory & Materials Core

- **Status:** Accepted (design) · Not yet implemented
- **Date:** 2026-06-10
- **Sprint:** INV-1
- **Relates to:** [ADR-020 Field Execution Domain](ADR-020-field-execution-domain.md),
  [ADR-022 Execution Core](ADR-022-execution-core.md)

## Context

Field Service necesita controlar materiales/consumibles, su stock por tenant, el
consumo en Work Orders, movimientos, ajustes manuales y reservas futuras. La
auditoría INV-1 (FASE 0) confirmó que **no existe nada de inventario** en el sistema
(0 resultados para `inventory|material|stock|warehouse`). CRM ya tiene `products`
(catálogo vendible: pricing, price books, quotes), conceptualmente distinto del
material que el técnico consume en campo.

## Decision

1. **Bounded context propio `inventory`** (módulo hexagonal nuevo). **Cero cambios**
   a `crm`/`service`/`scheduling`/`field-execution` en INV-1. La integración con
   Work Orders es **por referencia** (`reference_type`/`reference_id`), no por
   modificación de schema ajeno.
2. **`materials` ≠ `products`.** Tabla separada con FK opcional nullable
   `product_id` para enlazar ítems que también son vendibles. Evita acoplar CRM con
   Field Service.
3. **Modelo ledger + snapshot (event-sourcing ligero).** `inventory_transactions` es
   la **fuente de verdad inmutable** (append-only); `inventory_items` es un
   **snapshot derivado** mantenido atómicamente. `quantity_available` es columna
   generada (`on_hand − reserved`).
4. **Mutaciones solo vía RPC `security definer`** que, en una transacción: lockean la
   fila del item (`SELECT … FOR UPDATE`), insertan el movimiento y actualizan el
   snapshot, con CHECKs que impiden negativos. Reusa el patrón probado de
   `next_quote_number` (`security definer` + `set search_path` + upsert atómico).
5. **Multi-tenant idéntico al resto:** `tenant_id` en todo, `unique(id, tenant_id)`,
   FKs compuestas, RLS `has_tenant_permission`. Nuevos permisos `inventory.*`.

### Tradeoffs
- *Ledger+snapshot* vs *solo snapshot*: +1 escritura y posible deriva, a cambio de
  historial completo, auditoría y lecturas O(1). Aceptado (auditabilidad = requisito).
- *Ledger+snapshot* vs *solo ledger (SUM on read)*: el snapshot evita agregación por
  lectura (no escala). Aceptado.
- *Referencias polimórficas* vs *FKs duras*: se pierde integridad referencial hacia
  `work_orders`; mitigado con enum cerrado + validación en use-case + audit, y la
  matemática de stock **nunca** depende de la referencia. Aceptado por desacople.
- *`quantity` positiva + `type`* vs *delta con signo*: positiva+type por
  legibilidad/auditoría; el RPC traduce a efecto.

### Modelo transaccional
Cada operación = 1 fila inmutable en el ledger + actualización atómica del snapshot
en el mismo `BEGIN/COMMIT` del RPC. Invariante verificable:
`Σ(efecto de transacciones del material) == snapshot`.

### Estrategia multi-tenant
Aislamiento en 4 capas (igual que FWX): edge → permiso de página → guard de acción →
**RLS por fila**. Los RPC `security definer` corren con privilegios elevados pero
filtran explícitamente por `tenant_id` del contexto y validan `has_tenant_permission`
antes de mutar.

## Revisión aprobada (3 decisiones arquitectónicas)

### Multi-Warehouse Strategy
- **INV-1: ubicación única implícita**, sin `location_id`.
  `inventory_items unique(tenant_id, material_id)`.
- **`inventory_locations` aparece en INV-3** (con tipo `transfer` y stock por
  ubicación). Secuencia: INV-1 núcleo → INV-2 integración WO/reservas/reportes →
  INV-3 multi-warehouse.
- **Ruta de evolución aditiva** (INV-3): crear `inventory_locations`, sembrar una
  ubicación "Principal" por tenant, `ADD location_id` + backfill + `SET NOT NULL`,
  swap de constraint a `unique(tenant_id, material_id, location_id)`,
  `ALTER TYPE … ADD VALUE 'transfer'`. El `location_id` entra como parámetro de RPC
  con default = Principal, sin romper firmas.

### Reservation Lifecycle
- **El consumo NO requiere reserva previa.** La reserva es **opcional** (compromete
  stock a trabajo futuro).
- **INV-1: reserva como contador agregado** (`quantity_reserved`), sin entidad ni
  cumplimiento parcial. Entidad `inventory_reservations` (estados + expiración) →
  **INV-2** si el negocio lo exige.
- **Dos caminos de consumo:** directo (`−on_hand`) o contra reserva
  (`fulfill_reservation=true` ⇒ `−on_hand` y `−reserved` atómico, evita reservas
  huérfanas).
- Invariantes DB: `on_hand ≥ 0`, `reserved ≥ 0`, `reserved ≤ on_hand`.

### Reference Strategy
- `reference_type` / `reference_id` son **trace-only**: metadata de trazabilidad y
  reporte, **nunca** drivers de lógica de negocio.
- La matemática de stock depende **exclusivamente de `type`**. Cero ramas sobre
  `reference_type`.
- `reference_type` enum cerrado `{work_order, work_order_execution, manual,
  reconciliation}` (+`transfer` en INV-3). `reference_id` nullable, sin FK dura.
- Ningún read de correctitud hace JOIN dependiente de `reference_id`.
- Vínculos que exijan integridad fuerte (ej. WO↔consumo) usan **tablas de enlace
  dedicadas** con FK compuesta (INV-2 si se requiere), no sobrecargan `reference_*`.

## Sprint A — aclaraciones aprobadas

### Semántica de `adjustment` con cantidad negativa
`adjustment` es el **único** tipo con `quantity` con signo (CHECK
`type='adjustment' AND quantity <> 0`):
- `quantity > 0` → corrección **al alza** de `on_hand` (sobrante en conteo físico,
  devolución no registrada).
- `quantity < 0` → corrección **a la baja** de `on_hand` (merma, rotura, pérdida,
  conteo que detecta menos stock).
El RPC aplica `on_hand += quantity` (signado) y **sigue sujeto a los CHECKs**: un
ajuste negativo que dejaría `on_hand < 0` aborta, y uno que dejaría
`on_hand < reserved` también (no se puede ajustar a la baja stock reservado). El row
del ledger registra el delta exacto → trazabilidad total.

### `created_by` sin FK (preservar atribución histórica)
`inventory_transactions.created_by` es `uuid not null` **sin FK** a `auth.users`,
**idéntico a `audit_events.actor_id`** (patrón de ledger inmutable ya en producción).
Razón: la identidad del actor debe persistir aunque el usuario se elimine después;
un FK obligaría a `SET NULL` (pierde atribución) o `RESTRICT` (acopla el ciclo de
vida del usuario al inventario). El valor se captura de `auth.uid()` en el RPC (válido
al escribir); el detalle del usuario se enriquece con `LEFT JOIN` best-effort en
lectura.

## Consequences

**Positivas**
- Oversell/doble-reserva imposibles a nivel DB (lock + CHECKs), no solo en app.
- Historial y auditoría completos del stock.
- `inventory` desacoplado de `crm`/`service`; evoluciones (multi-warehouse, reservas
  de primera clase, vínculos fuertes) son pasos **aditivos** y acotados.

**Negativas / deuda aceptada**
- Snapshot derivado requiere disciplina: toda mutación pasa por RPC (UPDATE directo
  sobre `inventory_items` denegado por RLS). Mitigado con test de reconciliación.
- Referencias polimórficas sin FK (por diseño, trace-only).

## Roadmap (INV-1)
Sprint A (Schema) → B (Domain) → C (Application) → D (Infrastructure/RPCs) →
E (UI) → F (Tests, incl. concurrencia + reconciliación) → G (RLS + permisos).
