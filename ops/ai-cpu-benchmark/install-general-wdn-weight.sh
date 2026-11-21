#!/usr/bin/env bash
set -Eeuo pipefail
readonly lab_root=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly url='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-wdn-x4v3.pth'
readonly destination="$lab_root/models/realesr-general-wdn-x4v3.pth"
relative=$(awk -F: '$1 == "0" {print $3}' /proc/self/cgroup)
[[ "$relative" == */azmigrantat-ai-weight-install-*.service ]]
[[ $(id -un) == azmigrantat-video && -f "$lab_root/PREPARATION-COMPLETE" && ! -e "$destination" ]]
curl --fail --location --retry 3 --limit-rate 25M --output "${destination}.part" "$url"
test -s "${destination}.part"; mv "${destination}.part" "$destination"; chmod 0640 "$destination"
grep -q '^general_wdn_model_url=' "$lab_root/PREPARATION-MANIFEST.txt" || printf 'general_wdn_model_url=%s\n' "$url" >> "$lab_root/PREPARATION-MANIFEST.txt"
sha256sum "$lab_root/source/tears_of_steel_720p.mov" "$lab_root/models/"*.pth "$lab_root/models/Real-ESRGAN-BSD-3-Clause-LICENSE.txt" > "$lab_root/MODEL-AND-SOURCE-SHA256SUMS.txt"
sha256sum "$destination"
