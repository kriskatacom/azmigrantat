#!/usr/bin/env bash
set -euo pipefail

release_name="${1:-}"
if [[ ! "$release_name" =~ ^azmigrantat-video-service-enhancement-[0-9]{8}T[0-9]{6}Z$ ]]; then
  printf 'Invalid release name.\n' >&2
  exit 2
fi

release="/opt/releases/$release_name"
current=/opt/azmigrantat-video-service
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
rollback="/opt/azmigrantat-video-service.rollback-$stamp"
backup="/var/backups/azmigrantat-video-enhancement-$stamp"
env_file=/etc/azmigrantat-video/video-service.env
nginx_file=/etc/nginx/sites-enabled/video.azmigrantat.com
unit_file=/etc/systemd/system/azmigrantat-video-enhancement-worker.service
ai_unit_file=/etc/systemd/system/azmigrantat-video-ai-enhancement-worker.service
ai_slice_file=/etc/systemd/system/azmigrantat-video-ai.slice
switched=0

restore() {
  status=$?
  trap - ERR
  if (( switched == 1 )); then
    sudo systemctl stop azmigrantat-video-enhancement-worker.service || true
    sudo mv "$current" "${release}.failed-$stamp" || true
    sudo mv "$rollback" "$current" || true
  fi
  sudo install -m 0640 -o root -g azmigrantat-video "$backup/video-service.env" "$env_file" || true
  sudo install -m 0644 -o root -g root "$backup/video.azmigrantat.com" "$nginx_file" || true
  if [[ -f "$backup/azmigrantat-video-enhancement-worker.service" ]]; then
    sudo install -m 0644 -o root -g root "$backup/azmigrantat-video-enhancement-worker.service" "$unit_file" || true
  else
    sudo rm -f "$unit_file" || true
  fi
  if [[ -f "$backup/azmigrantat-video-ai-enhancement-worker.service" ]]; then
    sudo install -m 0644 -o root -g root "$backup/azmigrantat-video-ai-enhancement-worker.service" "$ai_unit_file" || true
  else
    sudo rm -f "$ai_unit_file" || true
  fi
  if [[ -f "$backup/azmigrantat-video-ai.slice" ]]; then
    sudo install -m 0644 -o root -g root "$backup/azmigrantat-video-ai.slice" "$ai_slice_file" || true
  else
    sudo rm -f "$ai_slice_file" || true
  fi
  sudo systemctl daemon-reload || true
  sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service || true
  sudo nginx -t && sudo systemctl reload nginx.service || true
  printf 'deployment=rolled_back status=%s\n' "$status" >&2
  exit "$status"
}
trap restore ERR

sudo test -d "$release/dist"
sudo test -d "$release/node_modules"
sudo test -d "$current"
sudo install -d -o root -g root -m 0700 "$backup"
sudo cp -a "$env_file" "$backup/video-service.env"
sudo cp -a "$nginx_file" "$backup/video.azmigrantat.com"
if sudo test -f "$unit_file"; then
  sudo cp -a "$unit_file" "$backup/azmigrantat-video-enhancement-worker.service"
fi
if sudo test -f "$ai_unit_file"; then sudo cp -a "$ai_unit_file" "$backup/azmigrantat-video-ai-enhancement-worker.service"; fi
if sudo test -f "$ai_slice_file"; then sudo cp -a "$ai_slice_file" "$backup/azmigrantat-video-ai.slice"; fi

append_env() {
  key="$1"
  value="$2"
  if ! sudo grep -q "^${key}=" "$env_file"; then
    printf '%s=%s\n' "$key" "$value" | sudo tee -a "$env_file" >/dev/null
  fi
}

append_env VIDEO_ENHANCEMENT_ENABLED 1
append_env VIDEO_ENHANCEMENT_AI_ENABLED 0
append_env VIDEO_ENHANCEMENT_QUEUE_KEY azmigrantat:video:enhancement
append_env VIDEO_ENHANCEMENT_AI_QUEUE_KEY azmigrantat:video:enhancement:ai
append_env VIDEO_ENHANCEMENT_AI_READINESS_KEY azmigrantat:video:enhancement:ai:readiness
append_env VIDEO_ENHANCEMENT_AI_READINESS_TTL_SECONDS 45
append_env VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS 300
append_env VIDEO_ENHANCEMENT_FINALIZE_RESERVE_SECONDS 20
append_env VIDEO_ENHANCEMENT_CONCURRENCY 1
append_env VIDEO_ENHANCEMENT_FAST_720_FPS 70
append_env VIDEO_ENHANCEMENT_FAST_1080_FPS 35
append_env VIDEO_ENHANCEMENT_AI_1080_FPS 0.1
append_env VIDEO_ENHANCEMENT_AI_720_FPS 0.2
append_env VIDEO_ENHANCEMENT_MAX_720_DURATION_SECONDS 240
append_env VIDEO_ENHANCEMENT_MAX_1080_DURATION_SECONDS 120
append_env VIDEO_ENHANCEMENT_MAX_AI_DURATION_SECONDS 5
append_env VIDEO_ENHANCEMENT_MAX_AI_720_DURATION_SECONDS 5
append_env VIDEO_ENHANCEMENT_MAX_AI_1080_DURATION_SECONDS 5
append_env VIDEO_ENHANCEMENT_MAX_LOAD_PER_CPU 0.70
append_env VIDEO_ENHANCEMENT_MIN_AVAILABLE_MEMORY_BYTES 4294967296
append_env VIDEO_ENHANCEMENT_MAX_QUEUE_DEPTH 1
append_env VIDEO_ENHANCEMENT_FFMPEG_THREADS 6
append_env VIDEO_ENHANCEMENT_AI_MAX_QUEUE_DEPTH 1
append_env VIDEO_ENHANCEMENT_AI_MAX_LOAD_PER_CPU 0.35
append_env VIDEO_ENHANCEMENT_AI_MIN_AVAILABLE_MEMORY_BYTES 17179869184
append_env VIDEO_ENHANCEMENT_AI_MAX_INPUT_PIXELS 2073600
append_env VIDEO_ENHANCEMENT_AI_MAX_WORKSPACE_BYTES 8589934592
append_env VIDEO_ENHANCEMENT_AI_ENGINE disabled
append_env VIDEO_ENHANCEMENT_AI_COMMAND ''
append_env VIDEO_ENHANCEMENT_AI_MODEL_FINGERPRINT ''

# The current host failed the AI deadline benchmark. Force deny-by-default even
# if a stale value exists in the environment, without touching any secret.
sudo sed -i 's/^VIDEO_ENHANCEMENT_AI_ENABLED=.*/VIDEO_ENHANCEMENT_AI_ENABLED=0/' "$env_file"
sudo sed -i 's/^VIDEO_ENHANCEMENT_AI_ENGINE=.*/VIDEO_ENHANCEMENT_AI_ENGINE=disabled/' "$env_file"

sudo install -m 0644 -o root -g root /tmp/azmigrantat-video-enhancement-worker.service "$unit_file"
sudo install -m 0644 -o root -g root /tmp/azmigrantat-video-ai-enhancement-worker.service "$ai_unit_file"
sudo install -m 0644 -o root -g root /tmp/azmigrantat-video-ai.slice "$ai_slice_file"
sudo install -m 0644 -o root -g root /tmp/video.azmigrantat.com.enhancement "$nginx_file"
sudo systemd-analyze verify "$unit_file" "$ai_unit_file" "$ai_slice_file"
sudo nginx -t

sudo mv "$current" "$rollback"
sudo mv "$release" "$current"
switched=1
sudo systemctl daemon-reload
sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service || true
sudo systemctl restart azmigrantat-video.service azmigrantat-video-worker.service
sudo systemctl enable azmigrantat-video-enhancement-worker.service
sudo systemctl restart azmigrantat-video-enhancement-worker.service
sudo systemctl reload nginx.service

curl --fail --silent --show-error http://127.0.0.1:3100/health >/dev/null
sudo systemctl is-active --quiet azmigrantat-video.service
sudo systemctl is-active --quiet azmigrantat-video-worker.service
sudo systemctl is-active --quiet azmigrantat-video-enhancement-worker.service
! sudo systemctl is-active --quiet azmigrantat-video-ai-enhancement-worker.service
sudo systemctl is-active --quiet nginx.service
trap - ERR
printf 'deployment=active release=%s rollback=%s backup=%s\n' "$release_name" "$rollback" "$backup"
