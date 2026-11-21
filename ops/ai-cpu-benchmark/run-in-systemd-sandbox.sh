#!/usr/bin/env bash
set -Eeuo pipefail
readonly mode="${1:?prepare or model is required}" timeout_seconds="${2:?finite timeout is required}" bin_root=/usr/local/libexec/azmigrantat-ai-benchmark
[[ "$timeout_seconds" =~ ^[0-9]+$ ]] && (( timeout_seconds >= 60 && timeout_seconds <= 7200 ))
if [[ "$mode" == prepare ]]; then script="$bin_root/prepare-realesrgan-lab.sh"; unit="azmigrantat-ai-benchmark-prepare-$(date -u +%Y%m%d%H%M%S)"; argument=; else [[ "$mode" == realesr-general-x4v3 || "$mode" == RealESRGAN_x2plus ]]; script="$bin_root/run-realesrgan-video-benchmark.sh"; unit="azmigrantat-ai-benchmark-${mode,,}-$(date -u +%Y%m%d%H%M%S)"; argument="$mode"; fi
[[ -f "$script" && ! -L "$script" && $(stat -c %U:%G:%a "$script") == root:root:755 ]]
set +e
sudo systemd-run --wait --pipe --unit "$unit" --uid azmigrantat-video --gid azmigrantat-video \
  --property=RuntimeMaxSec="${timeout_seconds}s" --property=TimeoutStopSec=15s --property=KillMode=control-group --property=OOMPolicy=stop \
  --property=CPUQuota=200% --property=CPUWeight=5 --property=Nice=15 --property=MemoryHigh=8G --property=MemoryMax=10G --property=MemorySwapMax=1G \
  --property=IOWeight=5 --property=IOSchedulingClass=idle --property=TasksMax=96 --property=NoNewPrivileges=yes --property=PrivateTmp=yes \
  --property=ProtectHome=yes --property=ProtectSystem=strict --property=ReadWritePaths=/srv/azmigrantat-video/ai-cpu-lab-20261113 \
  --property='RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6' "$script" $argument
status=$?; set -e
sudo systemctl show "$unit.service" -p Id -p Result -p ExecMainStatus -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemorySwapMax -p CPUUsageNSec -p MemoryPeak -p MemorySwapPeak -p IOReadBytes -p IOWriteBytes || true
exit "$status"
