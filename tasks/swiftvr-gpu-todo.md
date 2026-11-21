# SwiftVR / future RTX 5090 infrastructure checklist

Last updated: 2026-11-14

## Completed evidence and design

- [x] Preserve `tasks/plan.md` and `tasks/todo.md` for video place discovery.
- [x] Pin official SwiftVR source commit and Apache-2.0 source LICENSE checksum.
- [x] Pin official Hugging Face model snapshot, file sizes, weight SHA-256 LFS
  object IDs and current SwiftVR Research License checksum.
- [x] Record that current weights are evaluation-only without separate written
  authorization for production/customer/paid use.
- [x] Define provider-neutral architecture, storage boundary, fencing boundary,
  cost gates, model replaceability and rollback approach.

## Implementation in this preparation

- [x] Add strict disabled-by-default GPU/orchestrator configuration.
- [x] Add versioned worker, transfer, progress, completion and future payment
  contracts.
- [x] Add HMAC capability signing and worker request verification with replay
  and expiry boundaries.
- [x] Add provider abstraction, disabled provider, singleton and budget gates.
- [x] Add durable append-only cost/provisioning ledger and idle release policy.
- [x] Add pinned SwiftVR model manifest and verification command.
- [x] Add reproducible RTX 5090 container definition, worker entrypoint,
  health/readiness,
  restoration/finalization wrapper and cleanup behavior.
- [x] Add disabled systemd/env templates and OneProvider deploy/rollback runbook.
- [x] Add ADR for remote GPU restoration and commercial license gate.
- [x] Run build, syntax, config, signature-tamper and systemd checks only.
- [x] Replace the Runpod HTTPS transport with a TLS-verifying `node:https`
  implementation that works under the existing `--jitless` systemd sandbox.
- [x] Make worker capabilities single-use with Redis nonce reservation and
  guarantee process-group plus workspace cleanup on worker exit.
- [x] Install a root-only capability secret and enable the gateway on loopback
  only; verify health 200, fail-closed readiness 503 and unauthenticated 401.
- [x] Enforce one managed GPU instance across request IDs and add exact-label,
  idempotent release reconciliation for controller/watchdog cleanup.
- [x] Install inactive root-only benchmark lifecycle helpers with exact UUID
  validation, per-invocation approval, a 15–180 minute hard lifetime, signal
  cleanup and an independent systemd emergency-release timer. No timer is
  armed during preparation.
- [x] Stage the TLS-server worker location as a root-only `.disabled` Nginx
  snippet and validate the live Nginx configuration. It is not included or
  publicly exposed before the controlled benchmark.
- [x] Stage safe disabled components on OneProvider and confirm existing upload,
  standard FFmpeg, ESPCN, Redis and Nginx services remain healthy.
- [x] Implement and statically verify Runpod Pod API v2 lifecycle adapter.
- [x] Implement and statically verify Vast.ai offer-selection and instance
  lifecycle adapter.
- [x] Add reconcile-before-create and separate stop/permanent-release checks.
- [x] Add lease-scoped bootstrap, download, bounded upload, progress, cancel and
  completion endpoints without exposing provider credentials to the worker.
- [x] Add the outbound worker protocol client and resolved package inventory.
- [x] Add an exact one-instance RTX 5090 benchmark and teardown runbook.
- [x] Configure a restricted Runpod API key with only Pods Read/Write, store it
  as a root-owned `0600` OneProvider secret, and verify the adapter with a
  read-only list operation.
- [x] Update the Runpod v2 list adapter for the current `{pods, pagination}`
  response envelope and confirm the account currently has zero Pods.

Deployment evidence: the loopback-only orchestrator status process is active
but not enabled at boot; `/health` reports provisioning/user availability false
and `/ready` deliberately returns HTTP 503 with all blockers. Production flags
are `GPU_PROVISIONING_ENABLED=0`, `GPU_PROVIDER=disabled`, zero budgets and
`SWIFTVR_COMMERCIAL_USE_APPROVED=0`. Rollback backup:
`/var/backups/swiftvr-gpu-prep-20261113T153811Z` on OneProvider.

Provider/gateway preparation update: Runpod and Vast.ai adapters, the disabled
worker gateway, manual doubly-gated provider control and worker image/runbook
were staged on OneProvider on 2026-11-13. The orchestrator remains disabled at
boot and fail-closed at runtime: provider `disabled`, provisioning `0`, all
three financial limits `0`, worker endpoints default off, `/ready` HTTP 503.
The upload API, standard worker, standard enhancement worker, ESPCN worker,
Redis and Nginx remained active. Rollback backup:
`/var/backups/swiftvr-gpu-providers-20261113-mTJX0H`.

Runpod account update (2026-11-14): the restricted credential
`eto-me-gpu-orchestrator` has exactly Pods Read/Write and no GraphQL,
Serverless, billing, account, authentication or secrets access. It is loaded
from `/etc/azmigrantat-video/runpod-provider.env` (`root:root`, mode `0600`).
`GPU_PROVIDER=disabled`, provisioning remains off, and all financial ceilings
remain zero. The capability gateway is loopback-only and has no active Nginx
route. A read-only API call returned zero Pods. The
console showed Secure Cloud RTX 5090 availability in Europe at $1.39/hour
before storage; Community Cloud listed $0.69/hour but no capacity. No instance
was created and the existing $10.00 balance was unchanged.

## Required before first real RTX 5090 benchmark

- [ ] Obtain written SwiftVR commercial/customer-video permission for snapshot
  `a0b09461bd89847712dd91dbb4c63541b4693936`, or approve a model/snapshot with
  compatible terms.
- [x] Review and approve a Runpod or Vast.ai account, region, RTX 5090 offer,
  storage/network pricing and termination semantics.
- [x] Install provider credentials only in a protected environment file; never
  Git, logs, URLs, mobile code or image layers.
- [x] Resolve and pin the CUDA base-image digest and build the worker base image
  locally with a fail-closed full Python dependency inventory.
- [x] Download the pinned weights outside Git, verify every manifest checksum,
  and build a non-root local evaluation image containing the snapshot.
- [ ] Create/select a private registry repository, enter a least-privilege
  registry token outside chat, push the final weights image, and record the
  immutable repository digest in Runpod and OneProvider configuration.
- [ ] Set hard hourly, daily and monthly limits and preload only the amount
  explicitly approved for the benchmark.
- [ ] Run one manually approved internal clip and record cold start, model load,
  VRAM, FPS, end-to-end time, output correctness, visual quality and total cost.
- [ ] Destroy the instance and independently verify that provider billing and
  attached paid storage have stopped.

## Required before paid/user activation

- [ ] Complete payment/credit reservation, idempotent capture and technical
  failure refund/release flows under applicable Stripe/Google Play rules.
- [ ] Persist immutable association among user, enhancement job, payment
  reservation, provider instance, measured cost and publication token.
- [ ] Complete controlled recovery exercises for orchestrator restart, lost GPU,
  expired lease, duplicate callback, cancel and provider termination failure.
- [ ] Approve measured time/quality/cost limits per resolution and duration.
- [ ] Complete security and operational review of public worker endpoints,
  rotation of secrets, alerts and incident/rollback procedures.
- [ ] Make a separate explicit activation decision. SwiftVR remains unavailable
  to every user until that decision.
