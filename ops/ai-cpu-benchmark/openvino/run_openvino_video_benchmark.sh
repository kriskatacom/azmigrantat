#!/usr/bin/env bash
set -Eeuo pipefail

readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly base="$lab/outputs/realesr-general-x4v3-10s-20261112T235031Z-11361"
readonly requested_model="${1:-realesr-general-x4v3}"
case "$requested_model" in
  realesr-general-x4v3)
    readonly model="$lab/runtime/openvino/realesr-general-x4v3-dn050-640x360.xml"
    readonly run_prefix=openvino-realesr-general-x4v3-dn050
    readonly manifest_model=realesr-general-x4v3
    readonly manifest_denoise=0.5
    readonly manifest_native_output=2560x1440
    ;;
  RealESRGAN_x2plus)
    readonly model="$lab/runtime/openvino/RealESRGAN_x2plus-640x360.xml"
    readonly run_prefix=openvino-RealESRGAN_x2plus
    readonly manifest_model=RealESRGAN_x2plus
    readonly manifest_denoise=not-applicable
    readonly manifest_native_output=1280x720
    ;;
  *)
    printf 'unsupported model: %s\n' "$requested_model" >&2
    exit 64
    ;;
esac
readonly run_id="$run_prefix-10s-$(date -u +%Y%m%dT%H%M%SZ)"
readonly run="$lab/outputs/$run_id"
readonly input_frames="$lab/work/$run_id-input"
readonly output_frames="$lab/work/$run_id-output"
readonly parent_pid=$$

[[ $(id -un) == azmigrantat-video ]]
[[ -f "$base/00-lossless-reference-10s.mkv" ]]
[[ -f "$base/01-original-degraded-360p-10s.mp4" ]]
[[ -f "$base/02-standard-ffmpeg-720p-10s.mp4" ]]
[[ -f "$model" && -f "${model%.xml}.bin" ]]
[[ ! -e "$run" && ! -e "$input_frames" && ! -e "$output_frames" ]]
[[ $(systemctl is-active azmigrantat-video-enhancement-worker.service) == active ]]
[[ $(systemctl is-active azmigrantat-video.service) == active ]]
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]

readonly cgroup_path="/sys/fs/cgroup$(awk -F: '$1 == "0" { print $3 }' /proc/self/cgroup)"
[[ -d "$cgroup_path" ]]
read -r cpu_quota cpu_period <"$cgroup_path/cpu.max"
[[ $cpu_quota == 400000 && $cpu_period == 100000 ]]
[[ $(cat "$cgroup_path/memory.max") == 8589934592 ]]
[[ $(cat "$cgroup_path/pids.max") == 192 ]]

for key in \
  azmigrantat:video:enhancement \
  azmigrantat:video:enhancement:processing \
  azmigrantat:video:enhancement:ai \
  azmigrantat:video:enhancement:ai:processing; do
  [[ $(redis-cli --raw LLEN "$key") == 0 ]]
done

mkdir "$run" "$input_frames"
exec > >(tee -a "$run/EXECUTED-COMMANDS.log") 2>&1
set -x

cleanup() {
  local status=$?
  set +e
  [[ -n ${guard_pid:-} ]] && kill "$guard_pid" 2>/dev/null
  wait "${guard_pid:-0}" 2>/dev/null
  find -P "$input_frames" "$output_frames" -type f -delete 2>/dev/null
  rmdir "$input_frames" "$output_frames" 2>/dev/null
  printf '%s\n' "$status" >"$run/EXIT-STATUS.txt"
}
trap cleanup EXIT TERM INT

guard() {
  set +x
  while sleep 1; do
    systemctl is-active --quiet azmigrantat-video-enhancement-worker.service || break
    systemctl is-active --quiet azmigrantat-video.service || break
    [[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]] || break
    [[ $(df --output=avail -B1 "$lab" | tail -n1) -gt 107374182400 ]] || break
    local key
    for key in \
      azmigrantat:video:enhancement \
      azmigrantat:video:enhancement:processing \
      azmigrantat:video:enhancement:ai \
      azmigrantat:video:enhancement:ai:processing; do
      [[ $(redis-cli --raw LLEN "$key") == 0 ]] || {
        printf 'queue became non-empty: %s\n' "$key" >"$run/GUARD-FAILURE.txt"
        kill -TERM "$parent_pid"
        return
      }
    done
    continue
    break
  done
  printf 'production service or disk guard failed\n' >"$run/GUARD-FAILURE.txt"
  kill -TERM "$parent_pid"
}
guard &
guard_pid=$!

cp -a "$base/00-lossless-reference-10s.mkv" "$run/"
cp -a "$base/01-original-degraded-360p-10s.mp4" "$run/"
cp -a "$base/02-standard-ffmpeg-720p-10s.mp4" "$run/"

/usr/bin/time -f 'decode_elapsed_s=%e decode_maxrss_kb=%M decode_user_s=%U decode_system_s=%S' \
  -o "$run/DECODE-METRICS.txt" \
  ffmpeg -hide_banner -loglevel error -nostdin \
  -i "$run/01-original-degraded-360p-10s.mp4" -map 0:v:0 -vsync 0 -start_number 1 \
  -compression_level 1 "$input_frames/%08d.png"
[[ $(find "$input_frames" -maxdepth 1 -type f -name '*.png' | wc -l) == 240 ]]

/usr/bin/time -f 'ai_elapsed_s=%e ai_maxrss_kb=%M ai_user_s=%U ai_system_s=%S' \
  -o "$run/AI-PROCESS-METRICS.txt" \
  "$lab/runtime/venv/bin/python" /usr/local/libexec/azmigrantat-ai-benchmark/run_openvino_video.py \
  --input-dir "$input_frames" --output-dir "$output_frames" --model "$model" \
  --metrics "$run/OPENVINO-METRICS.json" --frame-metrics "$run/FRAME-METRICS.csv" \
  --expected-frames 240

/usr/bin/time -f 'encode_elapsed_s=%e encode_maxrss_kb=%M encode_user_s=%U encode_system_s=%S' \
  -o "$run/ENCODE-METRICS.txt" \
  ffmpeg -hide_banner -loglevel error -nostdin -framerate 24 -start_number 1 \
  -i "$output_frames/%08d.png" -i "$run/01-original-degraded-360p-10s.mp4" \
  -map 0:v:0 -map '1:a:0?' -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
  -threads 6 -c:a copy -shortest -movflags +faststart -y "$run/03-ai-openvino-720p-10s.mp4"

ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate \
  -show_entries format=duration,size -of json "$run/03-ai-openvino-720p-10s.mp4" >"$run/AI-FFPROBE.json"
sha256sum "$run"/*.mkv "$run"/*.mp4 "$model" "${model%.xml}.bin" >"$run/SHA256SUMS.txt"
{
  printf 'run_id=%s\n' "$run_id"
  printf 'model=%s\n' "$manifest_model"
  printf 'denoise_strength=%s\n' "$manifest_denoise"
  printf 'runtime=openvino-2024.6.0\n'
  printf 'model_input=640x360\nmodel_native_output=%s\nfinal_output=1280x720\n' "$manifest_native_output"
  printf 'cpu_max=400%%\nmemory_max_bytes=8589934592\npids_max=192\n'
  printf 'source_segment=tears_of_steel_720p.mov@00:01:34+10s\n'
} >"$run/RUN-MANIFEST.txt"
printf '%s\n' "$run" >"$lab/LATEST-OPENVINO-RUN.txt.tmp"
mv "$lab/LATEST-OPENVINO-RUN.txt.tmp" "$lab/LATEST-OPENVINO-RUN.txt"
set +x
cat "$run/AI-PROCESS-METRICS.txt" "$run/OPENVINO-METRICS.json" "$run/ENCODE-METRICS.txt"
