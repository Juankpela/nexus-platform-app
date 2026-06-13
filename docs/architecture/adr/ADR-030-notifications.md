# ADR-030 — In-App Notifications (shared infrastructure)

- **Status:** Accepted
- **Date:** 2026-06-13
- **Sprint:** Notifications — PR6
- **Relates:** ADR-020 (events as audit emission points), ADR-029 (scheduling auto-action), Billing (money loop)

## Context

The platform emits meaningful signals (SLA degradation, reschedule proposals,
field-execution events, and money-loop events like invoice issued / payment
received) but they all **die in the audit trail or a server-rendered panel** —
no human is actively informed. There is no notification channel, no email, no
event bus. PR6 adds the first delivery channel as **shared infrastructure**,
reusable across scheduling and the money loop.

## Decision

### 1. In-app first, channel behind an abstraction
A `notifications` table + a bell in the workspace shell. Delivery sits behind a
small port so an email channel (Resend/SES) plugs in later without touching
callers. No external dependency, no API keys, multi-tenant safe.

### 2. Per-user fan-out
The trigger resolves recipients — tenant members holding the relevant permission
(e.g. `service.scheduling.read`) — and inserts ONE notification row per user
(`recipient_user_id`). The bell queries `where recipient_user_id = me`, so reads
and per-user read-state are trivial. Acceptable fan-out for SMB tenants.

### 3. Idempotent triggers at already-deduplicated emission points
MVP hooks the SLA scanner's **transition** points (the `work_order_alert_state`
cursor already emits once per degradation/escalation), so a WO is notified once,
not every cron run. Reschedule proposals (dry-run, re-emitted daily) and
money-loop events plug in later, each with its own dedup.

### 4. Derived at emission points, not via a bus
A `createNotification` use-case is invoked alongside the existing emission (no
event bus yet, consistent with ADR-020). Notification failure must never break
business state (isolated, swallow-on-error like audit).

### 5. Multi-tenant + RLS
`tenant_id` + `recipient_user_id`. RLS: a user reads/updates only their own
notifications. The scanner writes via the service role.

## Consequences

**Positivas**
- Everything already built (PR2 alerts, PR4/PR5 outputs, field events) and the
  money loop become actionable through one mechanism.
- No external dependency; demoable immediately; email is an additive channel.
- Per-user model keeps the read path and read-state dead simple.

**Negativas / deuda aceptada**
- Fan-out writes N rows per event (fine at SMB scale; revisit for large tenants).
- No preferences/opt-out, no realtime push (bell refreshes server-side) yet.
- Only SLA transitions notify in MVP; other triggers are follow-ups.

## Risks
- **Spam / fatigue**: mitigated by hooking only deduplicated transition points.
- **Recipient-resolution cost**: a membership+permission query per trigger; small
  at SMB scale, cache/optimize later.
- **Notification ≠ business state**: creation is isolated and swallow-on-error.

## Future migration / compatibility (not in this ADR)
1. Email channel behind the same port (+ preferences/opt-out).
2. Triggers for reschedule proposals and money-loop events (invoice/payment).
3. Realtime push (Supabase Realtime) for the bell.
