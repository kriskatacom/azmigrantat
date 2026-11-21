# Implementation Plan: Stripe paid-plan administration

## Scope

This plan implements only the approved `admin-plan-config` module from
`SPEC-admin-plan-config.md`. Checkout handoff, webhook entitlements, mobile deep
links and Google Play external-payment reporting remain separate downstream
modules.

The existing `tasks/plan.md` and `tasks/todo.md` track unfinished video
infrastructure work and are intentionally not modified.

## Architecture Decisions

- The auth application owns paid-plan configuration, Stripe credentials and
  catalogue mutations. The business application is only an authenticated
  administration surface.
- The active amount is stored as integer cents in the auth database. EUR and an
  exact 30-day interval (`day` × 30) are fixed invariants for this first plan.
- A price change is a two-step server-side operation: create a new Stripe Price,
  then atomically activate its local mapping and append an audit record.
- Stripe Product/Price/account identifiers are data, not constants. The active
  mapping includes a non-secret account ID so future account switching is
  detectable and auditable.
- The business server calls a narrowly scoped auth admin API with a timestamped
  body HMAC and signed administrator email. The auth API independently resolves
  that email to its own active `admin` user. The shared internal secret stays in
  server environments and is never exposed to the browser.
- The Stripe provider is hidden behind an adapter so unit tests do not make
  external API requests and a future account change does not affect mobile code.
- Old Stripe Prices are archived for new purchases only after the new mapping is
  committed. Existing subscriptions are never updated by this module.

## Dependency Graph

```text
validation + provider contract
        ↓
plan configuration/history schema + models
        ↓
auth admin read/change service and API
        ↓
business admin proxy/service and form
        ↓
sandbox catalogue verification
```

## Task List

Tasks are tracked in `tasks/stripe-subscriptions-todo.md` because the default
task files contain a different incomplete project.

### Phase 1: Provider-neutral foundation

- Task S1: Add price parsing/policy and a testable Stripe catalogue contract.
- Task S2: Add backward-compatible plan configuration and audit-history schema.

### Checkpoint: Foundation

- Validation and provider failure paths have focused tests.
- Migration is additive and has a safe rollback that does not touch subscriptions.

### Phase 2: Auth-owned administration slice

- Task S3: Implement atomic active-price changes and account-aware history.
- Task S4: Expose read/change operations through an admin-only auth API.

### Checkpoint: Billing authority

- Non-admin, invalid, duplicate and provider-failure requests cannot change the active mapping.
- Existing subscriptions are never updated.

### Phase 3: Business administration surface

- Task S5: Add the business server API client and protected plan settings page.
- Task S6: Add confirmation UX, CSRF enforcement and audit/status presentation.

### Checkpoint: Administration

- An authenticated admin can view and request a Sandbox price change.
- No Stripe secret exists in the business project or browser response.

### Phase 4: Sandbox configuration and verification

- Task S7: Create restricted Sandbox catalogue credentials, Product/Price and verify one controlled price change.

### Checkpoint: Module complete

- All automated checks pass.
- Stripe Sandbox shows the Product and active recurring Price.
- The local active mapping matches Stripe without exposing credentials.
- Production flags and credentials remain unchanged.

## Verification Strategy

- Source contract tests run through Vitest from `app/chat-app/tsconfig`.
- PHP unit/service tests run in the existing isolated PHP 8.4 staging container
  when available; no production database is used.
- Migration rehearsal uses an isolated staging database and records before/after
  schema plus rollback evidence.
- Stripe verification uses Sandbox only and inspects non-secret object IDs and
  mode. It does not execute a real charge in this module.
- `git diff --check`, targeted secret-pattern scans and review of the final diff
  are required at each checkpoint.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| Partial state if Stripe succeeds but DB activation fails | High | Idempotency key derived from a persisted change request; recover/reconcile the created Price before retrying. |
| Business admin token is over-privileged or leaked | High | Server-side session only, narrow API, no token in HTML/URL/logs, independent admin authorization. |
| Price changed twice by concurrent requests | High | Database row lock/version check and idempotent request key. |
| Wrong Stripe account/environment | High | Verify `livemode=false`, store non-secret account ID, show account/mode before confirmation. |
| Old subscriptions unexpectedly repriced | High | Never call subscription update APIs; archive only the old Price for future purchases. |
| Account switch strands webhooks | High | Account-aware mappings and dual-secret transition are designed now; migration remains separately approved. |
| Google Play rejection | High | No production/mobile checkout activation in this module; Play integration is a later mandatory module. |

## Open Decisions Resolved

- Accepted 30-day price range: 50 to 100,000 euro cents.
- Old Price behavior: deactivate for new purchases after successful activation;
  retain it for existing subscriptions and audit history.
