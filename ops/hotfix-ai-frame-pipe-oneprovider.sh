#!/usr/bin/env bash
set -Eeuo pipefail

readonly adapter=/opt/azmigrantat-video-ai/adapter/light_ai_video.py
readonly wrapper=/usr/local/libexec/azmigrantat-light-ai-adapter
readonly unit=/etc/systemd/system/azmigrantat-video-ai-enhancement-worker.service
readonly env_file=/etc/azmigrantat-video/video-service.env
readonly new_adapter_sha256=6a72723387509db3ed1cf116eaa6cae899d88ff87fdbf73d60bf5f9cea1f7768
readonly stamp="$(date -u +%Y%m%dT%H%M%SZ)"
readonly backup="/var/backups/azmigrantat-video-ai-pipe-hotfix-$stamp"

sudo install -d -o root -g root -m 0700 "$backup"
sudo cp -a "$adapter" "$backup/light_ai_video.py"
sudo cp -a "$wrapper" "$backup/azmigrantat-light-ai-adapter"
sudo cp -a "$unit" "$backup/azmigrantat-video-ai-enhancement-worker.service"
sudo cp -a "$env_file" "$backup/video-service.env"

rollback() {
  local status=$?
  trap - ERR
  sudo install -o root -g root -m 0755 "$backup/light_ai_video.py" "$adapter" || true
  sudo install -o root -g root -m 0755 "$backup/azmigrantat-light-ai-adapter" "$wrapper" || true
  sudo install -o root -g root -m 0644 "$backup/azmigrantat-video-ai-enhancement-worker.service" "$unit" || true
  sudo install -o root -g azmigrantat-video -m 0640 "$backup/video-service.env" "$env_file" || true
  sudo systemctl daemon-reload || true
  sudo systemctl restart azmigrantat-video-ai-enhancement-worker.service || true
  printf 'rollback=%s backup=%s\n' "$status" "$backup" >&2
  exit "$status"
}
trap rollback ERR

sudo systemctl stop azmigrantat-video-ai-enhancement-worker.service
sudo install -o root -g root -m 0755 /tmp/light_ai_video.py "${adapter}.hotfix.tmp"
sudo mv "${adapter}.hotfix.tmp" "$adapter"
sudo install -o root -g root -m 0755 /tmp/azmigrantat-light-ai-adapter "${wrapper}.hotfix.tmp"
sudo mv "${wrapper}.hotfix.tmp" "$wrapper"
sudo install -o root -g root -m 0644 /tmp/azmigrantat-video-ai-enhancement-worker.service "${unit}.hotfix.tmp"
sudo mv "${unit}.hotfix.tmp" "$unit"

sudo awk -v value="$new_adapter_sha256" '
  BEGIN { found=0 }
  /^VIDEO_ENHANCEMENT_AI_ADAPTER_FINGERPRINT=/ {
    print "VIDEO_ENHANCEMENT_AI_ADAPTER_FINGERPRINT=" value
    found=1
    next
  }
  { print }
  END { if (!found) print "VIDEO_ENHANCEMENT_AI_ADAPTER_FINGERPRINT=" value }
' "$env_file" | sudo tee "${env_file}.hotfix.tmp" >/dev/null
sudo chown root:azmigrantat-video "${env_file}.hotfix.tmp"
sudo chmod 0640 "${env_file}.hotfix.tmp"
sudo mv "${env_file}.hotfix.tmp" "$env_file"

sudo systemctl daemon-reload
redis-cli DEL azmigrantat:video:enhancement:ai:readiness >/dev/null
sudo systemctl start azmigrantat-video-ai-enhancement-worker.service

readiness=
for _ in $(seq 1 30); do
  readiness=$(redis-cli --raw GET azmigrantat:video:enhancement:ai:readiness)
  [[ -n $readiness ]] && break
  sleep 1
done
printf '%s' "$readiness" | node -e '
  const fs = require("fs");
  const value = JSON.parse(fs.readFileSync(0, "utf8"));
  const expected = process.argv[1];
  if (value.ready !== true || value.engine !== "openvino-espcn-x2-restore-v1" ||
      value.adapter_fingerprint !== expected ||
      JSON.stringify(value.supported_target_short_sides) !== "[720]" ||
      value.expires_at <= Date.now()) process.exit(1);
' "$new_adapter_sha256"

sudo systemctl is-active --quiet azmigrantat-video-ai-enhancement-worker.service
sudo systemctl is-active --quiet azmigrantat-video.service
sudo systemctl is-active --quiet azmigrantat-video-worker.service
sudo systemctl is-active --quiet azmigrantat-video-enhancement-worker.service
trap - ERR
printf 'deployed=1 adapter_sha256=%s backup=%s\n' "$new_adapter_sha256" "$backup"
