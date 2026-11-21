# Specification: Stripe Sandbox subscription checkout

Status: implementation candidate; Sandbox only

## Objective

An allowlisted authenticated user in a non-production Android build can select
the single paid exact-30-day plan, leave the app for Stripe-hosted Checkout on
`business.azmigrantat.com`, complete a Stripe Sandbox card payment, return to
the app, and see the paid entitlement only after a verified Stripe webhook.

## Hard boundaries

- `PAYMENTS_ENABLED=false` remains the real-payment guard.
- `EXPO_PUBLIC_ENABLE_STRIPE_SANDBOX=false` remains fixed in the Google Play
  production build profile.
- Only `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_WEBHOOK_SECRET` are accepted by
  the Sandbox path. Test objects must report `livemode=false`.
- No PAN/CVC is collected, processed or stored by either PHP application or the
  mobile app. Card entry occurs only on Stripe-hosted Checkout.
- Sandbox access is deny-by-default and requires an active user whose normalized
  email is present in `STRIPE_SANDBOX_ALLOWED_EMAILS`.
- This test integration does not claim Google Play policy compliance for a
  public digital subscription. Production Play activation remains blocked until
  the applicable EEA external/alternative billing programme and reporting APIs
  are implemented and approved.

## Flow

1. Mobile calls authenticated `POST /api/mobile/subscription/checkout` for
   plan `paid`.
2. Auth validates both the Sandbox flag and server-side email allowlist, rejects
   existing/pending subscriptions, and stores only a SHA-256 hash of a 256-bit
   one-time token with a ten-minute redemption window.
3. Mobile opens the returned HTTPS URL on `business.azmigrantat.com`.
4. Business redeems the token through a timestamped HMAC-authenticated internal
   API. Auth creates one card-only, 30-minute Stripe Test Checkout Session and
   consumes the token.
5. Stripe redirects to the business result page. The page polls only the local
   handoff status; it never treats the browser redirect as payment proof.
6. Stripe posts a signed test event to `/webhooks/stripe`. Auth verifies the
   timestamp/signature, rejects live events, idempotently stores the event,
   synchronizes the subscription, applies the user's default renewal preference
   (`cancel_at_period_end=true`), then marks the handoff complete.
7. Business returns through `chatapp://subscription-result?status=success`.
   The app queries `/api/mobile/subscription` again and shows success only for a
   local `paid` subscription in `active` or `trialing` state.

## Failure behavior

- Expired/replayed tokens fail closed and expose no account or user identifiers.
- A second pending Checkout for the same user is rejected.
- Provider, database, HMAC or webhook failures preserve the free plan and do not
  mark the handoff complete.
- Delayed or missing webhook results remain `pending`; the UI warns the user not
  to submit a second payment.
- Cancelled Checkout returns to the app without changing entitlement.
- A plan disabled by an administrator cannot create a new handoff or Checkout
  Session. Existing subscribers retain access through their paid period.

## Acceptance tests

- Environment, lint, TypeScript and source-contract suites pass.
- New migrations pass apply, rollback and re-apply on a disposable database.
- Restricted Stripe Test key creates only test Product/Price/Checkout objects.
- A Stripe test card completes Checkout; the signed webhook creates one active
  subscription with an exact 30-day period, schedules cancellation at period
  end by default, and completes one handoff; duplicate delivery is harmless.
- The business page returns to an installed Android development/internal build
  and the app confirms the entitlement from the API.
- Production EAS profile remains unable to start Sandbox or real checkout.
