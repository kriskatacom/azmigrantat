# ADR-002: Paid-plan downgrade is an explicit immediate cancellation

## Status

Accepted

## Date

2026-11-06

## Context

„Ето ме“ already lets a paid subscriber disable automatic renewal while retaining access through the paid 30-day period. A separate request to deactivate the paid plan must therefore have distinct behavior and must not be another label for `cancel_at_period_end`.

## Decision

- “Премини към безплатен план” requires an explicit destructive confirmation in the mobile UI.
- `POST /api/mobile/subscription/cancel` derives the active Stripe subscription from the authenticated user and requires `confirm_immediate_downgrade=true`; the client never supplies a Stripe identifier.
- The server immediately cancels the Stripe Sandbox subscription, persists the returned canceled state, disables renewal and revokes paid entitlement.
- A durable `subscription_cancellation_requests` row records pending, provider-applied, completed and failed outcomes. Signed Stripe webhooks finish reconciliation after a local persistence failure.
- Repeating an already-completed downgrade is idempotent and does not call Stripe again.
- This remains Sandbox-only while real payments are disabled.

## Alternatives considered

### Set `cancel_at_period_end=true`

Rejected because that behavior already belongs to the automatic-renewal switch and intentionally preserves paid access until the end of the period.

### Change only the local plan

Rejected because Stripe would continue to hold an active subscription and could renew it, leaving provider and entitlement state inconsistent.

### Accept a Stripe subscription ID from the app

Rejected because the authenticated user and server-side subscription record are the authority; client-supplied provider identifiers could target another subscription.

## Consequences

- The user loses paid features immediately after Stripe confirms cancellation.
- The linked-company card disappears from the public profile because entitlement becomes false.
- The user may start a new paid checkout later if the paid plan remains available.
- Disabling automatic renewal remains the non-destructive option for keeping access through the already-paid period.
