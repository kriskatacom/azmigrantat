# Capability Map: Stripe subscriptions for „Ето ме“

| Module id | Responsibility | Depends on |
|---|---|---|
| `admin-plan-config` | Manage the single paid plan price, sale availability, and active Stripe catalogue references from the authenticated business administration. | — |
| `stripe-checkout` | Create a short-lived checkout handoff from the mobile app to `business.azmigrantat.com` and start Stripe-hosted Checkout. | `admin-plan-config` |
| `subscription-entitlements` | Process verified Stripe webhooks idempotently and expose the resulting subscription entitlement. | `stripe-checkout` |
| `subscription-renewal-controls` | Default every new paid subscription to no renewal, synchronize the user's renewal choice with Stripe, and expose the control in profile subscriptions. | `subscription-entitlements` |
| `subscription-immediate-downgrade` | Immediately cancel the authenticated user's paid Stripe Sandbox subscription, revoke paid entitlement, and return the profile to the free plan after explicit confirmation. | `subscription-entitlements` |
| `play-external-payments` | Gate eligible countries/builds, obtain and persist the required Play external transaction token, and report completed transactions to Google Play. | `subscription-entitlements` |

Build order: `admin-plan-config` → `stripe-checkout` → `subscription-entitlements` → `subscription-renewal-controls` → `play-external-payments`.

## Initiative-wide constraints

- One free plan and one paid plan denominated in EUR. Every paid billing and entitlement period is exactly 30 days (`interval=day`, `interval_count=30`), never a calendar month.
- The paid price is configured by an administrator; the mobile app never contains a hard-coded price.
- Automatic renewal is disabled by default. Disabling renewal never revokes already-paid access early; it schedules cancellation at the current 30-day period end.
- Disabling sale of the paid plan blocks only new checkouts. It does not cancel or shorten existing paid subscriptions.
- A price change creates a new immutable Stripe Price for future checkouts. Existing subscriptions remain on their original Stripe Price unless a separately approved migration is executed.
- Stripe account, Product and Price identifiers are configuration/data, never application constants.
- The architecture must support switching the Stripe account used for new purchases without requiring a mobile release.
- Existing subscriptions are not assumed to be portable between Stripe accounts. Their migration is a separate, explicit operation with customer communication and Stripe-supported procedures.
- Card data is collected only by Stripe-hosted Checkout and never reaches the app or the PHP servers.
- Production payments remain disabled until Google Play program enrollment, Play API integration, legal disclosures, and an explicitly approved deployment are complete.
- No Stripe secret, webhook secret, access token, Checkout Session ID, or payment data may be written to logs or committed to the repository.
