# Stripe Sandbox subscription module — deployment runbook

This runbook deploys a dormant/test-only slice to the existing fixed production
roots. It does not enable live payments or the Google Play production build.

## Required gates

1. Build an immutable, checksummed target-file manifest from the reviewed tree.
2. Verify owner/group/mode, ACL/xattr state, free space, active jobs/uploads and
   the existing maintenance handler.
3. Create a fresh encrypted snapshot of auth, business and legal roots, their
   `.env` files and the full auth database. Keep no plaintext database dump on
   persistent storage.
4. Restore all three application archives and the DB into disposable targets;
   verify paths, hashes, modes, migration ledger, schema signature and safe
   aggregate counts. Stop before production write on any mismatch.
5. Stage files outside docroots; lint them with production PHP 8.3 and verify
   every release hash.

## Activation order

1. Turn on the existing full-route maintenance flag and prove dynamic routes
   return JSON 503 with `Retry-After`.
2. Atomically install new auth services/models/controllers, then business
   services/controllers/views. Routes remain unchanged.
3. Run only migrations `20261106153000` and `20261106154500`; verify exact table,
   index and ledger definitions. They are additive and old code ignores them.
4. Atomically activate the auth and business route additions last.
5. Atomically add test-only environment values. Keep `PAYMENTS_ENABLED=false`;
   keep `STRIPE_SANDBOX_ENABLED=false` until code/runtime smoke passes.
6. Refresh/revalidate web OPcache and run unauthenticated/auth-boundary, HMAC,
   route, admin-page and public result-page smoke tests.
7. Configure Stripe Test credentials/webhook and an explicit tester allowlist,
   then set `STRIPE_SANDBOX_ENABLED=true` only for the server-side sandbox path.
8. Run one designated end-to-end Sandbox payment. Verify webhook/event,
   subscription and handoff aggregates without printing secrets or card data.
9. Remove maintenance only after all required gates pass. Observe 5xx and Stripe
   webhook delivery for a bounded window.

## Stripe Test provider contract

- Create the recurring Price as `10.00 EUR` with `interval=day` and
  `interval_count=30`; reject a returned Price that differs.
- Restricted key permissions: Account Read, Products Write, Prices Write,
  Checkout Sessions Write, and Subscriptions Write. All unrelated resources
  remain None.
- The webhook destination is `https://users.azmigrantat.com/webhooks/stripe`
  and receives only checkout completion/async result plus subscription
  created/updated/deleted events required by the implementation.
- New subscriptions are reconciled to `cancel_at_period_end=true` because
  automatic renewal is off by default.
- A disabled plan blocks new handoffs and Checkout Sessions but never cancels
  or shortens an existing subscription.

## Rollback

- Keep maintenance enabled.
- First set `STRIPE_SANDBOX_ENABLED=false`; retain `PAYMENTS_ENABLED=false`.
- Restore route files, then code files, from the fresh encrypted snapshot using
  atomic temp-file plus rename. Do not revert to code that lacks payment guards.
- The two additive tables may remain safely unused. Dropping them or deleting
  test subscriptions requires separate destructive approval.
- Restore business `.env` and auth `.env` only from encrypted backups if a config
  rollback is required. Never print secret values.
- Revalidate OPcache and smoke guard-only behavior before maintenance is removed.

## Google Play gate

The module is test-only. Do not enable its external checkout in the Play build
until programme enrollment, required user-choice screens, Play external-payment
tokens and transaction reporting are implemented and verified.
