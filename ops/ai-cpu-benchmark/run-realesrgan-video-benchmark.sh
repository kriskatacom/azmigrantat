#!/usr/bin/env bash
set -Eeuo pipefail
readonly lab_root=/srv/azmigrantat-video/ai-cpu-lab-20261113 model="${1:?model is required}" duration=10 source_start=00:01:34
readonly run_id="${model}-10s-$(date -u +%Y%m%dT%H%M%SZ)-$$"
readonly run_root="$lab_root/work/$run_id" output_root="$lab_root/outputs/$run_id"
readonly python="$lab_root/runtime/venv/bin/python" repo="$lab_root/runtime/Real-ESRGAN" source="$lab_root/source/tears_of_steel_720p.mov"
readonly compat_root=/usr/local/libexec/azmigrantat-ai-benchmark/compat
monitor_pid=''
cgroup_root=''
verify_cgroup() { local relative quota period high max swap; relative=$(awk -F: '$1 == "0" {print $3}' /proc/self/cgroup); cgroup_root="/sys/fs/cgroup$relative"; [[ "$relative" == */azmigrantat-ai-benchmark-*.service && "$relative" != */azmigrantat-ai-benchmark-prepare.service && -d "$cgroup_root" ]]; read -r quota period < "$cgroup_root/cpu.max"; high=$(cat "$cgroup_root/memory.high"); max=$(cat "$cgroup_root/memory.max"); swap=$(cat "$cgroup_root/memory.swap.max"); [[ "$quota" == 200000 && "$period" == 100000 && "$high" == 8589934592 && "$max" == 10737418240 && "$swap" == 1073741824 ]]; }
queue_depth() { local key total=0 value; for key in azmigrantat:video:enhancement azmigrantat:video:enhancement:processing azmigrantat:video:enhancement:ai azmigrantat:video:enhancement:ai:processing; do value=$(redis-cli --raw LLEN "$key"); [[ "$value" =~ ^[0-9]+$ ]]; total=$((total + value)); done; printf '%s\n' "$total"; }
production_ok() { local unit; for unit in azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service redis-server.service nginx.service; do systemctl is-active --quiet "$unit" || return 1; done; [[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]] && [[ $(queue_depth) == 0 ]] && curl --fail --silent --max-time 3 http://127.0.0.1:3100/health | grep -q '"success":true'; }
cleanup_frames() { if [[ -n "$monitor_pid" ]]; then kill "$monitor_pid" 2>/dev/null || true; wait "$monitor_pid" 2>/dev/null || true; fi; for directory in "$run_root/input_frames" "$run_root/ai_frames"; do if [[ -d "$directory" && ! -L "$directory" && "$(realpath "$directory")" == "$directory" ]]; then find -P "$directory" -xdev -type f -delete; fi; done; }
on_signal() { exit 143; }; trap on_signal TERM INT; trap cleanup_frames EXIT
verify_cgroup; [[ "$model" == realesr-general-x4v3 || "$model" == RealESRGAN_x2plus ]]; [[ $(id -un) == azmigrantat-video && -f "$lab_root/PREPARATION-COMPLETE" ]]
for path in "$lab_root" "$lab_root/work" "$lab_root/outputs"; do [[ -d "$path" && ! -L "$path" && "$(realpath "$path")" == "$path" && $(stat -c %U "$path") == azmigrantat-video ]]; done
[[ -x "$python" && -f "$source" && -d "$repo/.git" ]]; [[ $(git -C "$repo" remote get-url origin) == https://github.com/xinntao/Real-ESRGAN.git ]]; [[ $(git -C "$repo" rev-parse HEAD) == fa4c8a03ae3dbc9ea6ed471a6ab5da94ac15c2ea ]]; [[ -z $(git -C "$repo" status --porcelain --untracked-files=all) ]]
cmp -s "$compat_root/inference_realesrgan.py" "$repo/inference_realesrgan.py"
(cd "$lab_root" && sha256sum -c MODEL-AND-SOURCE-SHA256SUMS.txt)
exec 9>"$lab_root/benchmark.lock"; flock -n 9 || exit 75; production_ok
available_kib=$(df -Pk "$lab_root" | awk 'NR==2 {print $4}'); (( available_kib >= 105906176 ))
mkdir "$run_root" "$output_root"; mkdir "$run_root/input_frames" "$run_root/ai_frames"
(
  while sleep 1; do
    if ! production_ok; then printf 'production_guard=abort at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$output_root/PRODUCTION-GUARD.log"; kill -TERM "$PPID"; exit 1; fi
    available=$(df -Pk "$lab_root" | awk 'NR==2 {print $4}'); if (( available < 104857600 )); then printf 'disk_guard=abort available_kib=%s\n' "$available" >> "$output_root/PRODUCTION-GUARD.log"; kill -TERM "$PPID"; exit 1; fi
  done
) & monitor_pid=$!
exec 19>"$output_root/EXECUTED-COMMANDS.log"; export BASH_XTRACEFD=19; PS4='+${EPOCHREALTIME} '; set -x
readonly reference="$output_root/00-lossless-reference-10s.mkv" original="$output_root/01-original-degraded-360p-10s.mp4" standard="$output_root/02-standard-ffmpeg-720p-10s.mp4" ai="$output_root/03-ai-${model}-720p-10s.mp4" metrics="$output_root/METRICS.txt"
common=(-hide_banner -loglevel error -nostdin -y)
/usr/bin/time -f 'reference elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -a -o "$metrics" ffmpeg "${common[@]}" -ss "$source_start" -i "$source" -t 10 -map 0:v:0 -map '0:a:0?' -c:v ffv1 -level 3 -c:a flac "$reference"
/usr/bin/time -f 'degrade elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -a -o "$metrics" ffmpeg "${common[@]}" -i "$reference" -vf 'scale=640:360:flags=bicubic,noise=alls=10:allf=t+u' -c:v libx264 -preset medium -crf 34 -maxrate 450k -bufsize 900k -pix_fmt yuv420p -r 24 -c:a aac -b:a 96k -movflags +faststart "$original"
/usr/bin/time -f 'standard elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -a -o "$metrics" ffmpeg "${common[@]}" -i "$original" -map 0:v:0 -map '0:a:0?' -vf "scale='if(gte(iw,ih),-2,720)':'if(gte(iw,ih),720,-2)':flags=lanczos,hqdn3d=1.0:1.0:3.0:3.0,unsharp=5:5:0.35:3:3:0.15" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -threads 6 -c:a aac -b:a 128k -movflags +faststart "$standard"
ai_started=$(date +%s%3N); ffmpeg "${common[@]}" -i "$original" -vsync 0 "$run_root/input_frames/%08d.png"
readonly expected_frames=$(find "$run_root/input_frames" -maxdepth 1 -type f -name '*.png' | wc -l); [[ "$expected_frames" == 240 ]]
export PYTHONPATH="$compat_root" OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 NUMEXPR_NUM_THREADS=2
model_path="$lab_root/models/${model}.pth"
inference_args=(-n "$model" --model_path "$model_path" -i "$run_root/input_frames" -o "$run_root/ai_frames" --outscale 2 --tile 128 --tile_pad 10 --pre_pad 0 --suffix ai --ext png)
if [[ "$model" == realesr-general-x4v3 ]]; then inference_args+=(-dn 0.5); fi
/usr/bin/time -f 'ai_inference elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -a -o "$metrics" "$python" "$compat_root/inference_realesrgan.py" "${inference_args[@]}"
readonly actual_frames=$(find "$run_root/ai_frames" -maxdepth 1 -type f -name '*_ai.png' | wc -l); [[ "$actual_frames" == 240 ]]
/usr/bin/time -f 'ai_encode elapsed_s=%e maxrss_kb=%M user_s=%U system_s=%S' -a -o "$metrics" ffmpeg "${common[@]}" -framerate 24 -i "$run_root/ai_frames/%08d_ai.png" -i "$original" -map 0:v:0 -map '1:a:0?' -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -threads 6 -c:a aac -b:a 128k -shortest -movflags +faststart "$ai"
ai_ended=$(date +%s%3N); printf 'ai_pipeline elapsed_s=%s\n' "$(awk -v ms="$((ai_ended-ai_started))" 'BEGIN {printf "%.3f", ms/1000}')" >> "$metrics"
for file in "$original" "$standard" "$ai"; do ffprobe -v error -show_entries format=duration,size:stream=index,codec_type,codec_name,width,height,avg_frame_rate -of json "$file" | jq -c . >> "$output_root/FFPROBE.jsonl"; done
for file in "$standard" "$ai"; do [[ $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of csv=p=0 "$file") == h264,1280,720 ]]; [[ $(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nk=1:nw=1 "$file") == aac ]]; done
for file in "$original" "$standard" "$ai"; do duration_value=$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$file"); awk -v d="$duration_value" 'BEGIN {exit !(d >= 9.9 && d <= 10.1)}'; done
set +x
{
  printf 'run_id=%s\nmodel=%s\nduration_s=10\nsource_start=%s\ninput_frames=240\n' "$run_id" "$model" "$source_start"
  printf 'cpu_quota=200%%\nmemory_high=8G\nmemory_max=10G\nmemory_swap_max=1G\nthread_cap=2\ntile=128\ntile_pad=10\noutscale=2\n'
  printf 'kernel=%s\nffmpeg=%s\ncpu=%s\n' "$(uname -r)" "$(ffmpeg -version | head -1)" "$(lscpu | awk -F: '/Model name/ {gsub(/^[[:space:]]+/, "", $2); print $2; exit}')"; cat "$metrics"
  printf 'cgroup_cpu_max=%s\ncgroup_memory_high=%s\ncgroup_memory_max=%s\ncgroup_memory_swap_max=%s\ncgroup_memory_peak=%s\n' "$(cat "$cgroup_root/cpu.max")" "$(cat "$cgroup_root/memory.high")" "$(cat "$cgroup_root/memory.max")" "$(cat "$cgroup_root/memory.swap.max")" "$(cat "$cgroup_root/memory.peak")"
  sed 's/^/cgroup_cpu_stat_/' "$cgroup_root/cpu.stat"
  sed 's/^/cgroup_io_stat_/' "$cgroup_root/io.stat"
} > "$output_root/RUN-MANIFEST.txt"
cp "$lab_root/PREPARATION-MANIFEST.txt" "$lab_root/MODEL-AND-SOURCE-SHA256SUMS.txt" "$output_root/"; cp /usr/local/libexec/azmigrantat-ai-benchmark/run-realesrgan-video-benchmark.sh "$compat_root/sitecustomize.py" "$compat_root/inference_realesrgan.py" "$output_root/"
sha256sum "$reference" "$original" "$standard" "$ai" "$output_root/"*.txt "$output_root/EXECUTED-COMMANDS.log" "$output_root/FFPROBE.jsonl" "$output_root/run-realesrgan-video-benchmark.sh" "$output_root/sitecustomize.py" "$output_root/inference_realesrgan.py" > "$output_root/SHA256SUMS"
printf 'benchmark_complete=%s\n' "$output_root"
