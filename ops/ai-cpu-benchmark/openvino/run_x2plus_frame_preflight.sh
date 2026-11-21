#!/usr/bin/env bash
set -Eeuo pipefail

readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly source_video="$lab/outputs/realesr-general-x4v3-10s-20261112T235031Z-11361/01-original-degraded-360p-10s.mp4"
readonly model="$lab/runtime/openvino/RealESRGAN_x2plus-640x360.xml"
readonly work="$lab/work/openvino-x2plus-one-frame-4threads"

[[ $(id -un) == azmigrantat-video ]]
[[ -f "$source_video" && -f "$model" && ! -e "$work" ]]
[[ $(systemctl is-active azmigrantat-video-enhancement-worker.service) == active ]]
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
for key in \
  azmigrantat:video:enhancement \
  azmigrantat:video:enhancement:processing \
  azmigrantat:video:enhancement:ai \
  azmigrantat:video:enhancement:ai:processing; do
  [[ $(redis-cli --raw LLEN "$key") == 0 ]]
done

mkdir "$work"
trap 'rm -f -- "$work/input.png"' EXIT TERM INT
ffmpeg -hide_banner -loglevel error -nostdin -ss 5 -i "$source_video" -frames:v 1 -y "$work/input.png"
/usr/bin/time -f 'elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -o "$work/PROCESS-METRICS.txt" \
  "$lab/runtime/venv/bin/python" /usr/local/libexec/azmigrantat-ai-benchmark/run_openvino_frame.py \
  --input "$work/input.png" --model "$model" --output "$work/output-ai-720p.png" \
  --metrics "$work/OPENVINO-METRICS.json" >"$work/INFERENCE.log" 2>&1
sha256sum "$work/output-ai-720p.png" "$model" "${model%.xml}.bin" >"$work/SHA256SUMS.txt"
cat "$work/PROCESS-METRICS.txt" "$work/OPENVINO-METRICS.json" "$work/SHA256SUMS.txt"
