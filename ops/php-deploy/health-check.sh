#!/usr/bin/env bash
set -Eeuo pipefail

base_url=''; expected_status='200';
while (($#)); do
  case "$1" in
    --base-url) base_url=${2:?}; shift 2 ;;
    --expected-status) expected_status=${2:?}; shift 2 ;;
    *) echo "Usage: $0 --base-url URL [--expected-status CODE]" >&2; exit 2 ;;
  esac
done
[[ -n "$base_url" ]] || { echo "base URL is required" >&2; exit 2; }
for path in /users/login /api/videos; do
  status=$(curl --fail-with-body --silent --show-error --location --max-time 15 -o /dev/null -w '%{http_code}' "$base_url$path")
  [[ "$status" == "$expected_status" ]] || { echo "$path returned $status" >&2; exit 1; }
done
echo "Health checks passed for $base_url"
