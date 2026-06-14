# ADR-032 — Human-triggered reschedule (activate write from proposals)

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Scheduling Engine — PR5b activation (human-in-the-loop)
- **Relates:** ADR-026 (source of truth), ADR-028 (eligibility), ADR-029 (disposition/dry-run), ADR-031 (assignment consolidation)

## Context

The dry-run reschedule proposals (ADR-029) are validated in prod, and UX feedback
is clear: the panel shows but doesn't let you act. We activate the write — but
**human-triggered**, not autonomous. The cron stays dry-run/proposal-only; a
dispatcher clicks to apply. This is strictly safer than auto-write and aligns
with "manual override always wins".

## Decision

### 1. Two actions per proposal, both WRITE via the scheduling aggregate
- **Reagendar (mismo técnico)** — reassign the WO to the same technician at the
  recomputed next slot.
- **Reagendar con técnico sugerido** — auto-pick the best eligible alternative
  (least-loaded, available, no overlap) for that slot, and reassign to them.

Both write `work_order_assignment` on `technicians.id` (ADR-026), reusing the
validated `assignWorkOrder`/`reassignWorkOrder` use-cases (active-tech + overlap
checks + audit). A **confirmation dialog** precedes every write.

### 2. Recompute server-side on click (don't trust the stored proposal)
The action takes only the work order id. It re-derives the candidate (latest
unable execution → technician, duration, availability), recomputes the next slot
with `findNextSlot`, and converts the local slot to a UTC instant via the tenant
timezone. The persisted dry-run proposal is a hint, not the source of truth.

### 3. Suggested technician = eligibility for that slot (PR4)
For the suggested mode, run the `EligibilityResolver` for the computed slot,
exclude the current technician, and take the top eligible (ordered by day-load).
**Caveat:** the WO does not declare `required_skill_id/zone_id` yet (deferred), so
the suggestion is by availability/capacity/no-overlap, NOT skill match — surfaced
in the UI.

### 4. Human-in-the-loop, not autonomous
The scanner/cron remains dry-run (proposes, never writes). Only this UI path
writes, on a human click + confirm. No retry cap needed (a human decides each
one). Audited; override always wins.

## Consequences
**Positivas**
- Activates the engine's value safely; the dispatcher acts in one click.
- Reuses everything: findNextSlot, EligibilityResolver, assign/reassign use-cases.
- Keeps the autonomous-write line uncrossed (still deferred).

**Negativas / deuda aceptada**
- Suggested tech is not skill-matched until WO requirement columns land.
- Recompute-on-click may pick a slightly different slot than the shown proposal
  if data changed since the scan — acceptable (fresher is better); the confirm
  dialog shows the actual target.

## Risks
- **Local→UTC conversion** must be correct (tenant tz). Mitigation: one helper,
  unit-tested.
- **Concurrency**: two dispatchers acting on the same WO → the overlap check +
  last-write-wins; manual override is the intended model.

## Future
1. WO `required_skill_id/zone_id` → skill-matched suggestions.
2. Optional autonomous activation (still gated, with retry cap) once human-path
   usage validates the matching quality.
