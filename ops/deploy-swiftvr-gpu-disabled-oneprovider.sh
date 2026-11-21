#!/usr/bin/env bash
set -euo pipefail

archive=${1:?usage: deploy-swiftvr-gpu-disabled-oneprovider.sh ARCHIVE SHA256}
expected_sha256=${2:?usage: deploy-swiftvr-gpu-disabled-oneprovider.sh ARCHIVE SHA256}
release=swiftvr-gpu-prep-$(date -u +%Y%m%dT%H%M%SZ)
active=/opt/azmigrantat-video-service
environment=/etc/azmigrantat-video/video-service.env
unit=/etc/systemd/system/azmigrantat-video-gpu-orchestrator.service
backup=/var/backups/${release}
staging=/opt/releases/${release}

test "$(sha256sum "$archive" | awk '{print $1}')" = "$expected_sha256"
sudo -n test -d "$active/dist"
sudo -n test -f "$environment"
sudo -n install -d -o root -g root -m 0700 "$backup"
sudo -n cp -a "$environment" "$backup/video-service.env"
sudo -n tar --exclude=node_modules --exclude=storage -czf "$backup/active-release-before.tgz" -C "$active" .
if sudo -n test -e "$unit"; then sudo -n cp -a "$unit" "$backup/orchestrator.service"; else sudo -n touch "$backup/unit-was-absent"; fi

sudo -n install -d -o root -g root -m 0755 "$staging"
sudo -n tar -xzf "$archive" -C "$staging"
sudo -n /usr/local/bin/node --check "$staging/dist/gpu-orchestrator-server.js"
sudo -n /usr/local/bin/node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'))" "$staging/deploy/gpu-worker/model-manifest.json"
sudo -n /usr/bin/python3 -c "import ast,pathlib,sys; [ast.parse(p.read_text()) for p in pathlib.Path(sys.argv[1]).glob('*.py')]" "$staging/deploy/gpu-worker"
sudo -n systemd-analyze verify "$staging/deploy/systemd/azmigrantat-video-gpu-orchestrator.service"

sudo -n install -d -o root -g root -m 0755 "$active/dist/gpu" "$active/deploy/gpu-worker" "$active/deploy/gpu"
sudo -n install -o root -g root -m 0644 "$staging/dist/gpu-orchestrator-server.js" "$active/dist/gpu-orchestrator-server.js"
sudo -n find "$staging/dist/gpu" -maxdepth 1 -type f -name '*.js' -exec install -o root -g root -m 0644 {} "$active/dist/gpu/" \;
sudo -n find "$staging/deploy/gpu-worker" -maxdepth 1 -type f -exec install -o root -g root -m 0644 {} "$active/deploy/gpu-worker/" \;
sudo -n install -o root -g root -m 0644 "$staging/deploy/gpu/README.md" "$active/deploy/gpu/README.md"

if sudo -n awk -F= '/^(GPU_|SWIFTVR_)/ {found=1} END {exit found ? 0 : 1}' "$environment"; then
    echo "GPU/SWIFTVR environment keys already exist; refusing to merge automatically." >&2
    exit 1
fi
sudo -n cp -a "$environment" "$staging/video-service.env.next"
sudo -n tee -a "$staging/video-service.env.next" >/dev/null <<'EOF'

# Inactive SwiftVR / rented GPU preparation. Do not enable without a reviewed release.
GPU_ORCHESTRATOR_HOST=127.0.0.1
GPU_ORCHESTRATOR_PORT=3110
GPU_PROVISIONING_ENABLED=0
GPU_PROVIDER=disabled
GPU_MAX_ACTIVE_INSTANCES=1
GPU_MAX_HOURLY_PRICE=0
GPU_MAX_DAILY_BUDGET=0
GPU_MAX_MONTHLY_BUDGET=0
GPU_IDLE_TIMEOUT_SECONDS=300
GPU_CAPABILITY_TTL_SECONDS=300
GPU_WORKER_HEARTBEAT_SECONDS=15
GPU_WORKER_LOST_SECONDS=90
GPU_JOB_TIMEOUT_SECONDS=7200
GPU_WORKER_IMAGE=
GPU_MODEL_MANIFEST_PATH=/opt/azmigrantat-video-service/deploy/gpu-worker/model-manifest.json
GPU_COST_LEDGER_PATH=/srv/azmigrantat-video/state/gpu-cost-ledger.jsonl
GPU_CAPABILITY_SECRET=
GPU_WORKER_REQUEST_SECRET=
SWIFTVR_COMMERCIAL_USE_APPROVED=0
EOF
sudo -n chown --reference="$environment" "$staging/video-service.env.next"
sudo -n chmod --reference="$environment" "$staging/video-service.env.next"
sudo -n mv "$staging/video-service.env.next" "$environment"

sudo -n install -o root -g root -m 0644 "$staging/deploy/systemd/azmigrantat-video-gpu-orchestrator.service" "$unit"
sudo -n systemctl daemon-reload
sudo -n systemctl start azmigrantat-video-gpu-orchestrator.service
test "$(sudo -n systemctl is-enabled azmigrantat-video-gpu-orchestrator.service 2>/dev/null || true)" != enabled
test "$(sudo -n systemctl is-active azmigrantat-video-gpu-orchestrator.service)" = active
curl --fail --silent --show-error http://127.0.0.1:3110/health
ready_status=$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3110/ready)
test "$ready_status" = 503

for service in azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service azmigrantat-video-ai-enhancement-worker.service redis-server nginx; do
    test "$(sudo -n systemctl is-active "$service")" = active
done
curl --fail --silent --show-error http://127.0.0.1:3100/health
echo
echo "release=$release"
echo "backup=$backup"
echo "provisioning=disabled"
