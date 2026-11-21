# Implementation Plan: SwiftVR GPU restoration infrastructure

## Scope and safety boundary

This plan prepares a provider-neutral, disabled-by-default path for running a
future video-restoration worker on a rented NVIDIA RTX 5090. It extends the
existing AI Video Restoration V3 queue, authorization, job state,
lease/fencing, progress, cancel, timeout and cleanup mechanisms; it does not
replace or duplicate them.

The existing `tasks/plan.md` and `tasks/todo.md` track unfinished video place
discovery work and are intentionally not modified by this project.

No task in this preparation may rent a GPU, make a paid provider request,
enable SwiftVR for a user, change the mobile interface, or change the standard
FFmpeg and ESPCN workers. Provisioning remains fail-closed with
`GPU_PROVISIONING_ENABLED=false`.

## Target architecture

```text
Mobile app (unchanged)
        |
        v
PHP authorization / future payment entitlement
        |
        v
OneProvider video API + existing fenced AI Redis queue
        |
        v
GPU orchestrator (separate, disabled systemd service)
        |
        +-- budget + singleton provisioning gate
        +-- provider adapter (Runpod / Vast.ai / disabled)
        +-- short-lived per-job capability URLs
        +-- lease renewal, cancel, timeout and recovery
        |
        v
Ephemeral RTX 5090 SwiftVR container
        |
        +-- download only the authorized source object
        +-- pinned model/source verification
        +-- restoration + progress heartbeat
        +-- audio/timing-safe finalize
        +-- lease-scoped result upload and callback
        +-- local cleanup and idle shutdown
        |
        v
OneProvider lease-scoped staging -> fenced atomic publication
```

The GPU worker never receives SSH, Redis, database, filesystem, or general
storage credentials. Its authority is limited to a worker identity plus
short-lived HMAC capabilities for one job, one lease token and one operation.
Every progress, upload and completion operation must revalidate the live lease;
an expired or replaced lease cannot publish.

## Architecture decisions

- Keep OneProvider authoritative for originals, results, job state,
  authorization and publication. The provider is disposable compute only.
- Run the orchestrator as a separate process and systemd unit. It is not part
  of the upload API or standard worker lifecycle and can fail without affecting
  upload, playback, FFmpeg or ESPCN.
- Reuse `FencedRedisJsonQueue` and `EnhancementStore`. Add a remote execution
  protocol around the existing lease token instead of creating a second job
  authority.
- Provision at most one GPU instance. A Redis singleton lease plus provider
  instance tags prevents concurrent orchestrators from creating duplicates.
- Require an authorized job, a confirmed future payment/credit reservation,
  commercial model permission, a pinned model manifest and available daily and
  monthly budget before provisioning. Missing evidence denies the action.
- Abstract provider operations behind `GpuProvider`. The disabled adapter is
  the default; Runpod and Vast.ai adapters are configuration targets and cannot
  make requests while provisioning is disabled.
- Record provider instance ID, quoted hourly price, timestamps and accrued cost
  in an append-only local ledger. Stop accepting new paid jobs at either budget
  limit; terminate idle compute after 300 seconds once the queue is empty.
- Treat payment as a contract only in this phase. A future immutable payment
  reservation ID is bound to one enhancement job and idempotency key; no Stripe
  or Google Play charge is created here.
- Normalize rotation/SAR and pad, never crop, source dimensions before SwiftVR.
  SwiftVR output is silent CFR video, so finalization remuxes the original audio
  with explicit duration policy and validates duration, FPS, SAR/DAR, rotation
  and stream timestamps before publication.
- The model runtime is replaceable. The container invokes a restoration
  adapter contract, so a commercially permitted model such as SeedVR2 can
  replace SwiftVR without changing queue, payment, transfer or provider code.

## SwiftVR provenance and activation gate

- Source: `https://github.com/H-oliday/SwiftVR`, pinned commit
  `4fb82651efee06a90ac47fd2d9af2f632e84ab45`.
- Source license: Apache-2.0; checked source LICENSE SHA-256
  `3c4b06673cfcd41f8967e42630b86457fabceedb2d8521f81b9396430af349f1`.
- Weights: `https://huggingface.co/H-oliday/SwiftVR`, pinned snapshot
  `a0b09461bd89847712dd91dbb4c63541b4693936`.
- Current weights license: SwiftVR Research License; LICENSE SHA-256
  `278e70b8451cd1d4c4a14aa6e66525f26a0df11b00579ef34f1fb053a877e118`.
- The current weights permit internal evaluation but require prior written
  authorization for production, customer-facing, paid/hosted processing or
  processing customer videos. Therefore production and paid readiness remain
  false until written permission for the exact snapshot is documented.
- Weight file sizes and SHA-256 LFS object IDs are pinned in the model manifest.
  Container readiness must hash the local files and reject any mismatch.
- Historical licensing is not inferred from the current model card. Using a
  historical snapshot requires separately archived evidence tying that exact
  immutable snapshot to its then-applicable license.

## Resource and runtime baseline

- Target GPU: RTX 5090, 32 GB VRAM, host driver compatible with CUDA 12.8.
- Runtime: Python 3.10, PyTorch 2.10.0 CUDA 12.8 build, BF16, SDPA, temporal
  chunk length 24, queue depth 1 initially. FP8, compilation and third-party
  attention backends remain disabled until quality and stability measurements.
- Officially reported throughput is approximately 26 FPS at 1080p on one RTX
  5090, but this is not an „Ето ме“ production benchmark. Readiness requires a
  real rented 5090 run including model load, transfer, finalization and upload.
- Container memory, disk, timeout and input limits are explicit. GPU OOM,
  heartbeat loss or cancellation terminates the process group and removes the
  lease-scoped workspace.

## Delivery phases

## Runpod account preparation evidence (2026-11-14)

- Created `eto-me-gpu-orchestrator` with only REST Pods Read/Write. All other
  REST scopes, GraphQL and Serverless endpoint access remain disabled.
- Installed the credential only in the OneProvider root-owned `0600` secret
  file and added that file as an optional environment source for the isolated
  GPU orchestrator. The public source tree contains no credential value.
- Kept `GPU_PROVIDER=disabled`, `GPU_PROVISIONING_ENABLED=0`, one maximum
  instance, zero hourly/daily/monthly budgets and the commercial-license gate
  false. Worker endpoints are enabled only on the loopback orchestrator;
  Nginx does not expose `/v1/gpu-worker/` publicly.
- Updated the Runpod v2 adapter for the current paginated list envelope and
  verified `GET /v2/pods` through the adapter returns an empty managed list;
  the account API reports zero Pods overall.
- Observed Secure Cloud RTX 5090 capacity in European regions at $1.39/hour
  plus storage. Community Cloud listed $0.69/hour but was out of capacity.
  No deployment, reservation, balance load or payment-method change occurred.

## Benchmark preparation evidence (2026-11-14)

- Replaced Node's failing `fetch` path under `--jitless` with the built-in
  `node:https` client. TLS verification remains enabled, redirects are denied,
  responses are bounded and timeouts remain enforced. A real read-only Runpod
  list under `--jitless` returned an empty array.
- Added one-time Redis nonce reservation to every worker capability, retained
  live lease/execution-token fencing on every operation, and made worker
  workspace/process-group cleanup unconditional.
- Installed a 64-hex-character capability secret in a separate root-owned
  `0600` OneProvider file. Loopback health is HTTP 200, readiness remains HTTP
  503, and an unauthenticated bootstrap is denied with HTTP 401.
- Added a provider-side max-one-managed-instance guard and an idempotent
  `release-request` reconciliation command for bounded cleanup by exact request
  ID. No paid command was invoked.
- Revalidated the adapter against Runpod's public v2 OpenAPI 2.0.0 schema
  retrieved from `https://api.runpod.io/v2/openapi.json` (SHA-256
  `41f48a46a68fd023cedf9bb5a53c957a8359fb27d72d8e68b85729cc3ae9f26d`).
  The private-image field is a `/v2/registries` credential ID; configuration
  now names it `GPU_REGISTRY_CREDENTIAL_ID` to prevent passing a display name
  or raw password. The newer `rest.runpod.io/v1` endpoint returned HTTP 401 for
  the restricted key, so the working and permission-compatible v2 API remains
  selected.
- Built the pinned CUDA/SwiftVR base image locally. Its dependency inventory is
  locked and checked fail-closed during future builds. The current local image
  is approximately 7.34 GB before weights; the final private-registry digest
  will be recorded only after the verified weights layer is added and pushed.
- Downloaded the four pinned model files to a protected cache outside Git and
  verified all sizes and SHA-256 values. Built the evaluation image locally as
  `eto-me/swiftvr-worker:a0b09461-4fb82651-cu128`; local immutable digest
  `sha256:a4ac58ff41332f8198c92c925f97c57dc804cbb9044b030806c503fed58da886`,
  size 26,007,599,416 bytes. The image runs as `swiftvr:swiftvr`, reverified the
  model in-image, and correctly fails health on a host without an RTX 5090.
  This local digest is not yet a pullable registry digest.

### Phase 1: Evidence and contracts

- Pin source, dependencies, weights, file checksums and license evidence.
- Define versioned job, worker, capability, progress, completion and payment
  reservation contracts.
- Record architecture and activation gates in an ADR.

### Phase 2: Safe orchestration foundation

- Add strict GPU configuration parsing with provisioning off by default.
- Add provider abstraction, disabled provider and dry readiness inspection.
- Add budget/singleton/idle gates and durable cost ledger contract.
- Add per-job signed capability and worker request authentication helpers.
- Implement the official Runpod Pod API v2 and Vast.ai instance lifecycle
  adapters. Creation uses a deterministic request label and reconcile-before-
  create; a transport-ambiguous create is never automatically retried.
- Keep stop and permanent release as distinct operations. Benchmark cleanup is
  complete only after permanent release returns success/already-absent and a
  subsequent provider read no longer reports the instance.
- Use an outbound-only GPU worker. Do not expose SSH, Jupyter or an inbound GPU
  port; the only boot credential is a short-lived, one-job bootstrap capability.
- Require live Redis lease ownership for source download, progress, result
  staging and completion. Upload is bounded and streamed to a lease-specific
  temporary path; only the OneProvider side may validate and publish it.

### Phase 3: Reproducible worker image

- Add pinned CUDA/PyTorch/SwiftVR container definition and entrypoint.
- Add model manifest verification and fail-closed license readiness.
- Add restoration wrapper for normalization, progress, audio remux, timestamp
  validation, cleanup and cancellation.
- Add health/readiness commands that do not claim GPU production readiness.

### Phase 4: Deployment preparation

- Add disabled systemd/env templates and a rollback-oriented deployment
  runbook for OneProvider.
- Stage only code/config that cannot provision or accept SwiftVR jobs.
- Verify TypeScript/Python/shell/container syntax, systemd configuration and
  secrets boundaries without functional/E2E tests or provider API calls.

### Phase 5: Future controlled RTX 5090 benchmark

- Obtain written commercial authorization or select permitted weights.
- Configure one provider credential and a hard price/budget ceiling.
- Manually authorize one internal, non-customer benchmark job.
- Measure cold start, model load, VRAM, processing FPS, transfer, finalize,
  visual quality and total cost; then destroy the instance and verify billing
  stopped.
- Compare the exact same original clip and output geometry against the existing
  ESPCN result. Record provider offer/region, image digest, source and weights
  revisions, command/profile, wall time, effective FPS, peak VRAM, transfer
  bytes, output hashes, VMAF/SSIM as supporting signals and a human visual
  review focused on temporal stability, faces, text and compression artifacts.

### Phase 6: Future paid activation

- Complete Stripe/Google Play policy and payment reservation/refund flows.
- Complete provider failure/reconciliation and manual operational review.
- Approve a measured model/profile and explicitly enable only the intended
  account cohort. Global activation requires a separate decision.

## Verification strategy

Allowed checks are limited to builds, static syntax, configuration parsing,
model-manifest verification against metadata, container definition inspection,
systemd verification and read-only service health/log inspection. No mobile
functional/E2E tests, no real payment, no provider provisioning and no GPU
benchmark are part of this phase.

## Rollback

The new orchestrator unit is installed disabled and masked from provisioning by
configuration. A release is staged beside the current video-service release,
with the active symlink/directory changed only after build and config checks.
Rollback restores the prior release and removes the inactive unit/env additions;
Redis queues, existing job files, originals and existing workers are untouched.
