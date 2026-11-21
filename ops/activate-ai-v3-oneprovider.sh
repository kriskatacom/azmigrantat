#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_id="${1:-}"
readonly expected_worker_sha256="${2:-}"
readonly expected_adapter_sha256="${3:-}"
readonly expected_wrapper_sha256="${4:-}"
[[ $release_id =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { printf 'Invalid release id.\n' >&2; exit 2; }
for digest in "$expected_worker_sha256" "$expected_adapter_sha256" "$expected_wrapper_sha256"; do
  [[ $digest =~ ^[a-f0-9]{64}$ ]] || { printf 'Invalid SHA-256.\n' >&2; exit 2; }
done

readonly model_sha256=59f77351e1d7c0057bf6fe088b4a8a07e42c468c8c8aebb674a6b4ea1823221d
readonly engine=openvino-espcn-x2-restore-v1
readonly current=/opt/azmigrantat-video-service
readonly runtime=/opt/azmigrantat-video-ai
readonly runtime_staged="/opt/releases/azmigrantat-video-ai-openvino-$release_id"
readonly env_file=/etc/azmigrantat-video/video-service.env
readonly ai_unit=/etc/systemd/system/azmigrantat-video-ai-enhancement-worker.service
readonly ai_slice=/etc/systemd/system/azmigrantat-video-ai.slice
readonly wrapper=/usr/local/libexec/azmigrantat-light-ai-adapter
readonly staged_worker=/tmp/azmigrantat-ai-enhancement-worker.js.v3
readonly staged_unit=/tmp/azmigrantat-video-ai-enhancement-worker-v3.service
readonly staged_wrapper=/tmp/azmigrantat-light-ai-adapter.v3
readonly backup="/var/backups/azmigrantat-video-ai-v3-active-$release_id"
readonly rollback_runtime="/opt/azmigrantat-video-ai.rollback-active-$release_id"
runtime_switched=0

sudo -n true
sudo test -d "$runtime_staged/runtime/venv"
sudo test -f "$runtime_staged/models/ESPCN_x2.pb"
sudo test -f "$runtime_staged/adapter/light_ai_video.py"
sudo test -f "$staged_worker"
sudo test -f "$staged_unit"
sudo test -f "$staged_wrapper"
[[ $(sudo sha256sum "$runtime_staged/models/ESPCN_x2.pb" | awk '{print $1}') == "$model_sha256" ]]
[[ $(sudo sha256sum "$runtime_staged/adapter/light_ai_video.py" | awk '{print $1}') == "$expected_adapter_sha256" ]]
[[ $(sha256sum "$staged_worker" | awk '{print $1}') == "$expected_worker_sha256" ]]
[[ $(sha256sum "$staged_wrapper" | awk '{print $1}') == "$expected_wrapper_sha256" ]]
sudo grep -q '^VIDEO_ENHANCEMENT_AI_ENABLED=0$' "$env_file"
sudo grep -q '^VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS=300$' "$env_file"
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
sudo systemctl is-active --quiet azmigrantat-video.service
sudo systemctl is-active --quiet azmigrantat-video-worker.service
sudo systemctl is-active --quiet azmigrantat-video-enhancement-worker.service
for key in azmigrantat:video:processing azmigrantat:video:enhancement azmigrantat:video:enhancement:processing azmigrantat:video:enhancement:ai azmigrantat:video:enhancement:ai:processing; do
  [[ $(redis-cli --raw LLEN "$key") == 0 ]]
done
[[ $(redis-cli --raw HLEN azmigrantat:video:enhancement:ai:processing:v3) == 0 ]]
[[ $(redis-cli --raw ZCARD azmigrantat:video:enhancement:ai:leases:v3) == 0 ]]
[[ $(redis-cli --raw EXISTS azmigrantat:video:enhancement:ai:active:v3) == 0 ]]

sudo systemd-analyze verify "$staged_unit" "$ai_slice"
preflight=$(sudo -u azmigrantat-video /usr/bin/env \
  AZMIGRANTAT_AI_MODEL="$runtime_staged/models/ESPCN_x2.pb" \
  AZMIGRANTAT_AI_EXPECTED_MODEL_SHA256="$model_sha256" \
  AZMIGRANTAT_AI_ALGORITHM=espcn AZMIGRANTAT_AI_BACKEND=openvino AZMIGRANTAT_AI_PROFILE=restore \
  AZMIGRANTAT_AI_REQUIRE_ROOT_OWNED=1 OMP_NUM_THREADS=2 \
  "$runtime_staged/runtime/venv/bin/python" "$runtime_staged/adapter/light_ai_video.py" --preflight --protocol-version 1)
printf '%s' "$preflight" | /usr/local/bin/node -e '
const fs=require("fs"); const v=JSON.parse(fs.readFileSync(0,"utf8"));
const [engine,model,adapter]=process.argv.slice(1);
if(v.protocol_version!==1||v.ready!==true||v.engine!==engine||v.model_fingerprint!==model||v.adapter_fingerprint!==adapter||JSON.stringify(v.supported_target_short_sides)!=="[720]"||v.enforces_workspace_limit!==true) process.exit(1);
' "$engine" "$model_sha256" "$expected_adapter_sha256"

sudo test ! -e "$backup"
sudo test ! -e "$rollback_runtime"
sudo install -d -o root -g root -m 0700 "$backup"
sudo cp -a "$env_file" "$backup/video-service.env"
sudo cp -a "$current/dist/ai-enhancement-worker.js" "$backup/ai-enhancement-worker.js"
sudo cp -a "$ai_unit" "$backup/$(basename "$ai_unit")"
sudo cp -a "$wrapper" "$backup/$(basename "$wrapper")"

rollback() {
  local status=$?
  trap - ERR
  sudo systemctl disable --now azmigrantat-video-ai-enhancement-worker.service >/dev/null 2>&1 || true
  redis-cli DEL azmigrantat:video:enhancement:ai:readiness >/dev/null 2>&1 || true
  sudo install -o root -g azmigrantat-video -m 0640 "$backup/video-service.env" "$env_file" || true
  sudo install -o root -g root -m 0644 "$backup/ai-enhancement-worker.js" "$current/dist/ai-enhancement-worker.js" || true
  sudo install -o root -g root -m 0644 "$backup/$(basename "$ai_unit")" "$ai_unit" || true
  sudo install -o root -g root -m 0755 "$backup/$(basename "$wrapper")" "$wrapper" || true
  if (( runtime_switched == 1 )); then
    sudo mv "$runtime" "${runtime_staged}.failed" || true
    sudo mv "$rollback_runtime" "$runtime" || true
  fi
  sudo systemctl daemon-reload || true
  sudo systemctl restart azmigrantat-video.service || true
  printf 'activation=rolled_back status=%s backup=%s\n' "$status" "$backup" >&2
  exit "$status"
}
trap rollback ERR

set_env() {
  local key=$1 value=$2 temporary="${env_file}.v3-$release_id.tmp"
  sudo awk -v key="$key" -v value="$value" 'BEGIN { found=0 } $0 ~ "^" key "=" { print key "=" value; found=1; next } { print } END { if (!found) print key "=" value }' "$env_file" | sudo tee "$temporary" >/dev/null
  sudo chown root:azmigrantat-video "$temporary"
  sudo chmod 0640 "$temporary"
  sudo mv "$temporary" "$env_file"
}

sudo install -o root -g root -m 0644 "$staged_worker" "$current/dist/ai-enhancement-worker.js.v3-$release_id.tmp"
sudo mv "$current/dist/ai-enhancement-worker.js.v3-$release_id.tmp" "$current/dist/ai-enhancement-worker.js"
sudo install -o root -g root -m 0644 "$staged_unit" "$ai_unit"
sudo install -o root -g root -m 0755 "$staged_wrapper" "$wrapper"
sudo mv "$runtime" "$rollback_runtime"
sudo mv "$runtime_staged" "$runtime"
runtime_switched=1
sudo chown -R root:root "$runtime"

set_env VIDEO_ENHANCEMENT_AI_ENABLED 1
set_env VIDEO_ENHANCEMENT_AI_ENGINE "$engine"
set_env VIDEO_ENHANCEMENT_AI_COMMAND "$wrapper"
set_env VIDEO_ENHANCEMENT_AI_MODEL_FINGERPRINT "$model_sha256"
set_env VIDEO_ENHANCEMENT_AI_ADAPTER_FINGERPRINT "$expected_adapter_sha256"
set_env VIDEO_ENHANCEMENT_AI_MAX_TOTAL_SECONDS 7200
set_env VIDEO_ENHANCEMENT_AI_720_FPS 8.0
set_env VIDEO_ENHANCEMENT_MAX_AI_720_DURATION_SECONDS 120
set_env VIDEO_ENHANCEMENT_MAX_AI_1080_DURATION_SECONDS 1
set_env VIDEO_ENHANCEMENT_AI_MAX_QUEUE_DEPTH 1
set_env VIDEO_ENHANCEMENT_AI_MAX_LOAD_PER_CPU 0.35
set_env VIDEO_ENHANCEMENT_AI_MIN_AVAILABLE_MEMORY_BYTES 17179869184
set_env VIDEO_ENHANCEMENT_AI_MAX_INPUT_PIXELS 2073600
set_env VIDEO_ENHANCEMENT_AI_MAX_WORKSPACE_BYTES 8589934592
set_env VIDEO_ENHANCEMENT_AI_LEASE_SECONDS 120
set_env VIDEO_ENHANCEMENT_AI_MAX_ATTEMPTS 2
set_env VIDEO_ENHANCEMENT_AI_PREEMPT_CHECK_MS 1000
sudo grep -q '^VIDEO_ENHANCEMENT_MAX_TOTAL_SECONDS=300$' "$env_file"

redis-cli DEL azmigrantat:video:enhancement:ai:readiness >/dev/null
sudo systemctl daemon-reload
sudo systemctl start azmigrantat-video-ai-enhancement-worker.service
for _ in $(seq 1 30); do
  readiness=$(redis-cli --raw GET azmigrantat:video:enhancement:ai:readiness)
  if [[ -n $readiness ]]; then break; fi
  sleep 1
done
printf '%s' "${readiness:-}" | /usr/local/bin/node -e '
const fs=require("fs"); const v=JSON.parse(fs.readFileSync(0,"utf8"));
const [engine,model,adapter]=process.argv.slice(1);
if(v.protocol_version!==1||v.ready!==true||v.engine!==engine||v.model_fingerprint!==model||v.adapter_fingerprint!==adapter||JSON.stringify(v.supported_target_short_sides)!=="[720]"||typeof v.worker_id!=="string"||!v.worker_id||typeof v.expires_at!=="number"||v.expires_at<=Date.now()) process.exit(1);
' "$engine" "$model_sha256" "$expected_adapter_sha256"
sudo systemctl is-active --quiet azmigrantat-video-ai-enhancement-worker.service
sudo systemctl enable azmigrantat-video-ai-enhancement-worker.service >/dev/null

sudo systemctl restart azmigrantat-video.service
for _ in $(seq 1 20); do curl -fsS --max-time 2 http://127.0.0.1:3100/health >/dev/null && break; sleep 1; done
curl -fsS --max-time 5 http://127.0.0.1:3100/health >/dev/null
sudo systemctl is-active --quiet azmigrantat-video-worker.service
sudo systemctl is-active --quiet azmigrantat-video-enhancement-worker.service
sudo grep -q '^CPUQuota=150%$' "$ai_slice"
sudo grep -q '^MemoryHigh=4G$' "$ai_slice"
sudo grep -q '^MemoryMax=6G$' "$ai_slice"
sudo grep -q '^MemorySwapMax=0$' "$ai_slice"
[[ $(redis-cli --raw LLEN azmigrantat:video:processing) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai) == 0 ]]
sudo journalctl -u azmigrantat-video-ai-enhancement-worker.service --since '3 minutes ago' --no-pager | grep -qv 'ai_worker_not_ready'

trap - ERR
printf 'activation=active engine=%s model_sha256=%s adapter_sha256=%s backup=%s runtime_rollback=%s\n' "$engine" "$model_sha256" "$expected_adapter_sha256" "$backup" "$rollback_runtime"
