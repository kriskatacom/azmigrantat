#!/usr/bin/env bash
set -Eeuo pipefail

readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly source=/srv/azmigrantat-video/private/originals/130/8d061dd0-dd22-4481-8732-a09e25194e43.mp4
readonly tools=/usr/local/libexec/azmigrantat-ai-benchmark
readonly runtime="$lab/runtime"
readonly run_id="v3-real-clip-3s-$(date -u +%Y%m%dT%H%M%SZ)"
readonly run="$lab/outputs/$run_id"
readonly work="$lab/work/$run_id"
readonly input_frames="$work/input"
readonly x2_frames="$work/x2"
readonly x4_frames="$work/x4"
readonly temporal_frames="$work/temporal"
readonly temporal_x2_frames="$work/temporal-x2"
readonly expected_frames=72
readonly fastdvd_sha=9d9d8413c33e3d9d961d07c530237befa1197610b9d60602ff42fd77975d2a17
readonly parent_pid=$$

[[ $(id -un) == azmigrantat-video ]]
[[ -f $source ]]
[[ $(systemctl is-active azmigrantat-video.service) == active ]]
[[ $(systemctl is-active azmigrantat-video-worker.service) == active ]]
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:processing) == 0 ]]
[[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai) == 0 ]]
[[ $(redis-cli --raw HLEN azmigrantat:video:enhancement:ai:processing:v3) == 0 ]]
mkdir "$run" "$work" "$input_frames"
exec > >(tee -a "$run/EXECUTED-COMMANDS.log") 2>&1

cleanup() {
  local status=$?
  set +e
  [[ -n ${guard_pid:-} ]] && kill "$guard_pid" 2>/dev/null
  wait "${guard_pid:-0}" 2>/dev/null
  find -P "$work" -type f -delete 2>/dev/null
  find -P "$work" -depth -type d -empty -delete 2>/dev/null
  printf '%s\n' "$status" >"$run/EXIT-STATUS.txt"
}
trap cleanup EXIT TERM INT

guard() {
  while sleep 1; do
    systemctl is-active --quiet azmigrantat-video.service || break
    systemctl is-active --quiet azmigrantat-video-worker.service || break
    [[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]] || break
    [[ $(redis-cli --raw LLEN azmigrantat:video) == 0 ]] || break
    [[ $(redis-cli --raw LLEN azmigrantat:video:enhancement) == 0 ]] || break
    [[ $(redis-cli --raw LLEN azmigrantat:video:enhancement:ai) == 0 ]] || break
    [[ $(redis-cli --raw HLEN azmigrantat:video:enhancement:ai:processing:v3) == 0 ]] || break
    [[ $(df --output=avail -B1 "$lab" | tail -n1) -gt 107374182400 ]] || break
    continue
    break
  done
  printf 'production guard requested benchmark stop\n' >"$run/GUARD-FAILURE.txt"
  kill -TERM "$parent_pid"
}
guard & guard_pid=$!

/usr/bin/time -f 'reference_elapsed_s=%e maxrss_kb=%M' -o "$run/REFERENCE-METRICS.txt" \
  ffmpeg -hide_banner -loglevel error -nostdin -ss 2 -t 3 -i "$source" \
  -map 0:v:0 -map '0:a:0?' -vf 'fps=24,scale=1280:720:flags=lanczos,setsar=1' \
  -c:v ffv1 -level 3 -c:a pcm_s16le -shortest "$run/00-reference-720p-3s.mkv"

ffmpeg -hide_banner -loglevel error -nostdin -i "$run/00-reference-720p-3s.mkv" \
  -vf 'scale=640:360:flags=bicubic,noise=alls=3:allf=t+u' -c:v libx264 -preset veryfast -crf 35 \
  -g 48 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "$run/01-original-compressed-360p-3s.mp4"

ffmpeg -hide_banner -loglevel error -nostdin -i "$run/01-original-compressed-360p-3s.mp4" \
  -vf 'hqdn3d=1.2:1.2:3:3,scale=1280:720:flags=lanczos,unsharp=5:5:0.35:3:3:0.15,setsar=1' \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$run/02-standard-ffmpeg-720p-3s.mp4"

ffmpeg -hide_banner -loglevel error -nostdin -i "$run/01-original-compressed-360p-3s.mp4" \
  -map 0:v:0 -fps_mode passthrough -start_number 1 -compression_level 1 "$input_frames/%08d.png"
[[ $(find "$input_frames" -maxdepth 1 -type f -name '*.png' | wc -l) == $expected_frames ]]

encode_frames() {
  local frames=$1 output=$2
  ffmpeg -hide_banner -loglevel error -nostdin -framerate 24 -start_number 1 -i "$frames/%08d.png" \
    -i "$run/01-original-compressed-360p-3s.mp4" -map 0:v:0 -map '1:a:0?' -c:v libx264 -preset veryfast \
    -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart "$output"
}

/usr/bin/time -f 'x2_elapsed_s=%e x2_maxrss_kb=%M x2_user_s=%U x2_system_s=%S' -o "$run/X2-METRICS.txt" \
  "$runtime/venv/bin/python" "$tools/run_openvino_video.py" --input-dir "$input_frames" --output-dir "$x2_frames" \
  --model "$runtime/openvino/RealESRGAN_x2plus-640x360.xml" --metrics "$run/X2-OPENVINO.json" \
  --frame-metrics "$run/X2-FRAMES.csv" --expected-frames "$expected_frames"
encode_frames "$x2_frames" "$run/03-ai-realesrgan-x2-720p-3s.mp4"

/usr/bin/time -f 'x4_elapsed_s=%e x4_maxrss_kb=%M x4_user_s=%U x4_system_s=%S' -o "$run/X4-METRICS.txt" \
  "$runtime/venv/bin/python" "$tools/run_openvino_video.py" --input-dir "$input_frames" --output-dir "$x4_frames" \
  --model "$runtime/openvino/realesr-general-x4v3-dn050-640x360.xml" --metrics "$run/X4-OPENVINO.json" \
  --frame-metrics "$run/X4-FRAMES.csv" --expected-frames "$expected_frames"
encode_frames "$x4_frames" "$run/04-ai-realesrgan-x4-720p-3s.mp4"

/usr/bin/time -f 'temporal_elapsed_s=%e temporal_maxrss_kb=%M temporal_user_s=%U temporal_system_s=%S' -o "$run/TEMPORAL-METRICS.txt" \
  "$runtime/venv/bin/python" "$tools/run_fastdvdnet_clean.py" --repository "$runtime/fastdvdnet" \
  --input-dir "$input_frames" --output-dir "$temporal_frames" --model "$runtime/fastdvdnet/model.pth" \
  --expected-model-sha256 "$fastdvd_sha" --expected-frames "$expected_frames" --noise-sigma 10 \
  --metrics "$run/TEMPORAL-FASTDVDNET.json"

/usr/bin/time -f 'temporal_x2_elapsed_s=%e temporal_x2_maxrss_kb=%M temporal_x2_user_s=%U temporal_x2_system_s=%S' -o "$run/TEMPORAL-X2-METRICS.txt" \
  "$runtime/venv/bin/python" "$tools/run_openvino_video.py" --input-dir "$temporal_frames" --output-dir "$temporal_x2_frames" \
  --model "$runtime/openvino/RealESRGAN_x2plus-640x360.xml" --metrics "$run/TEMPORAL-X2-OPENVINO.json" \
  --frame-metrics "$run/TEMPORAL-X2-FRAMES.csv" --expected-frames "$expected_frames"
encode_frames "$temporal_x2_frames" "$run/05-ai-fastdvdnet-realesrgan-x2-720p-3s.mp4"

for candidate in "$run"/0[2-5]-*.mp4; do
  name=$(basename "$candidate" .mp4)
  ffmpeg -hide_banner -nostdin -i "$candidate" -i "$run/00-reference-720p-3s.mkv" \
    -lavfi '[0:v][1:v]ssim' -f null - 2>"$run/${name}-SSIM.log" || true
  ffmpeg -hide_banner -nostdin -i "$candidate" -i "$run/00-reference-720p-3s.mkv" \
    -lavfi '[0:v][1:v]psnr' -f null - 2>"$run/${name}-PSNR.log" || true
done

: >"$run/FFPROBE.jsonl"
for media in "$run"/0[0-5]-*.mp4 "$run"/00-*.mkv; do
  ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,start_time \
    -show_entries format=filename,duration,size -of json "$media" >>"$run/FFPROBE.jsonl"
done
sha256sum "$run"/0[0-5]-*.mp4 "$run"/00-*.mkv "$runtime/openvino/RealESRGAN_x2plus-640x360."{xml,bin} \
  "$runtime/openvino/realesr-general-x4v3-dn050-640x360."{xml,bin} "$runtime/fastdvdnet/model.pth" >"$run/SHA256SUMS.txt"
{
  printf 'source=%s@2s+3s\n' "$source"
  printf 'common_input=01-original-compressed-360p-3s.mp4\nframes=%s\nfps=24\n' "$expected_frames"
  printf 'cpu_quota=400%%\nmemory_max=8G\nio_weight=1\nnice=19\n'
  printf 'x2=RealESRGAN_x2plus OpenVINO 2024.6\n'
  printf 'x4=realesr-general-x4v3 DNI=0.5 OpenVINO 2024.6\n'
  printf 'temporal=FastDVDnet commit=c8fdf6182a0340e89dd18f5df25b47337cbede6f sigma=10 no-synthetic-noise + RealESRGAN_x2plus\n'
} >"$run/RUN-MANIFEST.txt"
curl -fsS https://video.azmigrantat.com/health >"$run/HEALTH-AFTER.json"
printf '%s\n' "$run"
