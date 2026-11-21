#!/usr/bin/env bash
set -Eeuo pipefail

readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113/lightai
readonly fsrcnn_commit=6a4812c4ef1c4f5947d79beafa32a05a6eb4a94d
readonly espcn_commit=5c628eca82028161a53e1265cc3a5b571ab8625f
readonly fsrcnn_url="https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/$fsrcnn_commit/models/FSRCNN_x2.pb"
readonly fsrcnn_license_url="https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/$fsrcnn_commit/LICENSE"
readonly espcn_url="https://raw.githubusercontent.com/fannymonori/TF-ESPCN/$espcn_commit/export/ESPCN_x2.pb"
readonly espcn_license_url="https://raw.githubusercontent.com/fannymonori/TF-ESPCN/$espcn_commit/LICENSE"

[[ $(id -un) == azmigrantat-video ]]
umask 027
install -d -m 0750 "$lab" "$lab/models" "$lab/licenses" "$lab/wheels" "$lab/results"

download_atomic() {
  local url=$1 destination=$2 temporary
  temporary="${destination}.part.$$"
  curl --fail --location --proto '=https' --tlsv1.2 --retry 3 --connect-timeout 15 --max-time 120 \
    --output "$temporary" "$url"
  [[ -s "$temporary" ]]
  chmod 0640 "$temporary"
  mv -f "$temporary" "$destination"
}

download_atomic "$fsrcnn_url" "$lab/models/FSRCNN_x2.pb"
download_atomic "$fsrcnn_license_url" "$lab/licenses/FSRCNN-LICENSE"
download_atomic "$espcn_url" "$lab/models/ESPCN_x2.pb"
download_atomic "$espcn_license_url" "$lab/licenses/ESPCN-LICENSE"

rm -rf "$lab/venv.new"
python3 -m venv "$lab/venv.new"
"$lab/venv.new/bin/python" -m pip download --only-binary=:all: --dest "$lab/wheels" \
  numpy==2.1.3 opencv-contrib-python-headless==4.11.0.86
"$lab/venv.new/bin/python" -m pip install --no-index --find-links "$lab/wheels" \
  numpy==2.1.3 opencv-contrib-python-headless==4.11.0.86
rm -rf "$lab/venv.previous"
if [[ -d "$lab/venv" ]]; then mv "$lab/venv" "$lab/venv.previous"; fi
mv "$lab/venv.new" "$lab/venv"

"$lab/venv/bin/python" - <<'PY'
import cv2
assert cv2.__version__ == '4.11.0'
assert hasattr(cv2, 'dnn_superres')
PY

sha256sum "$lab/models/FSRCNN_x2.pb" "$lab/models/ESPCN_x2.pb" \
  "$lab/licenses/FSRCNN-LICENSE" "$lab/licenses/ESPCN-LICENSE" "$lab/wheels"/* \
  >"$lab/PROVENANCE-SHA256SUMS.txt"
{
  printf 'prepared_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'fsrcnn_repository=https://github.com/Saafke/FSRCNN_Tensorflow\n'
  printf 'fsrcnn_commit=%s\nfsrcnn_model_url=%s\nfsrcnn_license=Apache-2.0\n' "$fsrcnn_commit" "$fsrcnn_url"
  printf 'espcn_repository=https://github.com/fannymonori/TF-ESPCN\n'
  printf 'espcn_commit=%s\nespcn_model_url=%s\nespcn_license=Apache-2.0\n' "$espcn_commit" "$espcn_url"
  "$lab/venv/bin/python" --version
  "$lab/venv/bin/python" -m pip freeze --all
} >"$lab/PREPARATION-MANIFEST.txt"
