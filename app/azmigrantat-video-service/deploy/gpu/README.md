# OneProvider GPU orchestrator deployment (disabled only)

The GPU orchestrator is an isolated status/safety process. Runpod and Vast.ai
lifecycle adapters and the fenced worker gateway are implemented, but provider
control is manual and doubly gated. The long-running server still refuses to
provision automatically. Worker endpoints require
`GPU_WORKER_ENDPOINTS_ENABLED=1` and remain off in production preparation.

## Safe staging sequence

1. Build the complete video-service release and run TypeScript compilation.
2. Create a versioned archive and record its SHA-256. Do not include `.env`,
   provider credentials, worker secrets, model files or video data.
3. Copy the archive and this systemd template to OneProvider without replacing
   the active release.
4. Back up the current active release path and protected environment metadata.
5. Ensure the protected environment contains exactly these safe values:
   `GPU_PROVISIONING_ENABLED=0`, `GPU_PROVIDER=disabled`, all three budget
   limits `0`, `SWIFTVR_COMMERCIAL_USE_APPROVED=0`, and empty provider API
   credentials.
6. Run `node --check dist/gpu-orchestrator-server.js` and
   `systemd-analyze verify` before any directory switch.
7. Install the unit file but do not enable it. Starting it manually is optional
   and may expose only loopback `/health` (200) and `/ready` (503).
8. Confirm existing upload API, Redis, standard worker, enhancement worker and
   ESPCN AI worker remain active; no restart of those units is needed.

## Rollback

Stop and disable only `azmigrantat-video-gpu-orchestrator.service`, restore the
prior video-service release directory, reload systemd and recheck the existing
services. Do not delete Redis keys, enhancement job files, originals, results
or the cost ledger during rollback.

## Future activation gates

Activation needs a digest-pinned built private benchmark image, verified model
files, protected secrets, explicit paid-action approval, hard non-zero
price/budget limits and one controlled RTX 5090 benchmark. Customer use also
needs written commercial permission (or a replacement model) and payment
reservation. The example Nginx location must be reviewed and enabled only for
the benchmark window; it never exposes health/provider-control endpoints.
