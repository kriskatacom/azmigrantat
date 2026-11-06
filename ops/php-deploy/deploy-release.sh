#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "Usage: $0 --archive FILE --sha256 HASH --root PATH --release ID --mode symlink --current-link PATH [--allow-production]" >&2
  exit 2
}

archive=''; expected_sha=''; root=''; release_id=''; mode=''; current_link=''; allow_production=0
while (($#)); do
  case "$1" in
    --archive) archive=${2:?}; shift 2 ;;
    --sha256) expected_sha=${2:?}; shift 2 ;;
    --root) root=${2:?}; shift 2 ;;
    --release) release_id=${2:?}; shift 2 ;;
    --mode) mode=${2:?}; shift 2 ;;
    --current-link) current_link=${2:?}; shift 2 ;;
    --allow-production) allow_production=1; shift ;;
    *) usage ;;
  esac
done

[[ -n "$archive" && -n "$expected_sha" && -n "$root" && -n "$release_id" && -n "$mode" && -n "$current_link" ]] || usage
[[ "$release_id" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Invalid release id" >&2; exit 1; }
[[ "$mode" == symlink ]] || { echo "Only symlink mode is automated; fixed cPanel docroots require maintenance mode." >&2; exit 1; }
[[ -f "$archive" ]] || { echo "Archive not found: $archive" >&2; exit 1; }
[[ "$expected_sha" =~ ^[0-9a-fA-F]{64}$ ]] || { echo "Invalid SHA-256" >&2; exit 1; }

if [[ "$root" == "/home/azmigran/users.azmigrantat.com" || "$root" == /home/azmigran/users.azmigrantat.com/* ]]; then
  [[ "$allow_production" == 1 && "${ALLOW_PRODUCTION_DEPLOYMENT:-}" == 1 ]] || {
    echo "Production deployment requires --allow-production and ALLOW_PRODUCTION_DEPLOYMENT=1" >&2
    exit 1
  }
fi

actual_sha=$(sha256sum "$archive" | awk '{print $1}')
[[ "${actual_sha,,}" == "${expected_sha,,}" ]] || { echo "Archive checksum mismatch" >&2; exit 1; }
[[ -L "$current_link" ]] || { echo "Atomic switch refused: current link is not a symlink: $current_link" >&2; exit 1; }

releases="$root/releases"
release="$releases/$release_id"
[[ ! -e "$release" ]] || { echo "Release already exists: $release" >&2; exit 1; }
mkdir -p "$releases"
tmp="$releases/.${release_id}.tmp.$$"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT
mkdir "$tmp"
tar -xzf "$archive" -C "$tmp" --no-same-owner

payload="$tmp"
[[ -d "$tmp/auth" ]] && payload="$tmp/auth"
[[ -f "$payload/composer.json" && -f "$payload/composer.lock" ]] || { echo "Release is not a complete PHP tree" >&2; exit 1; }
command -v php >/dev/null || { echo "php is required for release validation" >&2; exit 1; }
php_files="$tmp/.php-files"
find "$payload" -path "$payload/vendor" -prune -o -type f -name '*.php' -print0 > "$php_files"
while IFS= read -r -d '' file; do php -l "$file" >/dev/null; done < "$php_files"
rm -f "$php_files"
if command -v composer >/dev/null; then composer validate --no-check-publish --working-dir="$payload" >/dev/null; else echo "composer is required for release validation" >&2; exit 1; fi

mv "$tmp" "$release"
new_link="${current_link}.new.$$"
ln -s "$release" "$new_link"
mv -Tf "$new_link" "$current_link"
trap - EXIT
echo "Activated release $release (sha256=$actual_sha)"
