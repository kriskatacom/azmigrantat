#!/usr/bin/env bash
set -Eeuo pipefail

readonly release_name="${1:-}"
readonly expected_archive_sha256="${2:-}"
[[ $(id -u) == 0 ]]
[[ $release_name =~ ^azmigrantat-video-service-ai-[0-9]{8}T[0-9]{6}Z$ ]]
[[ $expected_archive_sha256 =~ ^[a-f0-9]{64}$ ]]
readonly archive="/tmp/${release_name}.tgz"
readonly release="/opt/releases/$release_name"
readonly runtime="/opt/releases/${release_name}-runtime"
readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113/lightai
readonly model_sha256=59f77351e1d7c0057bf6fe088b4a8a07e42c468c8c8aebb674a6b4ea1823221d

[[ -f "$archive" && ! -L "$archive" ]]
[[ $(sha256sum "$archive" | awk '{print $1}') == "$expected_archive_sha256" ]]
[[ ! -e "$release" && ! -e "$runtime" ]]
install -d -o root -g root -m 0755 "$release" "$runtime" "$runtime/adapter" "$runtime/models" "$runtime/licenses" "$runtime/runtime"
tar -xzf "$archive" -C "$release" --no-same-owner
chown -R root:root "$release"
find "$release" -type d -exec chmod 0755 {} +
find "$release" -type f -exec chmod 0644 {} +
install -d -o azmigrantat-video -g azmigrantat-video -m 0750 "$release/node_modules"
install -d -o azmigrantat-video -g azmigrantat-video -m 0700 "/tmp/${release_name}-npm-cache"
runuser -u azmigrantat-video -- env HOME="/tmp/${release_name}-npm-cache" npm_config_cache="/tmp/${release_name}-npm-cache" \
  /usr/local/bin/npm ci --omit=dev --ignore-scripts --prefix "$release"
chown -R root:root "$release/node_modules"
find "$release/node_modules" -type d -exec chmod 0755 {} +
find "$release/node_modules" -type f -exec chmod 0644 {} +

for entry in server.js worker-server.js enhancement-worker-server.js ai-enhancement-worker-server.js; do
  runuser -u azmigrantat-video -- /usr/local/bin/node --check "$release/dist/$entry"
done

python3 -m venv "$runtime/runtime/venv"
"$runtime/runtime/venv/bin/python" -m pip install --no-index --find-links "$lab/wheels" \
  numpy==2.1.3 opencv-contrib-python-headless==4.11.0.86
install -o root -g root -m 0755 /usr/local/libexec/azmigrantat-ai-benchmark/light_ai_video.py "$runtime/adapter/light_ai_video.py"
install -o root -g root -m 0644 "$lab/models/ESPCN_x2.pb" "$runtime/models/ESPCN_x2.pb"
install -o root -g root -m 0644 "$lab/licenses/ESPCN-LICENSE" "$runtime/licenses/ESPCN-LICENSE"
install -o root -g root -m 0644 "$lab/PREPARATION-MANIFEST.txt" "$runtime/PREPARATION-MANIFEST.txt"
install -o root -g root -m 0644 "$lab/PROVENANCE-SHA256SUMS.txt" "$runtime/PROVENANCE-SHA256SUMS.txt"
[[ $(sha256sum "$runtime/models/ESPCN_x2.pb" | awk '{print $1}') == "$model_sha256" ]]

preflight=$(runuser -u azmigrantat-video -- env \
  AZMIGRANTAT_AI_MODEL="$runtime/models/ESPCN_x2.pb" \
  AZMIGRANTAT_AI_EXPECTED_MODEL_SHA256="$model_sha256" \
  AZMIGRANTAT_AI_ALGORITHM=espcn AZMIGRANTAT_AI_PROFILE=restore \
  AZMIGRANTAT_AI_REQUIRE_ROOT_OWNED=1 \
  "$runtime/runtime/venv/bin/python" "$runtime/adapter/light_ai_video.py" --preflight --protocol-version 1)
printf '%s' "$preflight" | grep -q '"ready":true'
printf '%s' "$preflight" | grep -q '"engine":"opencv-espcn-x2-restore-v1"'
printf '%s' "$preflight" | grep -q "\"model_fingerprint\":\"$model_sha256\""
printf '%s' "$preflight" | grep -q '"supported_target_short_sides":\[720\]'

sha256sum "$archive" "$release/dist/ai-enhancement-worker-server.js" "$runtime/adapter/light_ai_video.py" "$runtime/models/ESPCN_x2.pb" >"$runtime/STAGING-SHA256SUMS.txt"
printf 'staging=ready release=%s runtime=%s\n' "$release" "$runtime"
