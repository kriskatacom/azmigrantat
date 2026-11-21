#!/usr/bin/env bash
set -Eeuo pipefail

printf 'This V2 deployment path is retired. Use ops/activate-ai-v3-oneprovider.sh.\n' >&2
exit 2

readonly release_name="${1:-}"
[[ $release_name =~ ^azmigrantat-video-service-ai-[0-9]{8}T[0-9]{6}Z$ ]] || { printf 'Invalid release name.\n' >&2; exit 2; }

readonly release="/opt/releases/$release_name"
readonly runtime_staged="/opt/releases/${release_name}-runtime"
readonly current=/opt/azmigrantat-video-service
readonly ai_root=/opt/azmigrantat-video-ai
readonly env_file=/etc/azmigrantat-video/video-service.env
readonly ai_unit=/etc/systemd/system/azmigrantat-video-ai-enhancement-worker.service
readonly ai_slice=/etc/systemd/system/azmigrantat-video-ai.slice
readonly wrapper=/usr/local/libexec/azmigrantat-light-ai-adapter
readonly stamp=$(date -u +%Y%m%dT%H%M%SZ)
readonly rollback_release="/opt/azmigrantat-video-service.rollback-$stamp"
readonly rollback_runtime="/opt/azmigrantat-video-ai.rollback-$stamp"
readonly backup="/var/backups/azmigrantat-video-ai-$stamp"
readonly model_sha256=59f77351e1d7c0057bf6fe088b4a8a07e42c468c8c8aebb674a6b4ea1823221d
release_switched=0
runtime_switched=0

sudo -n true
sudo test -d "$release/dist"
sudo test -d "$release/node_modules"
sudo test -d "$runtime_staged/runtime/venv"
sudo test -f "$runtime_staged/models/ESPCN_x2.pb"
sudo test -f "$runtime_staged/adapter/light_ai_video.py"
[[ $(sudo sha256sum "$runtime_staged/models/ESPCN_x2.pb" | awk '{print $1}') == "$model_sha256" ]]
sudo grep -q '^VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS=300$' "$env_file"
sudo systemctl is-active --quiet azmigrantat-video.service
sudo systemctl is-active --quiet azmigrantat-video-worker.service
sudo systemctl is-active --quiet azmigrantat-video-enhancement-worker.service

sudo install -d -o root -g root -m 0700 "$backup"
sudo cp -a "$env_file" "$backup/video-service.env"
for file in "$ai_unit" "$ai_slice" "$wrapper"; do
  if sudo test -f "$file"; then sudo cp -a "$file" "$backup/$(basename "$file")"; fi
done

rollback() {
  local status=$?
  trap - ERR
  sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service >/dev/null 2>&1 || true
  if (( release_switched == 1 )); then
    sudo mv "$current" "${release}.failed-$stamp" || true
    sudo mv "$rollback_release" "$current" || true
  fi
  if (( runtime_switched == 1 )); then
    sudo mv "$ai_root" "${runtime_staged}.failed-$stamp" || true
    if sudo test -d "$rollback_runtime"; then sudo mv "$rollback_runtime" "$ai_root" || true; fi
  fi
  sudo install -o root -g azmigrantat-video -m 0640 "$backup/video-service.env" "$env_file" || true
  for file in "$ai_unit" "$ai_slice" "$wrapper"; do
    local saved="$backup/$(basename "$file")"
    if sudo test -f "$saved"; then sudo install -o root -g root -m 0644 "$saved" "$file" || true; else sudo rm -f "$file" || true; fi
  done
  sudo systemctl daemon-reload || true
  sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service || true
  printf 'deployment=rolled_back status=%s backup=%s\n' "$status" "$backup" >&2
  exit "$status"
}
trap rollback ERR

set_env() {
  local key=$1 value=$2 temporary
  temporary="${env_file}.ai-$stamp.tmp"
  sudo awk -v key="$key" -v value="$value" 'BEGIN { found=0 } $0 ~ "^" key "=" { print key "=" value; found=1; next } { print } END { if (!found) print key "=" value }' "$env_file" | sudo tee "$temporary" >/dev/null
  sudo chown root:azmigrantat-video "$temporary"
  sudo chmod 0640 "$temporary"
  sudo mv "$temporary" "$env_file"
}

sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service >/dev/null 2>&1 || true
redis-cli DEL azmigrantat:video:enhancement:ai:readiness >/dev/null

if sudo test -d "$ai_root"; then sudo mv "$ai_root" "$rollback_runtime"; fi
sudo mv "$runtime_staged" "$ai_root"
runtime_switched=1
sudo chown -R root:root "$ai_root"
sudo find "$ai_root" -type d -exec chmod 0755 {} +
sudo find "$ai_root" -type f -exec chmod 0644 {} +
sudo find "$ai_root/runtime/venv/bin" -maxdepth 1 -type f -exec chmod 0755 {} +
sudo chmod 0755 "$ai_root/adapter/light_ai_video.py"

sudo install -o root -g root -m 0755 /tmp/azmigrantat-light-ai-adapter "$wrapper"
sudo install -o root -g root -m 0644 /tmp/azmigrantat-video-ai-enhancement-worker.service "$ai_unit"
sudo install -o root -g root -m 0644 /tmp/azmigrantat-video-ai.slice "$ai_slice"

set_env VIDEO_ENHANCEMENT_AI_ENABLED 1
set_env VIDEO_ENHANCEMENT_AI_MAX_TOTAL_SECONDS 900
set_env VIDEO_ENHANCEMENT_AI_720_FPS 6.0
set_env VIDEO_ENHANCEMENT_MAX_AI_720_DURATION_SECONDS 120
set_env VIDEO_ENHANCEMENT_MAX_AI_1080_DURATION_SECONDS 1
set_env VIDEO_ENHANCEMENT_AI_ENGINE opencv-espcn-x2-restore-v1
set_env VIDEO_ENHANCEMENT_AI_COMMAND "$wrapper"
set_env VIDEO_ENHANCEMENT_AI_MODEL_FINGERPRINT "$model_sha256"
set_env VIDEO_ENHANCEMENT_AI_MAX_QUEUE_DEPTH 1
set_env VIDEO_ENHANCEMENT_AI_MAX_LOAD_PER_CPU 0.35
set_env VIDEO_ENHANCEMENT_AI_MIN_AVAILABLE_MEMORY_BYTES 17179869184
set_env VIDEO_ENHANCEMENT_AI_MAX_INPUT_PIXELS 2073600
set_env VIDEO_ENHANCEMENT_AI_MAX_WORKSPACE_BYTES 8589934592
sudo grep -q '^VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS=300$' "$env_file"

sudo systemd-analyze verify "$ai_unit" "$ai_slice"
sudo mv "$current" "$rollback_release"
sudo mv "$release" "$current"
release_switched=1
sudo systemctl daemon-reload
sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service
for _ in $(seq 1 15); do
  sudo systemctl is-active --quiet azmigrantat-video.service || exit 1
  if curl --fail --silent --max-time 2 http://127.0.0.1:3100/health >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3100/health >/dev/null

preflight=$(sudo -u azmigrantat-video "$wrapper" --preflight --protocol-version 1)
printf '%s' "$preflight" | grep -q '"ready":true'
printf '%s' "$preflight" | grep -q '"engine":"opencv-espcn-x2-restore-v1"'
printf '%s' "$preflight" | grep -q '"supported_target_short_sides":\[720\]'
printf '%s' "$preflight" | grep -q "\"model_fingerprint\":\"$model_sha256\""

sudo systemctl enable --now azmigrantat-video-ai-enhancement-worker.service
for _ in $(seq 1 15); do
  sudo systemctl is-active --quiet azmigrantat-video-ai-enhancement-worker.service || exit 1
  readiness=$(redis-cli --raw GET azmigrantat:video:enhancement:ai:readiness)
  if [[ $readiness == *"$model_sha256"* && $readiness == *'"supported_target_short_sides":[720]'* ]]; then break; fi
  sleep 1
done
[[ ${readiness:-} == *"$model_sha256"* ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:processing) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai:processing) == 0 ]]
sudo grep -q '^CPUQuota=200%$' "$ai_slice"
sudo grep -q '^MemoryMax=10G$' "$ai_slice"
sudo grep -q '^VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS=300$' "$env_file"
sudo journalctl -u azmigrantat-video-ai-enhancement-worker.service --since "2 minutes ago" --no-pager | grep -qv 'ai_worker_not_ready' || true

trap - ERR
printf 'deployment=active release=%s rollback=%s runtime_rollback=%s backup=%s\n' "$release_name" "$rollback_release" "$rollback_runtime" "$backup"
