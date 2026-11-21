# Stripe Sandbox subscriptions — completion checklist

Last updated: 2026-11-06

## Completed in code and production (dormant)

- [x] Integer-cent EUR/exact-30-day price policy and Test-mode-only Stripe catalogue adapter.
- [x] Local implementation for administrator sale availability and a
  provider-backed auto-renewal control that defaults off. This revision is not
  deployed yet.
- [x] Additive `paid_plans`, `paid_plan_price_changes` and
  `subscription_checkout_handoffs` schema.
- [x] Admin-only, HMAC-protected read/change API with optimistic versioning and
  an append-only price-change ledger.
- [x] Protected business admin page with CSRF confirmation and “new
  subscriptions only” disclosure.
- [x] One-time application-to-site handoff. Only a hash of the 256-bit handoff
  token is stored; the token is invalidated after Stripe Checkout creation.
- [x] Stripe-hosted, card-only Test Checkout session with a 30-minute expiry.
- [x] Signed webhook verification, five-minute replay window and idempotent
  event ledger. Only a verified webhook can activate a subscription.
- [x] Site status polling and `chatapp://subscription-result` return flow.
- [x] Mobile result screen rechecks the authenticated subscription API instead
  of trusting a deep-link success value.
- [x] Explicit server-side tester allowlist and Test-key format checks.
- [x] `PAYMENTS_ENABLED=false` retained. The Google Play production profile has
  `EXPO_PUBLIC_ENABLE_STRIPE_SANDBOX=false`.
- [x] Encrypted production backup and disposable restore rehearsal accepted.
- [x] Additive migrations deployed and production smoke boundaries verified.

## Automated verification completed

- [x] PHP syntax checks for all changed auth/business files.
- [x] PHP direct tests, including `PaidPlanPricePolicyTest.php`.
- [x] Disposable migration up/down/reapply rehearsal.
- [x] Expo lint.
- [x] TypeScript `tsc --noEmit`.
- [x] Vitest: 22 files / 111 tests.
- [x] EAS environment validation for development, staging and production.
- [x] Production HTTP boundaries: login 200, unauthenticated subscription 401,
  unsigned admin API 403, checkout result 200, admin page redirect 302.

## Provider/device gates still required

- [ ] Restore working Chrome Browser plugin page inspection. Chrome connection,
  current tab discovery, exact Stripe Test tab claim, title and URL reads work,
  but DOM and screenshot inspection still fail inside the plugin with `Cannot
  read properties of undefined (reading 'timeoutMs')`. A Chrome extension
  reinstall produced a fresh connected session but DOM, screenshot, read-only
  CDP and a fresh agent tab still fail at the same boundary. A full restart of
  both Codex and Chrome also produced fresh tab IDs but did not restore DOM or
  screenshot access. The same failure occurs on `example.com` navigation and
  DOM inspection of the existing business-site tab, confirming a general
  Chrome page-control defect rather than a Stripe-specific issue; do not bypass
  the authenticated browser session.
- [x] Complete user-controlled Stripe login/MFA in the Codex in-app browser and
  verify the exact account in Sandbox mode. DOM and screenshot inspection show
  `Sandbox` with `Switch to live account`; Stripe's read-only Dashboard context
  reports account `acct_1UT0FfBAceHEGRPg` and `livemode=false`. No credentials
  were entered by the agent and no Stripe object was changed.
- [ ] Obtain action-time confirmation immediately before creating a
  least-privilege Stripe Sandbox restricted key, Product, Price and webhook.
- [x] Confirm the exact existing application-account email for the server-side
  Sandbox tester allowlist: `techsolutionbg@gmail.com`.
- [x] Confirm the initial Test price: `10.00 EUR` per exact 30-day period.
- [ ] Store the restricted Test key and webhook signing secret only in the auth
  production environment; never in Git or the business site.
- [ ] Create the initial price through the deployed admin flow and verify the
  local mapping against the Stripe Sandbox account.
- [ ] Enable `STRIPE_SANDBOX_ENABLED=true` only after the provider configuration
  probe passes. Keep `PAYMENTS_ENABLED=false`.
- [x] Complete and verify staging/internal Android build
  `593aaafc-2c5f-4363-b0e9-410b2785610f`. The downloaded APK is
  `google-play-release/eto-me-staging-v1.0.0-build-9-593aaafc.apk`, SHA-256
  `41cc8b839079bbfeb9c117318d95cbea29fe90a6a95d9c3c0ecb26845c757650`;
  archive and manifest checks confirmed `com.etome.app`, version code 9. It was
  not submitted, published or installed.
- [ ] With separate action-time confirmation, execute one Stripe Test-card
  transaction and verify webhook, subscription activation, site-to-app deep
  link and authenticated mobile status on a real Android device.
- [ ] Disable Sandbox again or keep it restricted to the confirmed tester after
  the evidence is captured.

## Google Play production gate

External payment for a digital subscription must not be enabled in the public
Play build until the applicable Google Play programme enrollment, user-choice
screen, external transaction token and transaction reporting requirements have
been implemented and approved. Stripe Sandbox validation does not satisfy that
policy gate.
