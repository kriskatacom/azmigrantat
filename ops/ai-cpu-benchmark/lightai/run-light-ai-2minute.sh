#!/usr/bin/env bash
set -Eeuo pipefail

readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly light="$lab/lightai"
readonly source="$lab/source/tears_of_steel_720p.mov"
readonly adapter=/usr/local/libexec/azmigrantat-ai-benchmark/light_ai_video.py
readonly run="$light/results/2minute-$(date -u +%Y%m%dT%H%M%SZ)-$$"
readonly original="$run/01-original-degraded-360p-120s.mp4"
readonly standard="$run/02-standard-ffmpeg-720p-120s.mp4"
readonly ai="$run/03-ai-espcn-restore-720p-120s.mp4"
readonly parent_pid=$$

[[ $(id -un) == azmigrantat-video && -f "$source" && -f "$adapter" ]]
mkdir -m 0750 "$run"
exec 9>"$light/.benchmark.lock"
flock -n 9

readonly cgroup_path="/sys/fs/cgroup$(awk -F: '$1 == "0" { print $3 }' /proc/self/cgroup)"
read -r quota period <"$cgroup_path/cpu.max"
[[ $quota == 200000 && $period == 100000 ]]
[[ $(cat "$cgroup_path/memory.max") == 10737418240 ]]
[[ $(cat "$cgroup_path/memory.swap.max") == 0 ]]
[[ $(cat "$cgroup_path/pids.max") == 96 ]]

queue_empty() {
  local key
  for key in \
    azmigrantat:video:processing azmigrantat:video:processing:processing azmigrantat:video:processing:retry \
    azmigrantat:video:enhancement azmigrantat:video:enhancement:processing azmigrantat:video:enhancement:retry \
    azmigrantat:video:enhancement:ai azmigrantat:video:enhancement:ai:processing azmigrantat:video:enhancement:ai:retry; do
    case "$(redis-cli --raw TYPE "$key")" in
      list) [[ $(redis-cli --raw LLEN "$key") == 0 ]] || return 1 ;;
      zset) [[ $(redis-cli --raw ZCARD "$key") == 0 ]] || return 1 ;;
    esac
  done
}
production_ok() {
  local unit
  for unit in azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service redis-server.service nginx.service; do
    systemctl is-active --quiet "$unit" || return 1
  done
  [[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
  queue_empty
  curl --fail --silent --max-time 3 http://127.0.0.1:3100/health | grep -q '"success":true'
}
production_ok
[[ -z $(pgrep -x ffmpeg || true) ]]

guard() {
  while sleep 1; do
    production_ok || { printf 'production guard failed\n' >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    [[ $(df --output=avail -B1 "$light" | tail -n1) -gt 107374182400 ]] || { printf 'disk reserve failed\n' >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    local pid process_cgroup
    while read -r pid; do
      [[ -z $pid ]] && continue
      process_cgroup="/sys/fs/cgroup$(awk -F: '$1 == "0" { print $3 }' "/proc/$pid/cgroup" 2>/dev/null || true)"
      [[ $process_cgroup == "$cgroup_path" ]] || { printf 'unrelated ffmpeg detected: %s\n' "$pid" >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    done < <(pgrep -x ffmpeg || true)
  done
}
cleanup() {
  local status=$?
  trap - EXIT TERM INT
  if [[ -n ${guard_pid:-} ]]; then kill "$guard_pid" 2>/dev/null || true; wait "$guard_pid" 2>/dev/null || true; fi
  find -P "$run" -maxdepth 1 -type f -name '*.tmp' -delete
  printf '%s\n' "$status" >"$run/EXIT-STATUS.txt"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
guard & guard_pid=$!

/usr/bin/time -f 'degrade_wall_seconds=%e\ndegrade_max_rss_kb=%M' -o "$run/DEGRADE-METRICS.txt" \
  ffmpeg -hide_banner -loglevel error -nostdin -y -ss 00:01:34 -i "$source" -t 120 \
    -map 0:v:0 -map '0:a:0?' -vf 'scale=640:360:flags=bicubic,noise=alls=10:allf=t+u' \
    -c:v libx264 -preset medium -crf 34 -maxrate 450k -bufsize 900k -pix_fmt yuv420p -r 24 \
    -c:a aac -b:a 96k -movflags +faststart "$original"

/usr/bin/time -f 'standard_wall_seconds=%e\nstandard_max_rss_kb=%M' -o "$run/STANDARD-METRICS.txt" \
  ffmpeg -hide_banner -loglevel error -nostdin -y -i "$original" -map 0:v:0 -map '0:a:0?' \
    -vf "scale='if(gte(iw,ih),-2,720)':'if(gte(iw,ih),720,-2)':flags=lanczos,hqdn3d=1.0:1.0:3.0:3.0,unsharp=5:5:0.35:3:3:0.15" \
    -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -threads 2 -c:a aac -b:a 128k -movflags +faststart "$standard"

model_sha=$(sha256sum "$light/models/ESPCN_x2.pb" | awk '{print $1}')
/usr/bin/time -f 'ai_wall_seconds=%e\nai_max_rss_kb=%M\nai_user_seconds=%U\nai_system_seconds=%S\nai_percent_cpu=%P' -o "$run/AI-METRICS.txt" \
  timeout --signal=TERM --kill-after=5s 900s \
  "$light/venv/bin/python" "$adapter" --protocol-version 1 \
    --model "$light/models/ESPCN_x2.pb" --expected-model-sha256 "$model_sha" --algorithm espcn --profile restore \
    --input "$original" --output "$ai" --target-short-side 720 --deadline-seconds 880 \
    --max-workspace-bytes 8589934592 --natural-detail --preserve-audio --preserve-timestamps \
    >"$run/AI-PROGRESS.log" 2>"$run/AI-STDERR.log"

for file in "$original" "$standard" "$ai"; do
  ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,avg_frame_rate,nb_frames,sample_aspect_ratio \
    -show_entries format=duration,size -of json "$file" | jq -c .
done >"$run/FFPROBE.jsonl"
cp -a "$light/PREPARATION-MANIFEST.txt" "$light/PROVENANCE-SHA256SUMS.txt" "$run/"
{
  printf 'source=%s\nsource_start=00:01:34\nduration_seconds=120\n' "$source"
  printf 'cpu.max=%s\nmemory.high=%s\nmemory.max=%s\nmemory.swap.max=%s\npids.max=%s\n' \
    "$(cat "$cgroup_path/cpu.max")" "$(cat "$cgroup_path/memory.high")" "$(cat "$cgroup_path/memory.max")" "$(cat "$cgroup_path/memory.swap.max")" "$(cat "$cgroup_path/pids.max")"
  printf 'adapter_sha256=%s\nmodel_sha256=%s\n' "$(sha256sum "$adapter" | awk '{print $1}')" "$model_sha"
} >"$run/RUN-MANIFEST.txt"
sha256sum "$run"/*.mp4 "$run"/*.jsonl "$run"/*.txt "$run"/*.log >"$run/SHA256SUMS.txt"
printf '%s\n' "$run" >"$light/LATEST-2MINUTE.txt.tmp"
mv "$light/LATEST-2MINUTE.txt.tmp" "$light/LATEST-2MINUTE.txt"
printf '%s\n' "$run"
