#!/usr/bin/env bash
set -euo pipefail
umask 022

readonly release_id=20261106T155446Z
readonly rollback_root=/home/azmigran/backups/google-play-release-staging/stripe-rollback-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly business_root=/home/azmigran/business.azmigrantat.com

[[ $(id -un) == azmigran ]] || exit 77
[[ -f $auth_root/.api-maintenance && ! -L $auth_root/.api-maintenance ]] || { echo 'maintenance required' >&2; exit 65; }
[[ -d $rollback_root && ! -L $rollback_root ]] || exit 78
(
  cd "$rollback_root"
  sha256sum -c SHA256SUMS >/dev/null
)

restore_file() {
  local source=$1 destination=$2 temporary=$2.rollback-$release_id.tmp
  [[ -f $source && ! -L $source && ! -e $temporary ]] || exit 73
  install -m 0644 "$source" "$temporary"
  chown azmigran:azmigran "$temporary"
  php -l "$temporary" >/dev/null
  [[ $(sha256sum "$source" | awk '{print $1}') == $(sha256sum "$temporary" | awk '{print $1}') ]] || exit 74
  mv "$temporary" "$destination"
}

restore_file "$rollback_root/auth/app/Services/SubscriptionService.php" "$auth_root/app/Services/SubscriptionService.php"
restore_file "$rollback_root/auth/app/Controllers/Api/SubscriptionController.php" "$auth_root/app/Controllers/Api/SubscriptionController.php"
restore_file "$rollback_root/auth/routes/web.php" "$auth_root/routes/web.php"
restore_file "$rollback_root/business/app/Config/constants.php" "$business_root/app/Config/constants.php"
restore_file "$rollback_root/business/routes/core.php" "$business_root/routes/core.php"
restore_file "$rollback_root/business/routes/web.php" "$business_root/routes/web.php"

printf 'rollback=guard-only-code-restored\nadditive_tables=retained\nmaintenance=still-on\n'
