#!/usr/bin/env bash
set -Eeuo pipefail

usage() { echo "Usage: $0 --current-link PATH --target PATH [--allow-production]" >&2; exit 2; }
current_link=''; target=''; allow_production=0
while (($#)); do
  case "$1" in
    --current-link) current_link=${2:?}; shift 2 ;;
    --target) target=${2:?}; shift 2 ;;
    --allow-production) allow_production=1; shift ;;
    *) usage ;;
  esac
done
[[ -L "$current_link" && -d "$target" ]] || { echo "Rollback target or current symlink is invalid" >&2; exit 1; }
root=$(dirname "$(dirname "$current_link")")
if [[ "$root" == "/home/azmigran/users.azmigrantat.com" || "$root" == /home/azmigran/users.azmigrantat.com/* ]]; then
  [[ "$allow_production" == 1 && "${ALLOW_PRODUCTION_DEPLOYMENT:-}" == 1 ]] || { echo "Production rollback requires explicit approval" >&2; exit 1; }
fi
new_link="${current_link}.rollback.$$"
ln -s "$target" "$new_link"
mv -Tf "$new_link" "$current_link"
echo "Rolled back to $(readlink -f "$current_link")"
