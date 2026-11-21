#!/usr/bin/env bash
set -euo pipefail

bench_dir="$(mktemp -d /tmp/azmigrantat-video-benchmark.XXXXXX)"
trap 'rm -rf "$bench_dir"' EXIT

input="$bench_dir/input-480p.mp4"
ffmpeg -hide_banner -loglevel error \
  -f lavfi -i 'testsrc2=size=854x480:rate=30,noise=alls=8:allf=t' \
  -f lavfi -i 'sine=frequency=440:sample_rate=48000' \
  -t 30 -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -threads 6 -c:a aac -b:a 128k -movflags +faststart -y "$input"

printf 'source=synthetic_854x480 duration=30 fps=30 codec=h264 audio=aac threads=6\n'

for target in 720 1080; do
  for run in 1 2; do
    output="$bench_dir/out-${target}-${run}.mp4"
    metrics="$bench_dir/time-${target}-${run}.txt"
    filter="scale='if(gte(iw,ih),-2,${target})':'if(gte(iw,ih),${target},-2)':flags=lanczos,hqdn3d=1.0:1.0:3.0:3.0,unsharp=5:5:0.35:3:3:0.15"

    /usr/bin/time -f 'elapsed=%e maxrss_kb=%M user=%U system=%S' -o "$metrics" \
      nice -n 10 ionice -c2 -n7 \
      ffmpeg -hide_banner -loglevel error -nostdin -i "$input" \
      -map 0:v:0 -map '0:a:0?' -vf "$filter" \
      -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -threads 6 \
      -c:a aac -b:a 128k -movflags +faststart -y "$output"

    elapsed="$(awk -F'[ =]' '{for(i=1;i<=NF;i++) if($i=="elapsed") print $(i+1)}' "$metrics")"
    fps="$(awk -v elapsed="$elapsed" 'BEGIN { printf "%.2f", 900 / elapsed }')"
    speed="$(awk -v elapsed="$elapsed" 'BEGIN { printf "%.3f", 30 / elapsed }')"
    bytes="$(stat -c %s "$output")"
    printf 'target=%s run=%s elapsed_s=%s processed_fps=%s realtime_x=%s output_bytes=%s ' \
      "$target" "$run" "$elapsed" "$fps" "$speed" "$bytes"
    awk '{for(i=2;i<=NF;i++) printf "%s%s", $i, (i==NF?ORS:OFS)}' "$metrics"
  done
done
