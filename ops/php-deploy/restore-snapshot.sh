#!/usr/bin/env bash
set -Eeuo pipefail

usage() { echo "Usage: $0 --snapshot FILE --sha256 HASH --target PATH [--allow-production]" >&2; exit 2; }
snapshot=''; expected_sha=''; target=''; allow_production=0
while (($#)); do
  case "$1" in
    --snapshot) snapshot=${2:?}; shift 2 ;;
    --sha256) expected_sha=${2:?}; shift 2 ;;
    --target) target=${2:?}; shift 2 ;;
    --allow-production) allow_production=1; shift ;;
    *) usage ;;
  esac
done
[[ -f "$snapshot" && -n "$expected_sha" && -n "$target" ]] || usage
[[ "$expected_sha" =~ ^[0-9a-fA-F]{64}$ ]] || { echo "Invalid SHA-256" >&2; exit 1; }
if [[ "$target" == "/home/azmigran/users.azmigrantat.com" || "$target" == /home/azmigran/users.azmigrantat.com/* ]]; then
  [[ "$allow_production" == 1 && "${ALLOW_PRODUCTION_DEPLOYMENT:-}" == 1 ]] || { echo "Production restore requires explicit approval" >&2; exit 1; }
  echo "Fixed-root production restore is disabled in this helper." >&2
  echo "Use a reviewed restore that preserves maintenance until post-restore verification completes." >&2
  exit 1
fi
actual_sha=$(sha256sum "$snapshot" | awk '{print $1}')
[[ "${actual_sha,,}" == "${expected_sha,,}" ]] || { echo "Snapshot checksum mismatch" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync is required for controlled restore" >&2; exit 1; }

parent=$(dirname "$target")
mkdir -p "$parent"
stage="$parent/.restore-stage.$$"
mkdir "$stage"
cleanup() { rm -rf "$stage"; }
trap cleanup EXIT
tar -xf "$snapshot" -C "$stage" --no-same-owner --exclude='./.env' --exclude='.env'

# Secrets and persistent data are never overwritten by this restore helper.
rm -f "$stage/.env"
rsync -a --delete \
  --exclude='.env' \
  --exclude='app/storage/' \
  --exclude='public/uploads/' \
  --exclude='public/images/' \
  --exclude='json/' \
  --exclude='backups/' \
  "$stage/" "$target/"
echo "Restored application tree to $target (persistent data and .env preserved)"
