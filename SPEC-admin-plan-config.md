# Spec: `admin-plan-config`

## Objective

Provide an authenticated administration page reachable from the administration of `business.azmigrantat.com` where an administrator can view and change the EUR price for the single exact-30-day paid „Ето ме“ plan and independently enable or disable new sales.

The auth/billing backend remains the system of record. The business site is the administration surface and must not receive or persist Stripe secret keys. On a confirmed price change, the billing backend creates a new immutable Stripe Price in the currently selected Stripe environment/account, records it as the active price for new purchases, and retains the previous Price reference for audit and existing subscriptions.

### User stories

- As an administrator, I can see the currently active paid-plan amount, currency, interval, Stripe mode and last change time.
- As an administrator, I can enter a new valid amount, review the consequences, and confirm the change.
- As an administrator, I can disable new paid-plan purchases without cancelling or shortening existing subscriptions, and later enable them again.
- As an administrator, I cannot accidentally change existing subscribers to the new amount.
- As an operator, I can replace the Stripe account credentials and catalogue mapping for future purchases without releasing a new mobile build.
- As an auditor, I can determine who changed the price, when it changed, and which old/new Stripe Price IDs were involved without exposing secrets.

## Tech Stack

- Business administration: custom PHP MVC under `business/`.
- Billing authority: custom PHP application under `auth/`, Eloquent models and Phinx migrations.
- Provider: Stripe Billing/Checkout API called only from the auth backend.
- Storage: auth MySQL database for plan configuration and immutable price-change history.
- Authentication: existing business administrator session plus a server-to-server
  HMAC request signed with a dedicated billing-admin secret. The auth backend
  resolves the signed administrator email to its own user and independently
  requires an active `admin` role. The shared secret never reaches the browser.

## Commands

- PHP syntax checks when PHP is available:
  - `php -l business/app/Controllers/SubscriptionPlanAdminController.php`
  - `php -l auth/app/Controllers/Api/AdminSubscriptionPlanController.php`
- Auth migrations dry status:
  - `cd auth && vendor/bin/phinx status -c phinx.php`
- Contract tests:
  - `cd app/chat-app/tsconfig && npx vitest run tests/unit/subscription-plan-admin-contract.test.ts`
- Repository whitespace validation:
  - `git diff --check`

## Project Structure

- `business/app/Controllers/` — authenticated administration controller and validation of submitted UI data.
- `business/app/Views/admin/` — paid-plan administration page and explicit confirmation UI.
- `business/routes/` — admin-only GET/POST routes protected by both existing authentication and admin middleware.
- `business/app/Services/` — narrow server-to-server client for the billing admin API; never stores Stripe credentials.
- `auth/app/Controllers/Api/` — admin-only plan configuration API.
- `auth/app/Services/` — Stripe catalogue adapter and plan configuration service.
- `auth/app/Models/` — active plan configuration and append-only price history.
- `auth/database/migrations/` — backward-compatible tables/indexes for configuration and history.
- `app/chat-app/tsconfig/tests/unit/` — source-level security and integration contract tests.

## Code Style

Use typed, small PHP methods and fail closed before provider calls:

```php
public function changeMonthlyPrice(User $actor, int $amountCents): PaidPlanPrice
{
    $this->assertAdministrator($actor);
    $this->assertValidAmount($amountCents);

    return $this->database->transaction(
        fn () => $this->activateNewStripePrice($actor, $amountCents)
    );
}
```

- Monetary values are integer cents, never floats.
- Currency is the lowercase ISO code `eur`; Stripe interval is `day` with `interval_count=30`.
- Public error messages never contain raw Stripe responses or credentials.
- Provider-specific identifiers stay behind the billing service boundary.
- POST requests require CSRF protection in addition to authenticated admin access.

## Functional Requirements

1. The page shows the active amount formatted as EUR/30 days, sale availability, and clearly identifies Test/Sandbox versus Live mode.
2. The form accepts a decimal EUR input, converts it deterministically to integer cents, and rejects zero, negative, malformed or out-of-policy amounts.
3. Saving requires a second confirmation that states: the change applies only to new subscriptions.
4. The auth backend verifies the request timestamp/body HMAC, resolves the signed
   actor email to its own active user and requires the `admin` role. It does not
   trust a role field sent by the business site.
5. The Stripe Product is stable within one Stripe account. Each amount change creates a new recurring Stripe Price with `interval=day` and `interval_count=30`.
6. The new Price becomes active only after Stripe confirms successful creation and the database transaction records the mapping/history.
7. Failure to create the Stripe Price leaves the previously active configuration unchanged.
8. The old Stripe Price is not deleted. It may be deactivated for new purchases only after the new price is active.
9. Every change records actor user ID, old/new amount, old/new Stripe account fingerprint, old/new Product and Price IDs, environment, timestamp and outcome. No secrets are recorded.
10. Read APIs expose the configured amount and public plan metadata, never Stripe secret keys.
11. Disabling the plan blocks new handoffs and Checkout Sessions and makes the mobile purchase control disabled with the label „Безплатно“ instead of a paid price.
12. Plan availability changes never alter existing Stripe subscriptions, their price, renewal preference, or paid entitlement end.

## Stripe Account Portability

- Credentials are supplied only through the existing protected environment configuration mechanism and selected by environment.
- The database stores a non-secret Stripe account identifier/fingerprint with each Product/Price mapping.
- Activating a different Stripe account requires an explicit catalogue bootstrap in that account, followed by activation of its Product/Price mapping for new purchases.
- Webhook endpoints must support a bounded transition window in which events from the previous account and the new account can be verified with separate signing secrets.
- Existing customer, payment method and subscription objects remain owned by the original Stripe account. Their migration or recreation is out of scope for this module and must never happen automatically.

## Testing Strategy

- Unit tests for decimal-to-cents parsing, bounds and currency/interval invariants.
- Authorization tests proving non-admin and unauthenticated requests cannot read or write the configuration.
- CSRF contract test for the business administration form.
- Provider adapter tests with mocked Stripe responses: success, authentication failure, rate limit, malformed response and timeout.
- Transaction test proving failed Stripe Price creation does not change the active local price.
- History test proving a successful change preserves the previous mapping.
- Manual Sandbox verification only after action-time authorization to create the Stripe Product/Price and restricted key.

## Boundaries

### Always

- Keep payment amounts in integer cents.
- Re-authorize every write on the auth backend.
- Use Stripe Test/Sandbox mode until a separately approved production activation.
- Use Stripe-hosted payment collection; never accept PAN/CVC in these forms or APIs.
- Preserve old Price mappings and produce an audit entry for every attempted change.

### Ask first

- Create or rotate Stripe restricted/API keys or webhook signing secrets.
- Create a Stripe Product or Price, even in Sandbox.
- Add or run database migrations.
- Deploy either PHP application.
- Enable `PAYMENTS_ENABLED` or any mobile payment feature flag.
- Migrate existing subscriptions to a new price or Stripe account.

### Never

- Commit, display or log Stripe secrets.
- Store card numbers or CVC values.
- Trust a price, user ID, role or entitlement supplied by the mobile client.
- Modify existing subscriber pricing implicitly when the admin changes the displayed plan price.
- Enable the Play-distributed checkout before the applicable Google Play program and reporting integration are complete.

## Success Criteria

- An authenticated administrator can view the active Sandbox plan amount and sale availability from the business administration.
- A confirmed valid price change creates exactly one new exact-30-day Stripe Price and makes it the only Price used by subsequent test Checkout Sessions.
- Invalid, unauthenticated, non-admin, duplicate and failed provider requests do not alter the active configuration.
- Existing subscriptions and their Price IDs remain unchanged.
- No Stripe secret is present in the business project, mobile application, database audit fields, logs or source control.
- Switching the configured Stripe account changes only the catalogue used for future purchases and requires no mobile release.
- Automated authorization, validation, transaction and source-contract tests pass.

## Open Questions

- Define the allowed minimum and maximum 30-day price. Proposed safe administration bounds: `0.50 EUR` through `1,000.00 EUR`.
- Decide whether an old Stripe Price should be automatically deactivated after the new one is active, or retained as active but unused. Proposed default: deactivate it for new purchases while preserving existing subscriptions.
