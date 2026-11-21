#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly release_id=20261106T194559Z
readonly rollback_root=/home/azmigran/backups/google-play-release-staging/stripe-30day-rollback-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly business_root=/home/azmigran/business.azmigrantat.com

[[ $(id -un) == azmigran ]] || exit 77
[[ -f $auth_root/.api-maintenance && ! -L $auth_root/.api-maintenance ]] || { echo 'maintenance required' >&2; exit 65; }
[[ -d $rollback_root && ! -L $rollback_root ]] || exit 78
(
  cd "$rollback_root"
  sha256sum -c SHA256SUMS >/dev/null
)

php "$auth_root/vendor/bin/phinx" rollback -c "$auth_root/phinx.php" -e production -t 20261106154500

restore_file() {
  local source=$1 destination=$2 temporary=$2.rollback-$release_id.tmp
  install -d -m 0755 "$(dirname "$destination")"
  install -m 0644 "$source" "$temporary"
  chown azmigran:azmigran "$temporary"
  php -l "$temporary" >/dev/null
  mv "$temporary" "$destination"
}
while IFS= read -r source; do
  [[ -n $source ]] || continue
  relative=${source#auth/}
  if [[ $source == auth/* ]]; then destination=$auth_root/$relative; else relative=${source#business/}; destination=$business_root/$relative; fi
  restore_file "$rollback_root/$source" "$destination"
done < <(cd "$rollback_root" && find auth business -type f | sort)

while IFS= read -r missing; do
  [[ -n $missing ]] || continue
  if [[ $missing == auth/* ]]; then target=$auth_root/${missing#auth/}; else target=$business_root/${missing#business/}; fi
  [[ -f $target && ! -L $target ]] || continue
  rm -- "$target"
done < "$rollback_root/missing.txt"

printf 'rollback=complete\nledger=20261106154500\nmaintenance=on\n'
