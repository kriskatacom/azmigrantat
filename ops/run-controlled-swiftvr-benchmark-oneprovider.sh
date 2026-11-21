#!/bin/sh
# Paid benchmark lifecycle controller. This file is preparation only and must
# not be executed until the user approves the exact request, price and budget.
set -eu

request_id=${1:-}
job_id=${2:-}
if ! printf '%s\n' "$request_id" | grep -Eq '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; then
    echo "A UUID benchmark request ID is required." >&2
    exit 2
fi
if ! printf '%s\n' "$job_id" | grep -Eq '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; then
    echo "A UUID benchmark job ID is required." >&2
    exit 2
fi

if [ "${GPU_BENCHMARK_PAID_APPROVAL:-}" != "APPROVE_ONE_RUNPOD_RTX5090_BENCHMARK" ]; then
    echo "Explicit per-invocation paid benchmark approval is missing." >&2
    exit 3
fi
if [ "${GPU_PAID_ACTION_APPROVED:-}" != "1" ] || [ "${GPU_APPROVED_REQUEST_ID:-}" != "$request_id" ]; then
    echo "Paid action and exact request-ID gates are missing." >&2
    exit 3
fi

maximum_minutes=${GPU_BENCHMARK_MAX_MINUTES:-120}
case "$maximum_minutes" in *[!0-9]*|'') echo "Invalid benchmark timeout." >&2; exit 2 ;; esac
if [ "$maximum_minutes" -lt 15 ] || [ "$maximum_minutes" -gt 180 ]; then
    echo "Benchmark timeout must be between 15 and 180 minutes." >&2
    exit 2
fi

unit=azmigrantat-gpu-cleanup-$request_id
cleaned=0
cleanup() {
    if [ "$cleaned" -eq 0 ]; then
        if /usr/local/sbin/azmigrantat-gpu-emergency-release "$request_id"; then
            cleaned=1
            return 0
        fi
        return 1
    fi
}
trap cleanup EXIT HUP INT TERM

# The independent timer survives this shell, SSH loss and controller failure.
systemd-run --quiet --unit "$unit" --on-active "${maximum_minutes}m" \
    /usr/local/sbin/azmigrantat-gpu-emergency-release "$request_id"

cd /opt/azmigrantat-video-service
before=$(/usr/local/bin/node --jitless dist/gpu-provider-control.js list)
if [ "$before" != "[]" ]; then
    echo "A managed GPU instance already exists; refusing create." >&2
    exit 4
fi
bootstrap_file=/run/azmigrantat-video/gpu-bootstrap-$request_id.env
install -d -o root -g root -m 0700 /run/azmigrantat-video
export GPU_COLD_START_APPROVED=1
export GPU_BENCHMARK_STAGE_APPROVED=1
export GPU_BOOTSTRAP_TOKEN_FILE=$bootstrap_file
/usr/local/bin/node --jitless dist/gpu-cold-start-control.js stage "$request_id" "$job_id"
/usr/local/bin/node --jitless dist/gpu-cold-start-control.js begin "$request_id" "$job_id"
. "$bootstrap_file"
export GPU_BOOTSTRAP_TOKEN
export GPU_BENCHMARK_JOB_ID=$job_id
/usr/local/bin/node --jitless dist/gpu-provider-control.js create "$request_id"
/usr/local/bin/node --jitless dist/gpu-cold-start-control.js renew "$request_id" pulling
echo "GPU request created. Monitor the fenced worker job; cleanup is armed for ${maximum_minutes} minutes." >&2
echo "When the benchmark result is collected, terminate this controller to trigger immediate exact-label release." >&2

# Keep the trap-owning controller alive. The independent timer is the fallback.
deadline=$(( $(date +%s) + maximum_minutes * 60 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
    sleep 15
    /usr/local/bin/node --jitless dist/gpu-cold-start-control.js renew "$request_id" current || break
    managed=$(/usr/local/bin/node --jitless dist/gpu-provider-control.js list)
    [ "$managed" != "[]" ] || break
done

cleanup || true
rm -f "$bootstrap_file"
remaining=$(/usr/local/bin/node --jitless dist/gpu-provider-control.js list)
if [ "$remaining" != "[]" ]; then
    echo "Managed GPU instance remains after cleanup; the independent timer stays armed. Terminate it in Runpod Console immediately." >&2
    exit 5
fi
systemctl stop "$unit.timer" 2>/dev/null || true
