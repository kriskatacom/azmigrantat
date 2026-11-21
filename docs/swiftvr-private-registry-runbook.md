# SwiftVR private registry handoff

Status: final local evaluation image built; no registry push and no paid GPU
operation authorized.

## Registry requirements

Choose an existing private registry that accepts a roughly 26.01 GB image and
a single roughly 20 GB weights layer. Create a private repository for the
SwiftVR evaluation worker. Use two separate credentials:

1. a short-lived push token for the Ubuntu laptop; and
2. a pull-only token stored in Runpod Container registry auth.

Do not paste either token in chat, commit it, add it to the image, or place it
in a shell command. Enter the push token through `docker login --password-stdin`
or a credential helper. Enter the pull token directly in the signed-in Runpod
credential dialog. The current machine has no Docker registry credential and
Runpod has no container registry auth record.

## Push and pin

The local source image is:

`eto-me/swiftvr-worker:a0b09461-4fb82651-cu128`

After interactive registry login, tag and push it to the selected private
repository. Record the repository digest returned after push and use only:

`registry.example/eto-me/swiftvr-worker@sha256:<repository-digest>`

Do not configure Runpod with a mutable tag. Create the Runpod registry auth as
`eto-me-swiftvr-pull`. The v2 Pod API `registry` field requires the credential
ID from `/v2/registries`, not the display name or raw password. Store only that
non-secret ID as `GPU_REGISTRY_CREDENTIAL_ID` on OneProvider.

## Gates that remain closed during registry setup

Keep all of these values unchanged until a separately approved paid run:

```text
GPU_PROVISIONING_ENABLED=0
GPU_PROVIDER=disabled
GPU_MAX_ACTIVE_INSTANCES=1
GPU_MAX_HOURLY_PRICE=0
GPU_MAX_DAILY_BUDGET=0
GPU_MAX_MONTHLY_BUDGET=0
SWIFTVR_COMMERCIAL_USE_APPROVED=0
```

Set `GPU_WORKER_IMAGE` only after the private repository digest is known. The
prepared Nginx worker location remains a `.disabled` snippet until the exact
benchmark job and short-lived bootstrap capability exist.

## First-run cost boundary

The observed Secure Cloud price was $1.39/hour plus about $0.007/hour for the
displayed 50 GB temporary disk, rounded by Runpod to $1.40/hour. Recheck the
live offer immediately before approval. A conservative first-run gate is a
$1.50 hourly ceiling, $3.00 daily/monthly ceiling and 120-minute emergency
release timer. At $1.40/hour, 30–60 minutes costs about $0.70–$1.40; the hard
two-hour upper bound is about $2.80. The 26 GB private image pull is part of
the billed lifetime and may materially affect cold start.

The controller releases by exact deterministic request ID on normal exit and
signals. An independently armed systemd timer invokes the same idempotent
release. If provider API/network access fails, leave the timer armed and use
Runpod Console to terminate the Pod; then confirm the Pod is absent and billing
has stopped.
