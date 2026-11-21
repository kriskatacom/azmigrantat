# Stripe Sandbox subscription module — deployment status

Date: 2026-11-06  
Scope: test-only subscription flow; no live payments and no Google Play release

## Current production state

- The reviewed auth and business-site code is deployed.
- Migrations `20261106153000` and `20261106154500` are applied.
- Shared auth-to-business request secrets are installed with mode `0600` and
  were compared without printing their values.
- `PAYMENTS_ENABLED=false`.
- `STRIPE_SANDBOX_ENABLED=false`.
- The Stripe Test key, webhook secret, tester allowlist and initial Test Price
  are not installed yet.
- Production maintenance mode is off.
- EAS internal staging build `593aaafc-2c5f-4363-b0e9-410b2785610f` finished
  successfully for `com.etome.app`, version code 9, profile `staging`, with
  `INTERNAL` distribution. The verified APK is
  `google-play-release/eto-me-staging-v1.0.0-build-9-593aaafc.apk` (SHA-256
  `41cc8b839079bbfeb9c117318d95cbea29fe90a6a95d9c3c0ecb26845c757650`).
  Android manifest inspection independently confirmed package
  `com.etome.app`, version code 9 and version name 1.0.0. The APK has not been
  submitted, published or installed on a device.
- EAS created a separate remote staging keystore because the staging profile
  did not already have one. The production profile still uses its existing
  local keystore; the new staging key is not a Play upload/signing key.

The module is therefore online but dormant: it cannot create a Checkout session
or accept a Stripe webhook until the remaining Sandbox provider gates pass.

## Safety evidence

- Backup ID: `20261106T155446Z`.
- Encrypted auth, business, legal and database backups exist on the server and
  in the off-host backup location.
- Disposable file restores verified auth (50,983 entries), legal (394 entries)
  and business (5,156 entries) with zero failures.
- Disposable MariaDB restore verified 31 tables, migration ledger
  `20261022000000`, schema signature and HMAC equality for the two existing
  payment-method rows. No card values were printed or changed.
- Migration up/down/reapply rehearsal passed before production activation.
- Rollback source is
  `/home/azmigran/backups/google-play-release-staging/stripe-rollback-20261106T155446Z`.
- A fresh read-only production probe passed after the EAS artifact check:
  `PAYMENTS_ENABLED=false`, `STRIPE_SANDBOX_ENABLED=false`, shared secrets
  matched, migration ledger `20261106154500`, two payment-method rows, and zero
  subscription and billing-event rows. Only safe aggregate values were read;
  no secret or payment-method content was printed.

## Post-deployment smoke evidence

| Check | Expected | Result |
|---|---:|---:|
| Production maintenance flag | off | off |
| `/users/login` | 200 | 200 |
| unauthenticated `/api/mobile/subscription` | 401 | 401 |
| unsigned `/api/admin/paid-plan` | 403 | 403 |
| business checkout result page | 200 | 200 |
| unauthenticated business admin plan page | redirect | 302 |
| Expo lint | pass | pass |
| TypeScript | pass | pass |
| Vitest | 22 files / 111 tests | pass |
| EAS environment contract | development/staging/production | pass |

## Remaining blocker

The authenticated Stripe Sandbox tab is visible and claimable in Chrome. Its
exact title and URL were revalidated as `Home – Tech Solution sandbox – Stripe
[Test]` and
`https://dashboard.stripe.com/acct_1UT0FfBAceHEGRPg/test/dashboard`.
The installed Browser/Chrome plugin still fails on DOM and screenshot page
inspection with an internal `timeoutMs` error. The official Chrome/browser
troubleshooting path was followed; no alternative browser automation or
authentication bypass was attempted. Visual confirmation is now available
through the explicitly approved Codex in-app browser. Stripe object creation
remains gated on deployment of the newly approved exact-30-day renewal revision
and fresh action-time confirmation.
Reinstalling the Chrome extension created a fresh connected extension session
and tab discovery/claim continued to work, but did not resolve the defect.
Playwright DOM inspection, screenshot, the advertised read-only CDP capability
and navigation in a fresh agent-owned Chrome tab all failed at the same
page-control boundary.
A subsequent full restart of both Codex and Chrome produced a new browser
session and fresh Stripe/business tab IDs, but the exact claimed Stripe Test
tab still failed Playwright DOM, visible DOM and screenshot inspection with the
same internal error. Title and URL reads remain functional.
The defect was then reproduced outside Stripe: an agent-owned `about:blank` tab
could be created but could not navigate to `https://example.com/`, and the
already-open `https://business.azmigrantat.com/` tab exposed its title/URL but
failed both DOM inspection paths with the same `timeoutMs` error. The blocker is
therefore in the general Chrome page-control layer, not the Stripe Dashboard.
The Codex in-app browser was tested as an explicitly approved alternative. It
successfully navigated to Stripe and returned both a DOM snapshot and a visual
screenshot. After the user personally completed authentication and MFA, the
exact Dashboard tab was claimed and verified visually as `Sandbox`, with a
`Switch to live account` control. Stripe's read-only Dashboard context reported
account `acct_1UT0FfBAceHEGRPg` and `livemode=false`. No credentials were entered
by the agent and no Stripe object was created or changed.

Persistent Stripe objects and credentials still require a fresh action-time
confirmation immediately before creation. The price and tester identity are
now confirmed below.

## Exact-30-day revision (local, not deployed)

- The user confirmed that one paid period is always exactly 30 days, not a
  calendar month. The catalogue contract is now `interval=day` with
  `interval_count=30`.
- Initial Sandbox price: `10.00 EUR` per 30 days. Confirmed allowlisted active
  application profile: `techsolutionbg@gmail.com`.
- New subscriptions default to no renewal by reconciling Stripe
  `cancel_at_period_end=true`. The profile subscription control changes the
  provider value; disabling it preserves access through the paid period.
- Administration can independently enable or disable new purchases. Disabling
  sales does not alter existing subscriptions.
- This revision has passed the full 22-file/111-test Vitest suite, Expo lint,
  TypeScript, read-only PHP 8.4 container lint, and the direct price-policy test.
- No Stripe Product, Price, restricted key, webhook destination, or production
  environment value has been created or changed for this revision.

## Rollback

If a post-enable problem occurs: re-enable maintenance, set
`STRIPE_SANDBOX_ENABLED=false`, retain `PAYMENTS_ENABLED=false`, run the reviewed
rollback helper for release `20261106T155446Z`, refresh/revalidate OPcache, rerun
the boundary probes, and only then remove maintenance. The two additive tables
may remain unused; dropping them or deleting provider/data records is not part
of this rollback.
