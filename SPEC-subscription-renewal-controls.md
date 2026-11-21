# Spec: `subscription-renewal-controls`

## Objective

Give every paid subscriber exactly 30 days of access per successful charge and
let the subscriber opt into or out of the next automatic 30-day renewal from
the profile subscriptions screen. Renewal is off by default.

## User-visible behavior

- A successful first payment grants access through the provider-confirmed
  `current_period_end`, exactly 30 days after the period start.
- New subscriptions immediately receive `cancel_at_period_end=true` unless the
  authenticated user has explicitly enabled renewal.
- Enabling renewal sets `cancel_at_period_end=false`; Stripe attempts the next
  charge at the current period end and starts another exact 30-day period only
  after successful payment.
- Disabling renewal sets `cancel_at_period_end=true`; access continues through
  the already-paid period and stops after its end unless a later provider event
  proves another successful period.
- The separate “Премини към безплатен план” action is an immediate cancellation:
  after explicit confirmation it cancels the Stripe subscription, disables
  renewal and revokes paid entitlement without waiting for the period end.
- The screen shows the period end and the effective provider-backed renewal
  state. A failed update restores the previous switch state and shows an error.

## API and provider contract

- `POST /api/mobile/subscription/renewal` accepts one boolean
  `auto_renewal` for the authenticated user's current paid subscription.
- `POST /api/mobile/subscription/cancel` requires
  `confirm_immediate_downgrade=true` and never accepts a subscription ID from
  the client.
- The server derives the Stripe subscription ID from its database and never
  accepts it from the client.
- The server updates Stripe first, validates the returned Test object, and only
  then persists the preference and synchronized subscription state.
- Webhook synchronization reconciles the provider flag with the user's stored
  preference. Provider errors fail the webhook so Stripe can retry.
- Stripe Test restricted credentials require Subscriptions Write permission.

## Entitlement rules

- Entitlement is based on signed webhook state plus `current_period_end`, not on
  a browser redirect or the local preference alone.
- `active` and `trialing` grant access only while the provider period has not
  ended. `past_due`, `unpaid`, `incomplete_expired`, and `canceled` do not start
  a new period.
- Turning renewal off is not immediate cancellation and must not revoke access
  before the current paid period end.

## Acceptance tests

- Catalogue creation sends `recurring[interval]=day` and
  `recurring[interval_count]=30` and validates both returned values.
- A new subscription whose user preference is absent/false is reconciled to
  `cancel_at_period_end=true`.
- Enabling and disabling renewal updates only the authenticated user's current
  subscription and mirrors the returned Stripe state.
- Provider failure leaves both the stored preference and local subscription
  unchanged.
- The mobile switch defaults off, is unavailable without an active paid
  subscription, and displays the exact provider period end.

## Boundaries

- Sandbox only until the separately gated production-payments programme work is
  complete.
- Never store card data or expose Stripe subscription/customer IDs to the UI.
- Never shorten an already-paid period when renewal is disabled.
