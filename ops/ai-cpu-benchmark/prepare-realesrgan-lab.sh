#!/usr/bin/env bash
set -Eeuo pipefail
readonly lab_root=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly source_url='https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov'
readonly repo_url='https://github.com/xinntao/Real-ESRGAN.git'
readonly repo_commit='fa4c8a03ae3dbc9ea6ed471a6ab5da94ac15c2ea'
readonly general_url='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth'
readonly x2_url='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth'
readonly x2_sha256='49fafd45f8fd7aa8d31ab2a22d14d91b536c34494a5cfe31eb5d89c2fa266abb'
verify_cgroup() {
  local relative root quota period high max swap
  relative=$(awk -F: '$1 == "0" {print $3}' /proc/self/cgroup); root="/sys/fs/cgroup$relative"
  [[ "$relative" == */azmigrantat-ai-benchmark-prepare-*.service && -d "$root" ]]
  read -r quota period < "$root/cpu.max"; high=$(<"$root/memory.high"); max=$(<"$root/memory.max"); swap=$(<"$root/memory.swap.max")
  [[ "$quota" == 200000 && "$period" == 100000 && "$high" == 8589934592 && "$max" == 10737418240 && "$swap" == 1073741824 ]]
}
verify_cgroup
[[ $(id -un) == azmigrantat-video && -d "$lab_root" && ! -L "$lab_root" && "$(realpath "$lab_root")" == "$lab_root" ]]
[[ ! -e "$lab_root/PREPARATION-COMPLETE" ]]
for command in curl git python3 sha256sum ffmpeg ffprobe; do command -v "$command" >/dev/null; done
available_kib=$(df -Pk "$lab_root" | awk 'NR==2 {print $4}'); (( available_kib >= 105906176 ))
install -d -m 0750 "$lab_root"/{source,models,runtime,outputs,logs,work}
download() { local url=$1 destination=$2 temporary="${2}.part"; [[ ! -L "$(dirname "$destination")" ]]; if [[ -s "$destination" && ! -L "$destination" ]]; then return; fi; [[ ! -e "$destination" ]]; curl --fail --location --retry 3 --limit-rate 25M --output "$temporary" "$url"; test -s "$temporary"; mv "$temporary" "$destination"; }
download "$source_url" "$lab_root/source/tears_of_steel_720p.mov"
download "$general_url" "$lab_root/models/realesr-general-x4v3.pth"
download "$x2_url" "$lab_root/models/RealESRGAN_x2plus.pth"
printf '%s  %s\n' "$x2_sha256" "$lab_root/models/RealESRGAN_x2plus.pth" | sha256sum -c -
if [[ ! -d "$lab_root/runtime/Real-ESRGAN/.git" ]]; then git clone --no-checkout "$repo_url" "$lab_root/runtime/Real-ESRGAN"; git -C "$lab_root/runtime/Real-ESRGAN" checkout --detach "$repo_commit"; fi
[[ $(git -C "$lab_root/runtime/Real-ESRGAN" remote get-url origin) == "$repo_url" ]]
[[ $(git -C "$lab_root/runtime/Real-ESRGAN" rev-parse HEAD) == "$repo_commit" ]]
[[ -z $(git -C "$lab_root/runtime/Real-ESRGAN" status --porcelain --untracked-files=all) ]]
if [[ -d "$lab_root/runtime/venv" && ! -x "$lab_root/runtime/venv/bin/python" ]]; then [[ "$(realpath "$lab_root/runtime/venv")" == "$lab_root/runtime/venv" ]]; find -P "$lab_root/runtime/venv" -depth -delete; fi
python3 -m venv "$lab_root/runtime/venv"; readonly python="$lab_root/runtime/venv/bin/python"
"$python" -m pip install --disable-pip-version-check --upgrade 'pip==24.3.1' 'setuptools==75.6.0' 'wheel==0.45.1'
"$python" -m pip install --disable-pip-version-check --index-url https://download.pytorch.org/whl/cpu 'torch==2.5.1' 'torchvision==0.20.1'
"$python" -m pip install --disable-pip-version-check 'numpy==1.26.4' 'opencv-python-headless==4.10.0.84' 'Pillow==11.0.0' 'tqdm==4.67.1' 'basicsr==1.4.2' 'facexlib==0.3.0' 'gfpgan==1.3.8'
"$python" -m pip install --disable-pip-version-check --no-deps "git+${repo_url}@${repo_commit}"
install -m 0640 "$lab_root/models/realesr-general-x4v3.pth" "$lab_root/runtime/Real-ESRGAN/weights/realesr-general-x4v3.pth"
install -m 0640 "$lab_root/models/RealESRGAN_x2plus.pth" "$lab_root/runtime/Real-ESRGAN/weights/RealESRGAN_x2plus.pth"
cp "$lab_root/runtime/Real-ESRGAN/LICENSE" "$lab_root/models/Real-ESRGAN-BSD-3-Clause-LICENSE.txt"
[[ -z $(git -C "$lab_root/runtime/Real-ESRGAN" status --porcelain --untracked-files=all) ]]
{
  printf 'prepared_at_utc=%s\nsource_url=%s\nsource_license=CC-BY-3.0\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$source_url"
  printf 'repo_url=%s\nrepo_commit=%s\nmodel_license=BSD-3-Clause\n' "$repo_url" "$repo_commit"
  printf 'general_model_url=%s\nx2_model_url=%s\npython=%s\nkernel=%s\n' "$general_url" "$x2_url" "$("$python" --version 2>&1)" "$(uname -r)"
  "$python" -m pip freeze
} > "$lab_root/PREPARATION-MANIFEST.txt"
sha256sum "$lab_root/source/tears_of_steel_720p.mov" "$lab_root/models/"*.pth "$lab_root/models/Real-ESRGAN-BSD-3-Clause-LICENSE.txt" > "$lab_root/MODEL-AND-SOURCE-SHA256SUMS.txt"
chmod -R go-w "$lab_root/source" "$lab_root/models" "$lab_root/runtime"; touch "$lab_root/PREPARATION-COMPLETE"
printf 'lab_prepared=%s\n' "$lab_root"
