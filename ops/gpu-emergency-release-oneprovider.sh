#!/bin/sh
# Idempotent exact-label Runpod cleanup. Install root-owned; never arm it
# without a separately approved paid benchmark request.
set -eu

request_id=${1:-}
if ! printf '%s\n' "$request_id" | grep -Eq '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; then
    echo "A UUID benchmark request ID is required." >&2
    exit 2
fi

set -a
. /etc/azmigrantat-video/video-service.env
. /etc/azmigrantat-video/runpod-provider.env
. /etc/azmigrantat-video/gpu-worker.env
set +a

export GPU_PROVIDER=runpod
export GPU_PAID_ACTION_APPROVED=1
export GPU_APPROVED_REQUEST_ID=$request_id

cd /opt/azmigrantat-video-service
exec /usr/local/bin/node --jitless dist/gpu-provider-control.js release-request "$request_id"
