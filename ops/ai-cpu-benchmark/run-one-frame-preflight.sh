#!/usr/bin/env bash
set -Eeuo pipefail
readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly input_video="$lab/outputs/realesr-general-x4v3-10s-20261112T235031Z-11361/01-original-degraded-360p-10s.mp4"
readonly work="$lab/work/one-frame-preflight-4threads-tile0"
[[ $(id -un) == azmigrantat-video && -f "$input_video" && ! -e "$work" ]]
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
for key in azmigrantat:video:enhancement azmigrantat:video:enhancement:processing azmigrantat:video:enhancement:ai azmigrantat:video:enhancement:ai:processing; do [[ $(redis-cli --raw LLEN "$key") == 0 ]]; done
mkdir "$work" "$work/in" "$work/out"
trap 'find -P "$work/in" -type f -delete' EXIT TERM INT
ffmpeg -hide_banner -loglevel error -nostdin -ss 5 -i "$input_video" -frames:v 1 -y "$work/in/00000001.png"
export PYTHONPATH=/usr/local/libexec/azmigrantat-ai-benchmark/compat AZMIGRANTAT_TORCH_THREADS=4 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 OPENBLAS_NUM_THREADS=4 NUMEXPR_NUM_THREADS=4
/usr/bin/time -f 'elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -o "$work/METRICS.txt" \
  "$lab/runtime/venv/bin/python" /usr/local/libexec/azmigrantat-ai-benchmark/compat/inference_realesrgan.py \
  -n realesr-general-x4v3 --model_path "$lab/models/realesr-general-x4v3.pth" -dn 0.5 \
  -i "$work/in" -o "$work/out" --outscale 2 --tile 0 --tile_pad 10 --pre_pad 0 --suffix ai --ext png \
  >"$work/INFERENCE.log" 2>&1
cat "$work/METRICS.txt"
