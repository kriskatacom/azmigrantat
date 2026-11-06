#!/usr/bin/env bash
set -Eeuo pipefail

root=''; allow_production=0
while (($#)); do
  case "$1" in
    --root) root=${2:?}; shift 2 ;;
    --allow-production) allow_production=1; shift ;;
    *) echo "Usage: $0 --root PATH [--allow-production]" >&2; exit 2 ;;
  esac
done
[[ -n "$root" ]] || { echo "root is required" >&2; exit 2; }
if [[ "$root" == "/home/azmigran/users.azmigrantat.com" || "$root" == /home/azmigran/users.azmigrantat.com/* ]]; then
  [[ "$allow_production" == 1 && "${ALLOW_PRODUCTION_DEPLOYMENT:-}" == 1 ]] || { echo "Production maintenance requires explicit approval" >&2; exit 1; }
fi
grep -q 'BEGIN AZMIGRANTAT_API_MAINTENANCE' "$root/.htaccess" || { echo "Maintenance block is not installed" >&2; exit 1; }
tmp="$root/.api-maintenance.tmp.$$"
printf '%s\n' "enabled_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$tmp"
chmod 640 "$tmp"
mv -f "$tmp" "$root/.api-maintenance"
echo "API maintenance enabled for $root"
