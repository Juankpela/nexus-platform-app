# ADR-029 — Execution Outcome, Disposition & Safe Auto-Action

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Scheduling Engine — PR5 (Automation)
- **Relates:** ADR-020/022 (Field Execution), ADR-026 (Scheduling source of truth), ADR-028 (Eligibility)

## Context

PR5 is the engine's **first automation** (auto-reschedule / auto-reassign) and
the highest-risk step. The frozen rule is absolute: **timing only triggers
evaluation; the disposition authorizes the action.** `if overdue ⇒ auto-reschedule`
is forbidden — a WO can be overdue because the customer cancelled or denied
access, where auto-rescheduling is wrong. Today execution only has `unable_reason`
(free text), which cannot drive policy. So PR5 must build the outcome/disposition
layer **before** any auto-action.

## Decision

### 1. Structured `non_completion_reason` (PR5a)
field-execution gains an enum captured when a technician reports
`unable_to_complete`: `customer_absent`, `missing_skill`, `missing_part`,
`access_denied`, `weather`, `customer_cancelled`, `other`. `unable_reason` (free
text) stays as an optional note. The reason is an **execution fact**, owned by
field-execution.

### 2. Disposition = pure derivation of the reason (PR5a)
A pure mapping `reason → disposition`, fixed in code and versioned (per-tenant
config deferred), with values `reschedulable | reassignable | blocked_hold |
terminal_no_action`, and a `next_action`:

| reason | disposition | next_action |
|---|---|---|
| customer_absent | reschedulable | auto_reschedule |
| weather | reschedulable | auto_reschedule |
| missing_skill | reassignable | auto_reassign |
| missing_part | blocked_hold | hold_for_human |
| access_denied | blocked_hold | hold_for_human |
| customer_cancelled | terminal_no_action | close_no_action |
| other / unknown | blocked_hold | hold_for_human |

**Conservative default:** anything not explicitly `reschedulable`/`reassignable`
yields NO auto-action. A wrong/missing reason never escalates into an automatic
write.

### 3. Scheduling reads the disposition, not execution internals (ADR-026)
PR5b reads a **projected disposition** for a WO (derived from its latest
unable-to-complete execution). It never imports field-execution's aggregate.
execution ⟂ scheduling stays intact.

### 4. PR5b auto-action gate (double gate)
An automatic write happens only when BOTH hold:
- **WHY**: `disposition ∈ {reschedulable, reassignable}` AND not terminal AND
  within the per-WO **retry cap**.
- **WHO/WHEN**: the `EligibilityResolver` (ADR-028) resolves a valid technician +
  slot.

It operates exclusively on `work_order_assignments` (ADR-026), is **idempotent**,
audited as `actorType: system` with `requestId`, and **manual override always
wins**. Tenant-isolated.

### 5. PR5b starts as dry-run / proposal
First version **computes and audits what it would do** (a proposal), writing
nothing — like PR4 shipped read-only. Live auto-write is a later, explicit step
behind the same gate, with the retry cap preventing loops.

## Consequences

**Positivas**
- Automation is authorized by *why* work failed, not merely *when* — the frozen
  safety property holds by construction.
- Conservative defaults + dry-run-first make the first automation low-risk.
- The disposition is a small pure function; trivially testable and overrideable.

**Negativas / deuda aceptada**
- Fixed (non-configurable) mapping initially; per-tenant policy deferred.
- Disposition reflects the *latest* unable-to-complete reason; a stale or wrong
  reason mislabels — mitigated by human override and conservative defaults.

## Risks
- **Loops** (auto-action → state change → re-trigger): per-WO retry cap (export_jobs
  style) caps attempts; dry-run-first surfaces loops before any write.
- **Wrong reason → wrong action**: conservative mapping (unknown → hold), and
  manual override always wins.
- **Projection staleness**: scheduling reads the latest reason; documented.

## Future migration / compatibility (not in this ADR)
1. Per-tenant configurable `reason → disposition` policy.
2. Live auto-write activation (after dry-run validation) + retry-cap state table.
3. PR6 notifications hung off the audit events emitted here.
