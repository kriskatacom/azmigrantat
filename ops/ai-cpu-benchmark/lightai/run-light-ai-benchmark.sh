#!/usr/bin/env bash
set -Eeuo pipefail

readonly lab=/srv/azmigrantat-video/ai-cpu-lab-20261113
readonly light="$lab/lightai"
readonly adapter=/usr/local/libexec/azmigrantat-ai-benchmark/light_ai_video.py
readonly base="$lab/outputs/realesr-general-x4v3-10s-20261112T235031Z-11361"
readonly source="$base/01-original-degraded-360p-10s.mp4"
readonly run="$light/results/$(date -u +%Y%m%dT%H%M%SZ)-$$"
readonly parent_pid=$$

[[ $(id -un) == azmigrantat-video ]]
[[ -x "$light/venv/bin/python" && -f "$adapter" && -f "$source" ]]
[[ ! -e "$run" ]]
mkdir -m 0750 "$run"
exec 9>"$light/.benchmark.lock"
flock -n 9

for unit in azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service; do
  systemctl is-active --quiet "$unit"
done
[[ $(systemctl is-active azmigrantat-video-ai-enhancement-worker.service 2>/dev/null || true) == inactive ]]
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3100/health >"$run/HEALTH-BEFORE.json"
[[ -z $(pgrep -x ffmpeg || true) ]]

readonly cgroup_path="/sys/fs/cgroup$(awk -F: '$1 == "0" { print $3 }' /proc/self/cgroup)"
[[ -d "$cgroup_path" ]]
read -r cpu_quota cpu_period <"$cgroup_path/cpu.max"
[[ $cpu_quota == 200000 && $cpu_period == 100000 ]]
[[ $(cat "$cgroup_path/memory.max") == 10737418240 ]]
[[ $(cat "$cgroup_path/memory.swap.max") == 0 ]]
[[ $(cat "$cgroup_path/pids.max") == 96 ]]
{
  printf 'cgroup=%s\n' "$cgroup_path"
  printf 'cpu.max=%s %s\n' "$cpu_quota" "$cpu_period"
  printf 'memory.high=%s\n' "$(cat "$cgroup_path/memory.high")"
  printf 'memory.max=%s\n' "$(cat "$cgroup_path/memory.max")"
  printf 'memory.swap.max=%s\n' "$(cat "$cgroup_path/memory.swap.max")"
  printf 'pids.max=%s\n' "$(cat "$cgroup_path/pids.max")"
} >"$run/CGROUP.txt"

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
queue_empty

guard() {
  while sleep 1; do
    queue_empty || { printf 'queue activity detected\n' >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    local ffmpeg_pid ffmpeg_cgroup
    while read -r ffmpeg_pid; do
      [[ -z $ffmpeg_pid ]] && continue
      ffmpeg_cgroup="/sys/fs/cgroup$(awk -F: '$1 == "0" { print $3 }' "/proc/$ffmpeg_pid/cgroup" 2>/dev/null || true)"
      [[ $ffmpeg_cgroup == "$cgroup_path" ]] || { printf 'unrelated ffmpeg detected: %s\n' "$ffmpeg_pid" >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    done < <(pgrep -x ffmpeg || true)
    for unit in azmigrantat-video.service azmigrantat-video-worker.service azmigrantat-video-enhancement-worker.service; do
      systemctl is-active --quiet "$unit" || { printf 'service failure: %s\n' "$unit" >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    done
    curl --fail --silent --max-time 3 http://127.0.0.1:3100/health >/dev/null || { printf 'health probe failed\n' >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
    [[ $(df --output=avail -B1 "$light" | tail -n1) -gt 107374182400 ]] || { printf 'disk reserve failed\n' >"$run/GUARD-FAILURE.txt"; kill -TERM "$parent_pid"; return; }
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
guard &
guard_pid=$!

cp -a "$source" "$run/01-original-degraded-360p-10s.mp4"
cp -a "$base/02-standard-ffmpeg-720p-10s.mp4" "$run/02-standard-ffmpeg-720p-10s.mp4"

benchmark() {
  local name=$1 algorithm=$2 profile=$3 model=$4 model_sha output
  output="$run/${name}.mp4"
  model_sha=$(sha256sum "$model" | awk '{print $1}')
  /usr/bin/time -f 'wall_seconds=%e\nmax_rss_kb=%M\nuser_seconds=%U\nsystem_seconds=%S\npercent_cpu=%P' \
    -o "$run/${name}-METRICS.txt" \
    timeout --signal=TERM --kill-after=5s 300s \
    "$light/venv/bin/python" "$adapter" --protocol-version 1 \
      --model "$model" --expected-model-sha256 "$model_sha" --algorithm "$algorithm" --profile "$profile" \
      --input "$source" --output "$output" --target-short-side 720 --deadline-seconds 285 \
      --max-workspace-bytes 8589934592 --natural-detail --preserve-audio --preserve-timestamps \
      >"$run/${name}-PROGRESS.log" 2>"$run/${name}-STDERR.log"
  ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,avg_frame_rate,nb_frames \
    -show_entries format=duration,size -of json "$output" >"$run/${name}-FFPROBE.json"
}

benchmark 03-fsrcnn-plain-720p fsrcnn plain "$light/models/FSRCNN_x2.pb"
benchmark 04-espcn-plain-720p espcn plain "$light/models/ESPCN_x2.pb"
benchmark 05-fsrcnn-restore-720p fsrcnn restore "$light/models/FSRCNN_x2.pb"
benchmark 06-espcn-restore-720p espcn restore "$light/models/ESPCN_x2.pb"

curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3100/health >"$run/HEALTH-AFTER.json"
cp -a "$light/PREPARATION-MANIFEST.txt" "$light/PROVENANCE-SHA256SUMS.txt" "$run/"
sha256sum "$run"/*.mp4 "$run"/*.json "$run"/*.txt "$run"/*.log >"$run/SHA256SUMS.txt"
{
  printf 'run=%s\nsource=%s\n' "$run" "$source"
  printf 'source_sha256=%s\n' "$(sha256sum "$source" | awk '{print $1}')"
  printf 'adapter_sha256=%s\n' "$(sha256sum "$adapter" | awk '{print $1}')"
  printf 'kernel=%s\n' "$(uname -sr)"
  printf 'cpu=%s\n' "$(lscpu | awk -F: '/Model name/ {gsub(/^[[:space:]]+/, "", $2); print $2; exit}')"
} >"$run/RUN-MANIFEST.txt"
printf '%s\n' "$run" >"$light/LATEST-BENCHMARK.txt.tmp"
mv "$light/LATEST-BENCHMARK.txt.tmp" "$light/LATEST-BENCHMARK.txt"
printf '%s\n' "$run"
