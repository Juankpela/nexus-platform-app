# ADR-031 — Assignment Consolidation (resolves ADR-026 debt)

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Scheduling — assignment consolidation
- **Relates:** ADR-015 (Scheduling Core), ADR-026 (Scheduling source of truth — debt resolved here)

## Context

ADR-026 froze `work_order_assignments` as the single source of truth for
scheduling and deferred deprecating `work_orders.assigned_technician_id`. That
deferral became a real UX defect: the Work Order detail's "Assign technician"
control writes only the **legacy** `assigned_technician_id` (a tenant **user**),
while the dispatch board and `/worker` read **`work_order_assignments`** (a
**technician** + time slot). The two never meet — a WO can show "Sin asignar" in
the list yet appear on a technician's board (observed: WO-2026-0020). Two assign
paths, two identity spaces, one confused operator. We resolve it now.

## Decision

### 1. One assignment authority
Assigning/reassigning/unassigning a technician on the Work Order goes through the
**scheduling aggregate** (`assignWorkOrder` / `reassignWorkOrder` /
`unassignWorkOrder`), creating/updating a `work_order_assignment` keyed on
`technicians.id` (ADR-026). `/schedule` and the WO detail converge on the same
use-cases and rules (active technician, half-open no-overlap) — no duplicated logic.

### 2. "Current technician" is DERIVED
A WO's current technician is derived from its **active assignment** (status
`scheduled`/`in_progress`, most recent). The WO list and detail read this; they
**stop reading `assigned_technician_id`**. This removes the dual source of truth.

### 3. `assigned_technician_id` deprecated (not dropped)
It is no longer the UI source. It is NOT migrated or dropped now — the
field-execution projection may keep writing it as a harmless mirror. Dropping the
column (after backfill, if ever needed) is a future migration.

### 4. Assign dialog = technician + window
The WO assign dialog picks a **technician** (from `technicians`) and a time
window, defaulting to the WO's `scheduled_start/end`. An assignment requires a
valid window; with none, the dialog asks for one. Reassign/unassign act on the
WO's active assignment.

## Consequences

**Positivas**
- Single, unambiguous assignment model; the list, board and `/worker` agree.
- Identity unified on `technicians.id` (ADR-026 honored end-to-end).
- The frozen eligibility/auto-reschedule work (PR4/PR5) already targets the same
  aggregate, so this aligns the manual path with the automated one.

**Negativas / deuda aceptada**
- The list derives the technician per WO from active assignments — a batched read
  (one query per page, grouped). Acceptable at SMB scale.
- `assigned_technician_id` lingers as a deprecated mirror until a future drop.

## Risks
- **Identity slip** (ADR-026): the consolidated control must resolve technicians
  by `technicians.id`, never the legacy user id. Reviewed in implementation.
- **WO without a window**: cannot be scheduled until a window is set — surfaced
  in the dialog, not a silent failure.

## Future migration / compatibility
1. Backfill assignments from legacy `assigned_technician_id` if any are needed.
2. Drop `work_orders.assigned_technician_id` after the deprecation period.
