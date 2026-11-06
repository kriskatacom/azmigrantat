#!/usr/bin/env bash
set -Eeuo pipefail

usage() { echo "Usage: $0 --base-snapshot FILE --base-sha256 HASH --module-archive FILE --output FILE" >&2; exit 2; }
base=''; base_sha=''; module=''; output=''
while (($#)); do
  case "$1" in
    --base-snapshot) base=${2:?}; shift 2 ;;
    --base-sha256) base_sha=${2:?}; shift 2 ;;
    --module-archive) module=${2:?}; shift 2 ;;
    --output) output=${2:?}; shift 2 ;;
    *) usage ;;
  esac
done
[[ -f "$base" && -f "$module" && -n "$output" ]] || usage
[[ "$base_sha" =~ ^[0-9a-fA-F]{64}$ ]] || { echo "Invalid base SHA-256" >&2; exit 1; }
[[ "$(sha256sum "$base" | awk '{print $1}')" == "${base_sha,,}" ]] || { echo "Base snapshot checksum mismatch" >&2; exit 1; }

work=$(mktemp -d)
cleanup() { rm -rf "$work"; }
trap cleanup EXIT
tar -xf "$base" -C "$work"
tar -xzf "$module" -C "$work"
[[ -d "$work/auth" ]] || { echo "Module archive has no auth payload" >&2; exit 1; }
if command -v rsync >/dev/null; then
  rsync -a "$work/auth/" "$work/"
else
  cp -a "$work/auth/." "$work/"
fi
rm -rf "$work/auth" "$work/.env"
find "$work" -type d \( -path '*/app/storage' -o -path '*/public/uploads' -o -path '*/public/images' -o -path '*/json' -o -path '*/backups' \) -prune -exec rm -rf {} +
mkdir -p "$(dirname "$output")"
tar -czf "$output" -C "$work" .
tar -tzf "$output" >/dev/null
if tar -tzf "$output" | grep -Eq '(^|/)\.env($|/)|(^|/)(storage|uploads|images|json|backups)(/|$)'; then
  echo "Release contains forbidden secret or persistent paths" >&2
  exit 1
fi
sha256sum "$output"
