# ADR-028 — Technician Eligibility Engine (read-only)

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Scheduling Engine — PR4 (Eligibility)
- **Relates:** ADR-015 (Scheduling Core), ADR-026 (Scheduling source of truth), ADR-027 (Availability model)

## Context

PR3 modeled workforce capabilities (skills, zones, availability, capacity). PR4
turns that data into a **suggestion**: given a requirement, which technicians
*could* do this work. It is the convergence point of PR3 (workforce) and the
scheduling aggregate (assignments). It must be safe to ship before any
automation exists — a wrong suggestion costs nothing because a human still
assigns. The frozen rule applies: timing/eligibility never *acts*; only PR5 acts,
and only when a *disposition* authorizes it.

## Decision

### 1. Read-only, over `technicians.id`
PR4 only reads and returns candidates. It writes nothing. All joins are on
`technicians.id` (ADR-026) — **never** `work_orders.assigned_technician_id`
(which points to `auth.users` and is legacy). This is where ADR-026 becomes
load-bearing; a wrong join here silently corrupts results.

### 2. Deterministic hard filters in AND (no scoring)
A technician is eligible iff **all** hold:
- `status = active`
- holds the required skill at `meetsSkillLevel(held, required)` (PR3A helper)
- covers the required zone (PR3C)
- the requested window falls inside a weekly availability window and is not
  blocked by an exception (PR3B)
- daily capacity allows it (assignments that day `< max_work_orders_per_day`,
  and minutes + duration within the effective daily capacity)
- no overlapping active assignment in the window (`findOverlapping`, ADR-015)

NO weighted scoring / optimization / ML in PR4 (frozen). The result is a boolean
eligible set, ordered by current-day load ascending then name — a deterministic,
non-weighted tiebreak to help the dispatcher, NOT a score.

### 3. `EligibilityResolver` port = seam for future ML
The deterministic resolver implements a port. PR5 automation and a future ML/
optimization resolver implement the same port without changing callers.

### 4. Parametric requirements (WO columns deferred)
The dispatcher supplies the skill/level/zone; the time window comes from the WO's
scheduled window. `work_orders.required_skill_id` / `required_zone_id` are
deferred — eligibility stays a pure read with no WO schema change in PR4.

### 5. Timezone via a single config point
Availability windows are wall-clock (ADR-027). PR4 resolves the requested instant
against the tenant timezone using a **constant default `America/Bogota`** behind
one config point. A `tenant.timezone` column is deferred; nothing else consumes
it yet, and the whole app already assumes Bogotá.

### 6. No auto-assign; manual flow unchanged
The existing manual assignment flow is untouched. PR4 adds a read-only "eligible
technicians" panel. Auto-assignment (PR5) is gated by disposition, not here.

## Consequences

**Positivas**
- Ships safely before automation; validates eligibility quality with zero risk.
- Reuses PR3 + scheduling; no duplicated rules; `meetsSkillLevel`/`findOverlapping`
  are the single sources of truth.
- The port makes PR5 and ML drop-in.

**Negativas / deuda aceptada**
- Requirements are parametric, not declared on the WO yet (extra dispatcher input).
- Single-timezone assumption until `tenant.timezone` lands.
- "Effective daily capacity" derivation lives in one pure helper that must match
  ADR-027's intent (windows minus exceptions, capped).

## Risks
- **Dual-identity join** (ADR-026): the highest-impact risk. Eligibility queries
  must resolve technicians by `technicians.id`. Mitigation: reader ports typed to
  technician ids; reviewed in PR4.
- **Timezone correctness**: a wrong tz makes "available" wrong. Mitigation: single
  config point, deterministic, unit-tested with explicit instants.
- **Capacity drift**: count vs minutes vs windows must agree. Mitigation: one
  tested pure function.

## Future migration / compatibility (not in this ADR)
1. `tenant.timezone` column + real multi-tz resolution.
2. `work_orders.required_skill_id` / `required_zone_id` to declare requirements.
3. ML/optimization `EligibilityResolver` implementation (same port).
4. PR5 auto-assignment consuming this resolver, gated by `disposition`.
