# SwiftVR RTX 5090 worker image (inactive preparation)

This directory prepares, but does not activate, a remote SwiftVR worker. It
must not be built or run as a customer/paid service with the pinned weights
until written authorization for the exact model snapshot has been reviewed.

## Pinned runtime

- CUDA base: `nvidia/cuda:12.8.1-cudnn-runtime-ubuntu22.04`, pinned amd64
  manifest digest in `Dockerfile`.
- PyTorch `2.10.0` / torchvision `0.25.0`, CUDA 12.8 wheels.
- SwiftVR source commit `4fb82651efee06a90ac47fd2d9af2f632e84ab45`;
  the downloaded source archive is SHA-256 verified before installation.
- The full resolved Python inventory is recorded in `python-packages.lock`.
  Every rebuild compares `pip freeze --all` against it and fails closed on
  transitive dependency drift.
- Model snapshot `a0b09461bd89847712dd91dbb4c63541b4693936`;
  all required files, sizes and SHA-256 values are in `model-manifest.json`.

The approximately 20.17 GB checkpoint is not embedded in the image. Mount the
already verified immutable checkpoint read-only at `/models/swiftvr`. Do not
allow the runtime container to download or select a mutable model revision.
For an ephemeral provider benchmark, publish a separate private image variant
that copies the pre-verified checkpoint into `/models/swiftvr`; record that
resulting image digest. Never pass a Hugging Face token to the runtime worker.
`Dockerfile.benchmark` performs that checksum gate and writes the resolved
Python package inventory. Its `WORKER_BASE_IMAGE` must itself be the digest of
the reviewed base worker image; `models/` must contain only the pinned snapshot.

## Readiness layers

1. `healthcheck.py` proves CUDA is visible and the GPU name contains `5090`.
2. `verify_model_manifest.py` hashes every model file. With `--commercial`, it
   also rejects the current manifest because permission is not approved.
3. A future orchestrator readiness check must also validate the worker image
   digest, worker protocol, available VRAM, FFmpeg, provider price and live job
   lease. Passing the container healthcheck alone is not production readiness.

Example internal-evaluation verification after a future authorized model
download (no inference):

```sh
python3 /opt/azmigrantat-gpu-worker/verify_model_manifest.py \
  --manifest /opt/azmigrantat-gpu-worker/model-manifest.json \
  --checkpoint /models/swiftvr
```

Do not add `--commercial` unless the reviewed manifest records the written
authorization. Do not modify that boolean directly on a running instance.

## Restoration behavior

`swiftvr_restore.py` accepts one local source and one new lease-scoped result
path. It pads rather than crops the source composition, invokes BF16/SDPA with
24-frame chunks and queue depth 1, emits JSON progress derived from completed
GPU chunks, remuxes source audio, checks dimensions/duration/audio and performs
workspace cleanup. Timeout, cancellation or workspace overflow terminates the
entire SwiftVR process group.

FP8, `torch.compile`, flash-attention variants and quality-changing
optimizations are intentionally off until a real RTX 5090 benchmark measures
quality, stability, VRAM and end-to-end time.

`worker_client.py` is outbound-only. It bootstraps with a one-job capability,
downloads exactly one source, renews the lease through progress heartbeats,
honors cancel, streams the result upload, submits its checksum and exits. The
provider API key and OneProvider signing secret are never present in the image
or GPU environment.
