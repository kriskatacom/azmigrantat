#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_name=${1:-}
readonly adapter_sha256=${2:-}
[[ $release_name =~ ^azmigrantat-video-service-ai-[0-9]{8}T[0-9]{6}Z$ ]]
[[ $adapter_sha256 =~ ^[a-f0-9]{64}$ ]]
readonly release="/opt/releases/$release_name"
readonly staged_runtime="/opt/releases/${release_name}-runtime"
readonly current=/opt/azmigrantat-video-service
readonly ai_root=/opt/azmigrantat-video-ai
readonly env_file=/etc/azmigrantat-video/video-service.env
readonly stamp=$(date -u +%Y%m%dT%H%M%SZ)
readonly backup="/var/backups/azmigrantat-video-ai-v3-disabled-$stamp"
readonly rollback_release="/opt/azmigrantat-video-service.rollback-v3-$stamp"
readonly rollback_runtime="/opt/azmigrantat-video-ai.rollback-v3-$stamp"
readonly model_sha256=59f77351e1d7c0057bf6fe088b4a8a07e42c468c8c8aebb674a6b4ea1823221d
readonly ai_unit=/etc/systemd/system/azmigrantat-video-ai-enhancement-worker.service
readonly ai_slice=/etc/systemd/system/azmigrantat-video-ai.slice
readonly adapter=/usr/local/libexec/azmigrantat-light-ai-adapter
release_switched=0
runtime_switched=0

sudo -n true
sudo test -d "$release/dist"
sudo test -d "$release/node_modules"
sudo test -d "$staged_runtime/runtime/venv"
sudo test -f "$staged_runtime/adapter/light_ai_video.py"
[[ $(sudo sha256sum "$staged_runtime/adapter/light_ai_video.py" | awk '{print $1}') == "$adapter_sha256" ]]
[[ $(sudo sha256sum "$staged_runtime/models/ESPCN_x2.pb" | awk '{print $1}') == "$model_sha256" ]]
[[ $(redis-cli --raw LLEN azmigrantat:video) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:processing) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:processing) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai:processing) == 0 ]]
[[ $(redis-cli --raw HLEN azmigrantat:video:enhancement:ai:processing:v3) == 0 ]]

sudo install -d -o root -g root -m 0700 "$backup"
sudo cp -a "$env_file" "$backup/video-service.env"
sudo cp -a "$ai_unit" "$backup/$(basename "$ai_unit")"
sudo cp -a "$ai_slice" "$backup/$(basename "$ai_slice")"
sudo cp -a "$adapter" "$backup/$(basename "$adapter")"

rollback() {
  local status=$?
  trap - ERR
  sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service >/dev/null 2>&1 || true
  if (( release_switched )); then sudo mv "$current" "${release}.failed-$stamp" || true; sudo mv "$rollback_release" "$current" || true; fi
  if (( runtime_switched )); then sudo mv "$ai_root" "${staged_runtime}.failed-$stamp" || true; sudo mv "$rollback_runtime" "$ai_root" || true; fi
  sudo install -o root -g azmigrantat-video -m 0640 "$backup/video-service.env" "$env_file" || true
  sudo install -o root -g root -m 0644 "$backup/$(basename "$ai_unit")" "$ai_unit" || true
  sudo install -o root -g root -m 0644 "$backup/$(basename "$ai_slice")" "$ai_slice" || true
  sudo install -o root -g root -m 0755 "$backup/$(basename "$adapter")" "$adapter" || true
  sudo systemctl daemon-reload || true
  sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service || true
  printf 'deployment=rolled_back status=%s backup=%s\n' "$status" "$backup" >&2
  exit "$status"
}
trap rollback ERR

set_env() {
  local key=$1 value=$2 temporary="${env_file}.v3-$stamp.tmp"
  sudo awk -v key="$key" -v value="$value" 'BEGIN{found=0} $0 ~ "^" key "=" {print key "=" value; found=1; next} {print} END{if(!found) print key "=" value}' "$env_file" | sudo tee "$temporary" >/dev/null
  sudo chown root:azmigrantat-video "$temporary"
  sudo chmod 0640 "$temporary"
  sudo mv "$temporary" "$env_file"
}

sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service >/dev/null 2>&1 || true
redis-cli DEL azmigrantat:video:enhancement:ai:readiness >/dev/null
sudo mv "$ai_root" "$rollback_runtime"
sudo mv "$staged_runtime" "$ai_root"
runtime_switched=1
sudo chown -R root:root "$ai_root"
sudo find "$ai_root" -type d -exec chmod 0755 {} +
sudo find "$ai_root" -type f -exec chmod 0644 {} +
sudo find "$ai_root/runtime/venv/bin" -maxdepth 1 -type f -exec chmod 0755 {} +
sudo chmod 0755 "$ai_root/adapter/light_ai_video.py"
sudo install -o root -g root -m 0755 /tmp/azmigrantat-light-ai-adapter "$adapter"
sudo install -o root -g root -m 0644 /tmp/azmigrantat-video-ai-enhancement-worker.service "$ai_unit"
sudo install -o root -g root -m 0644 /tmp/azmigrantat-video-ai.slice "$ai_slice"

set_env VIDEO_ENHANCEMENT_AI_ENABLED 0
set_env VIDEO_ENHANCEMENT_AI_ENGINE opencv-espcn-x2-restore-v1
set_env VIDEO_ENHANCEMENT_AI_COMMAND "$adapter"
set_env VIDEO_ENHANCEMENT_AI_MODEL_FINGERPRINT "$model_sha256"
set_env VIDEO_ENHANCEMENT_AI_ADAPTER_FINGERPRINT "$adapter_sha256"
set_env VIDEO_ENHANCEMENT_AI_MAX_TOTAL_SECONDS 7200
set_env VIDEO_ENHANCEMENT_AI_LEASE_SECONDS 120
set_env VIDEO_ENHANCEMENT_AI_MAX_ATTEMPTS 2
set_env VIDEO_ENHANCEMENT_AI_PREEMPT_CHECK_MS 1000
set_env VIDEO_ENHANCEMENT_AI_720_FPS 8.0
set_env VIDEO_ENHANCEMENT_AI_1080_FPS 0.01
set_env VIDEO_ENHANCEMENT_MAX_AI_720_DURATION_SECONDS 120
set_env VIDEO_ENHANCEMENT_MAX_AI_1080_DURATION_SECONDS 1
set_env VIDEO_ENHANCEMENT_AI_MAX_QUEUE_DEPTH 1
set_env VIDEO_ENHANCEMENT_AI_MAX_WORKSPACE_BYTES 8589934592
sudo grep -q '^VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS=300$' "$env_file"
sudo grep -q '^VIDEO_ENHANCEMENT_AI_ENABLED=0$' "$env_file"

sudo systemd-analyze verify "$ai_unit" "$ai_slice"
sudo mv "$current" "$rollback_release"
sudo mv "$release" "$current"
release_switched=1
sudo systemctl daemon-reload
sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service
for _ in $(seq 1 20); do
  sudo systemctl is-active --quiet azmigrantat-video.service || exit 1
  if curl --fail --silent --max-time 2 http://127.0.0.1:3100/health >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3100/health >/dev/null

preflight=$(sudo -u azmigrantat-video "$adapter" --preflight --protocol-version 1)
printf '%s' "$preflight" | grep -q '"ready":true'
printf '%s' "$preflight" | grep -q "\"model_fingerprint\":\"$model_sha256\""
printf '%s' "$preflight" | grep -q "\"adapter_fingerprint\":\"$adapter_sha256\""
sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service >/dev/null 2>&1 || true
redis-cli DEL azmigrantat:video:enhancement:ai:readiness >/dev/null
[[ $(sudo awk -F= '/^VIDEO_ENHANCEMENT_AI_ENABLED=/{print $2}' "$env_file") == 0 ]]
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
[[ $(systemctl is-enabled azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == disabled ]]
sudo systemctl is-active --quiet azmigrantat-video.service
sudo systemctl is-active --quiet azmigrantat-video-worker.service
sudo systemctl is-active --quiet azmigrantat-video-enhancement-worker.service
sudo systemctl is-active --quiet redis-server
sudo systemctl is-active --quiet nginx

trap - ERR
printf 'deployment=disabled release=%s rollback=%s runtime_rollback=%s backup=%s\n' "$release_name" "$rollback_release" "$rollback_runtime" "$backup"
