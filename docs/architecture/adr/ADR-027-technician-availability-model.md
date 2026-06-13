# ADR-027 — Technician Availability & Capacity Model

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Scheduling Engine — PR3 (Workforce Capability Modeling)
- **Relates:** ADR-014 (Technicians), ADR-015 (Scheduling Core), ADR-026 (Scheduling source of truth)

## Context

PR3 models workforce capabilities so PR4 (eligibility) and PR5 (automation) have
the constraints they need. PR3B covers **when** a technician can work
(availability) and **how much** (capacity). This is **constraint modeling only**
— no eligibility engine, no scoring, no auto-assignment, no routing.

Two facts about the current codebase shape the design:
- `technician_status` already exists (`active|inactive|on_leave`) and gates
  assignment (only `active` is assignable) and dispatch workload.
- There is **no per-tenant timezone**; the app hardcodes `America/Bogota` for
  display. Colombia has **no DST**, but the model must not bake that in.

## Decision

### 1. Availability is stored as TIMEZONE-NAIVE wall-clock, resolved at evaluation
Weekly windows store `weekday + start_minute + end_minute` (minutes from LOCAL
midnight), **not** absolute UTC instants. The tenant timezone is applied when
availability is *evaluated* (PR4), never at storage. This is immune to DST and
timezone drift by construction: we store "Monday 09:00", not an instant. The
tenant-timezone column is deferred (nothing evaluates in PR3B); a constant
`America/Bogota` default applies until multi-timezone is a real requirement.

### 2. Windows are rows; exceptions always SUBTRACT and win
- `technician_availability`: one row per window; **multiple windows per weekday**
  allowed (union semantics). No overnight wrap in MVP (`end_minute > start_minute`);
  an overnight shift is modeled as two windows on two weekdays.
- `technician_availability_exceptions`: date range `[date_from, date_to]` with an
  optional intra-day window (`start/end_minute` null ⇒ full day). Every exception
  is **blocking** and **overrides** the weekly windows. "Positive" exceptions
  (work an unusual extra day) are deferred.

### 3. Capacity is EMERGENT from windows; only count cap is explicit
Daily time capacity = sum of that weekday's window minutes, minus exceptions —
no stored column needed. Two **optional** columns on `technicians` capture the
orthogonal constraints: `max_work_orders_per_day` (a count cap, not derivable
from time) and `max_minutes_per_day` (an optional ceiling, effective time =
`min(window minutes, cap)`). Null = no explicit cap. No separate capacity table.

### 4. Status (lifecycle) and availability (temporal) are SEPARATE axes
`technician_status` stays the **lifecycle** axis. Day-to-day "unavailable" is
modeled by windows + exceptions, **not** by a status value — modeling it in both
places would be two sources of truth for the same fact. We do NOT add an
`unavailable` status nor a second operational-status field. Richer lifecycle
states (`onboarding`, `suspended`) would extend the existing enum if ever needed.

### Conventions (consistent with ADR-014/015)
Tenant-scoped, RLS gated by `service.technicians.read/write`, composite FK
`(technician_id, tenant_id) → technicians`, `set_updated_at` trigger, additive +
idempotent migrations.

## Consequences

**Positivas**
- Timezone-safe and DST-safe by design, without a timezone column yet.
- Capacity needs no new table; windows are the single source of working time.
- One unambiguous axis for "can work" (status=lifecycle, availability=temporal).
- PR4 `isAvailable(tech, slot)` and capacity checks are pure reads over this model.

**Negativas / deuda aceptada**
- No overnight-wrap windows (modeled as two rows). Acceptable for SMB field work.
- Timezone resolution is deferred to PR4 (PR3B stores but does not evaluate).
- `max_minutes_per_day` partially overlaps window-derived time; documented as an
  optional ceiling, not the primary source.

## Risks
- **Capacity drift**: if PR4 derives time from windows incorrectly vs. the count
  cap, results mislead. Mitigation: a single pure helper computes effective
  daily capacity; tested in isolation.
- **Dispatch 480 coexistence**: the hardcoded 480 in dispatch is NOT rewired in
  PR3B (no behavior change). Until PR4 consumes capacity, dispatch keeps 480.
  Documented to avoid a silent half-migration.
- **Timezone debt**: deferring the tenant-timezone column is safe only because
  PR3B does not evaluate; PR4 MUST introduce tz resolution before using windows
  for real scheduling decisions.

## Future migration / compatibility (not in this ADR)
1. PR4 introduces tenant-timezone resolution (column or config) and the pure
   `isAvailable` / effective-capacity evaluation over this model.
2. Dispatch's hardcoded 480 is replaced by window-derived capacity at that point,
   with its own review.
3. Route optimization (future) consumes windows for time bounds and zones (PR3C)
   for space — no change to this schema.
