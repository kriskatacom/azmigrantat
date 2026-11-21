# ADR-003: Remote GPU restoration is capability-scoped and fail-closed

## Status

Accepted for inactive infrastructure preparation; production activation blocked

## Date

2026-11-13

## Context

AI Video Restoration V3 already owns authorization, the separate AI queue,
fenced leases, progress, cancel, timeout, recovery and publication on
OneProvider. SwiftVR needs an RTX 5090-class GPU that is not present on the
server. Rented compute must not receive general storage/database/Redis access,
must not interfere with existing workers and must not create uncontrolled cost.
The current SwiftVR weights also require prior written authorization for
production, customer-facing and paid processing.

## Decision

- OneProvider remains the authority for job state, originals and publication.
- A separate orchestrator reuses the existing fenced AI job lease and can run
  independently of upload, FFmpeg and ESPCN services.
- A remote worker receives only short-lived HMAC capabilities bound to one job,
  live lease token, worker identity and operation. Every mutation rechecks the
  lease before staging or publication.
- Provider lifecycle is behind a provider-neutral interface. Provisioning is
  disabled by default, limited to one instance and requires an authorized paid
  job, model/license readiness and hourly/daily/monthly budget capacity.
- GPU compute is disposable. Lease-scoped results return to OneProvider staging
  and are atomically published only by the current lease owner.
- SwiftVR source, runtime and model weights are independently pinned and
  verified. Current weights may be used only for permitted internal evaluation;
  customer or paid use is blocked until written permission is recorded.
- Restoration implementation is model-neutral so a commercially compatible
  model can replace SwiftVR without changing payment, transfer or orchestration.
- The standard FFmpeg and current ESPCN workers are not modified or restarted
  by this infrastructure.
- Provider lifecycle uses the official Runpod Pod API v2 or Vast.ai instance
  APIs. Create reconciles a deterministic managed label and is never blindly
  retried after an ambiguous timeout, rate-limit or server failure.
- Stop and permanent release are separate. Cleanup is not complete until the
  managed instance is absent from the provider inventory.
- The worker is outbound-only: no SSH, Jupyter or inbound application port.
  The only boot credential is a short-lived capability for one fenced job.

## Alternatives considered

### Give the rented machine SSH or shared storage credentials

Rejected because compromise of an ephemeral provider instance would expose all
videos and persistent infrastructure rather than one authorized object.

### Let the GPU worker publish directly

Rejected because a worker with an expired lease could overwrite a result after
recovery assigned the job elsewhere.

### Bind directly to one provider API

Rejected because availability, RTX 5090 pricing and termination behavior vary;
the safety and job protocols must not depend on one vendor.

### Treat current model-card access as commercial permission

Rejected because the current SwiftVR Research License explicitly requires
prior written authorization for the intended production/customer/paid uses.

## Consequences

- The prepared orchestrator reports unavailable and cannot provision anything.
- First benchmark requires an explicitly approved provider and license/model
  decision, model download verification and hard budget values.
- Paid activation additionally requires payment reservation/refund policy and
  a real RTX 5090 end-to-end benchmark.
- Provider loss cannot delete the original; a stale worker cannot publish after
  its lease expires.
- A provider API key is held only by the OneProvider control process. It is
  never included in the worker image, GPU environment or worker callbacks.
