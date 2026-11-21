# SwiftVR RTX 5090 first benchmark runbook

Status: prepared, not authorized for execution. Every monetary limit is zero in
production and SwiftVR remains unavailable to users.

## Required inputs and approvals

1. Use an internal evaluation clip that we have permission to process. Record
   its SHA-256, duration, streams, dimensions, FPS, SAR/DAR and rotation.
2. Obtain a Runpod or Vast.ai account and a least-privilege API key capable only
   of managing compute instances. Keep the key in a root-readable environment
   file, never Git, shell history, provider labels or the container image.
3. Choose an explicit maximum hourly price and daily/monthly spend. All three
   values must be positive for the one invocation; otherwise creation is
   denied. Set `GPU_PAID_ACTION_APPROVED=1` and an exact
   `GPU_APPROVED_REQUEST_ID` only after the user approves that quoted offer.
4. Use a private worker image digest containing the manifest-verified model
   snapshot. The runtime image must not contain a Hugging Face access token.
   For Runpod v2, pass the immutable credential ID returned by
   `/v2/registries` as `GPU_REGISTRY_CREDENTIAL_ID`; a UI display name or raw
   registry password is not a valid Pod `registry` value.
5. Internal evaluation is allowed by the current weights terms. Customer,
   hosted, production or commercial use still requires prior written approval
   from the SwiftVR licensors.

## Comparable inputs

- Freeze one original file by SHA-256. Do not transcode it before either path.
- Run the existing ESPCN x2 path and SwiftVR from that same original.
- Produce the same 1280x720 display geometry, preserve the full composition by
  padding rather than cropping, preserve source FPS/audio and record both final
  output hashes. Keep the original, ESPCN and SwiftVR outputs together.

## Controlled lifecycle

1. Build the private image, record its repository digest and generated package
   inventory, and independently run `verify_model_manifest.py` on the included
   `/models/swiftvr` directory.
2. Stage one fenced benchmark job and generate a 15-minute one-job bootstrap
   capability. Confirm the worker endpoint is HTTPS and readiness is fail-
   closed before placing the token in the instance environment.
3. Run `gpu-provider-control list` and reconcile by the exact deterministic
   request label. If any matching instance exists, do not create another.
4. Search/quote the RTX 5090 offer. Record provider, offer/datacenter, verified
   status, reliability, GPU VRAM, CUDA version, vCPU/RAM/disk and total hourly
   price. Obtain the user's explicit paid-action approval.
5. Invoke `gpu-provider-control create <request-id>` once. A timeout or 5xx is
   an ambiguous outcome: list and reconcile by label; never repeat create until
   the absence of an instance is proven.
6. Poll provider readiness and the worker heartbeat. Abort if the GPU is not an
   RTX 5090 with at least 32 GB VRAM, the image digest differs, model checksums
   fail, the fenced lease is lost, or the price exceeds the ceiling.
7. Record cold-start, model-load, download, inference, finalize and upload
   times; effective processed FPS; peak VRAM/GPU/CPU/RAM/disk; input/output
   bytes; provider cost; and all image/model/source revisions.
8. Validate duration, stream start times, FPS, SAR/DAR, rotation, audio presence
   and A/V sync. Treat VMAF/SSIM as supporting signals only. Visually compare
   temporal stability, faces, text, ringing, block artifacts and hallucinated
   detail on the same frames.
9. Before create, arm an independent bounded-time cleanup action for the exact
   deterministic request ID. In the controller's `finally`, stop the exact
   instance and run `release-request <request-id>`, which deletes every managed
   instance with that exact label and then fails unless reconciliation proves
   the label is absent. The independent cleanup runs the same idempotent
   command if the controller exits or the SSH session is lost. Finally verify
   in the provider billing UI that compute and attached paid storage stopped.
   Provider/network outages can prevent any API-only guarantee, so the UI
   termination path remains the mandatory last-resort operator action.
   The prepared `run-controlled-swiftvr-benchmark-oneprovider.sh` controller
   enforces a per-invocation approval phrase, exact UUID, maximum 180-minute
   lifetime, immediate EXIT/HUP/INT/TERM cleanup and an independent systemd
   timer. The timer invokes the root-owned idempotent
   `azmigrantat-gpu-emergency-release` helper by exact request label.
10. Reset provider credentials from the environment and restore all financial
    limits and `GPU_PROVISIONING_ENABLED` to zero/false.

## Acceptance record

The benchmark does not activate users. Record results in a dated immutable
artifact with the original/ESPCN/SwiftVR hashes and a go/no-go decision. A
separate security, license and cost review is required before production use.
