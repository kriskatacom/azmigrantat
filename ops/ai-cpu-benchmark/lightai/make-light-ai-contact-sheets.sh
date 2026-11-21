#!/usr/bin/env bash
set -Eeuo pipefail

readonly run=$(cat /srv/azmigrantat-video/ai-cpu-lab-20261113/lightai/LATEST-BENCHMARK.txt)
readonly x4=/srv/azmigrantat-video/ai-cpu-lab-20261113/outputs/openvino-realesr-general-x4v3-dn050-10s-20261113T000719Z/03-ai-openvino-720p-10s.mp4

ffmpeg -hide_banner -loglevel error -y \
  -ss 5 -i "$run/02-standard-ffmpeg-720p-10s.mp4" \
  -ss 5 -i "$run/03-fsrcnn-plain-720p.mp4" \
  -ss 5 -i "$run/05-fsrcnn-restore-720p.mp4" \
  -ss 5 -i "$x4" \
  -filter_complex \
  "[0:v]crop=640:360:320:180,drawtext=text=STANDARD:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[a];\
[1:v]crop=640:360:320:180,drawtext=text=FSRCNN:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[b];\
[2:v]crop=640:360:320:180,drawtext=text=FSRCNN_RESTORE:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[c];\
[3:v]crop=640:360:320:180,drawtext=text=X4V3:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[d];\
[a][b][c][d]xstack=inputs=4:layout=0_0|640_0|0_360|640_360" \
  -frames:v 1 "$run/07-detail-crop-5s.jpg"

printf '%s\n' "$run/07-detail-crop-5s.jpg"

ffmpeg -hide_banner -loglevel error -y \
  -ss 5 -i "$run/02-standard-ffmpeg-720p-10s.mp4" \
  -ss 5 -i "$run/04-espcn-plain-720p.mp4" \
  -ss 5 -i "$run/06-espcn-restore-720p.mp4" \
  -ss 5 -i "$x4" \
  -filter_complex \
  "[0:v]crop=640:360:320:180,drawtext=text=STANDARD:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[a];\
[1:v]crop=640:360:320:180,drawtext=text=ESPCN:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[b];\
[2:v]crop=640:360:320:180,drawtext=text=ESPCN_RESTORE:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[c];\
[3:v]crop=640:360:320:180,drawtext=text=X4V3:x=12:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65[d];\
[a][b][c][d]xstack=inputs=4:layout=0_0|640_0|0_360|640_360" \
  -frames:v 1 "$run/08-espcn-detail-crop-5s.jpg"

printf '%s\n' "$run/08-espcn-detail-crop-5s.jpg"
