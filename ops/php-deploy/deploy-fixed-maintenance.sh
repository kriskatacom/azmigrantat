#!/usr/bin/env bash
set -Eeuo pipefail

usage() { echo "Usage: $0 --archive FILE --sha256 HASH --root PATH --allow-production" >&2; exit 2; }
archive=''; expected=''; root=''; allow=0
while (($#)); do
  case "$1" in
    --archive) archive=${2:?}; shift 2;;
    --sha256) expected=${2:?}; shift 2;;
    --root) root=${2:?}; shift 2;;
    --allow-production) allow=1; shift;;
    *) usage;;
  esac
done
[[ -f "$archive" && -n "$expected" && -n "$root" && "$allow" == 1 ]] || usage
[[ "$root" == "/home/azmigran/users.azmigrantat.com" ]] || { echo "Unexpected production root" >&2; exit 1; }
[[ "${ALLOW_PRODUCTION_DEPLOYMENT:-}" == 1 ]] || { echo "Missing deployment guard" >&2; exit 1; }
echo "This fixed-root rsync deployment is retired: it is non-atomic and uses --delete." >&2
echo "Use the reviewed per-file temp/hash/rename procedure under full application maintenance." >&2
exit 1
[[ "$(sha256sum "$archive" | awk '{print $1}')" == "${expected,,}" ]] || { echo "Archive checksum mismatch" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync required" >&2; exit 1; }
command -v php >/dev/null || { echo "php required" >&2; exit 1; }
tmp="$(mktemp -d "${root%/*}/.release-stage.XXXXXX")"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT
tar -xzf "$archive" -C "$tmp" --no-same-owner
payload="$tmp"
if [[ -d "$tmp/auth" && -f "$tmp/auth/composer.json" ]]; then payload="$tmp/auth"; fi
[[ -f "$payload/composer.json" && -f "$payload/composer.lock" ]] || { echo "Missing composer files" >&2; exit 1; }
php_files="$tmp/.php-files"
find "$payload/app" -path "$payload/app/storage" -prune -o -type f -name '*.php' -print0 > "$php_files"
while IFS= read -r -d '' file; do php -l "$file" >/dev/null; done < "$php_files"
rm -f "$php_files"
composer validate --no-check-publish --working-dir="$payload" >/dev/null
rsync -a --delete \
  --exclude='.env' --exclude='.htaccess' --exclude='.api-maintenance' \
  --exclude='app/storage' --exclude='public/uploads' --exclude='public/images' \
  --exclude='json' --exclude='backups' --exclude='releases' \
  "$payload/" "$root/"
echo "FIXED_ROOT_DEPLOY_OK sha256=$(sha256sum "$archive" | awk '{print $1}')"
