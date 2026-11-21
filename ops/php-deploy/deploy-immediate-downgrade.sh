#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly release_id=20261106T235500Z
readonly release_root=/home/azmigran/backups/google-play-release-staging/immediate-downgrade-release-$release_id
readonly rollback_root=/home/azmigran/backups/google-play-release-staging/immediate-downgrade-rollback-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com

readonly expected_controller=a1d6e5d1e6009782be0fd085fa8a1fd3f647591716f038f9400d7ae6e9ac89bd
readonly expected_stripe_client=3db2ed11d771e9e0e15af8b003aec64b7d3139de8c3de2a928b7a0cc5a91d485
readonly expected_subscription_service=bc237c67322e63d6f9c0e177472be2b862ac41eb9bef9930da4341ae5373e7f4
readonly expected_routes=b8b155a4b6cd14b1b6b4036cf68b43974fbb2e91e99108c146aeba295cacdc12

readonly -a files=(
  app/Controllers/Api/SubscriptionController.php
  app/Models/SubscriptionCancellationRequest.php
  app/Services/StripeSubscriptionClient.php
  app/Services/SubscriptionCancellationService.php
  app/Services/SubscriptionService.php
  database/migrations/20261106231500_create_subscription_cancellation_requests.php
  routes/web.php
)

[[ $(id -un) == azmigran ]] || exit 77
[[ -d $release_root && ! -L $release_root && $(realpath "$release_root") == "$release_root" ]] || exit 78
[[ ! -e $rollback_root && ! -e $auth_root/.api-maintenance ]] || exit 73
grep -qx 'PAYMENTS_ENABLED=false' "$auth_root/.env" || exit 65
grep -qx 'STRIPE_SANDBOX_ENABLED=true' "$auth_root/.env" || exit 65
[[ $(sha256sum "$auth_root/app/Controllers/Api/SubscriptionController.php" | awk '{print $1}') == $expected_controller ]] || exit 74
[[ $(sha256sum "$auth_root/app/Services/StripeSubscriptionClient.php" | awk '{print $1}') == $expected_stripe_client ]] || exit 74
[[ $(sha256sum "$auth_root/app/Services/SubscriptionService.php" | awk '{print $1}') == $expected_subscription_service ]] || exit 74
[[ $(sha256sum "$auth_root/routes/web.php" | awk '{print $1}') == $expected_routes ]] || exit 74
[[ $(php "$auth_root/vendor/bin/phinx" status -c "$auth_root/phinx.php" -e production | awk '$1=="up"{v=$2} END{print v}') == 20261106213000 ]] || exit 65
(
  cd "$release_root"
  sha256sum -c SHA256SUMS >/dev/null
)
for relative in "${files[@]}"; do php -l "$release_root/auth/$relative" >/dev/null; done

install -d -m 0700 "$rollback_root/auth"
: > "$rollback_root/missing.txt"
for relative in "${files[@]}"; do
  source=$auth_root/$relative
  destination=$rollback_root/auth/$relative
  if [[ -e $source ]]; then
    [[ -f $source && ! -L $source ]] || exit 78
    install -d -m 0700 "$(dirname "$destination")"
    cp -p "$source" "$destination"
  else
    printf 'auth/%s\n' "$relative" >> "$rollback_root/missing.txt"
  fi
done
(
  cd "$rollback_root"
  find auth -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  sha256sum missing.txt >> SHA256SUMS
)
chmod 0600 "$rollback_root/SHA256SUMS" "$rollback_root/missing.txt"

touch "$auth_root/.api-maintenance"
chmod 0600 "$auth_root/.api-maintenance"
trap 'status=$?; if [[ $status -ne 0 ]]; then echo "deployment_failed maintenance=on rollback=$rollback_root" >&2; fi' EXIT

activate_file() {
  local source=$1 destination=$2 parent temporary expected actual
  parent=$(dirname "$destination")
  temporary=$destination.downgrade-$release_id.tmp
  [[ -f $source && ! -L $source && ! -e $temporary ]] || exit 73
  install -d -m 0755 "$parent"
  install -m 0644 "$source" "$temporary"
  chown azmigran:azmigran "$temporary"
  php -l "$temporary" >/dev/null
  expected=$(sha256sum "$source" | awk '{print $1}')
  actual=$(sha256sum "$temporary" | awk '{print $1}')
  [[ $actual == "$expected" ]] || exit 74
  mv "$temporary" "$destination"
}

for relative in \
  app/Models/SubscriptionCancellationRequest.php \
  app/Services/StripeSubscriptionClient.php \
  app/Services/SubscriptionCancellationService.php \
  database/migrations/20261106231500_create_subscription_cancellation_requests.php
do
  activate_file "$release_root/auth/$relative" "$auth_root/$relative"
done

php "$auth_root/vendor/bin/phinx" migrate -c "$auth_root/phinx.php" -e production -t 20261106231500

for relative in \
  app/Services/SubscriptionService.php \
  app/Controllers/Api/SubscriptionController.php \
  routes/web.php
do
  activate_file "$release_root/auth/$relative" "$auth_root/$relative"
done

ledger=$(php "$auth_root/vendor/bin/phinx" status -c "$auth_root/phinx.php" -e production | awk '$1=="up"{v=$2} END{print v}')
[[ $ledger == 20261106231500 ]] || exit 65
columns=$(php -r 'require $argv[1]."/vendor/autoload.php"; define("BASE_PATH",$argv[1]); App\Core\App::bootstrap(); echo Illuminate\Database\Capsule\Manager::connection()->getPdo()->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=\"subscription_cancellation_requests\"")->fetchColumn();' "$auth_root")
[[ $columns == 9 ]] || exit 65
grep -q "'/api/mobile/subscription/cancel'" "$auth_root/routes/web.php" || exit 65

rm "$auth_root/.api-maintenance"
trap - EXIT
printf 'release=%s\nledger=%s\ncolumns=%s\nrollback=%s\nmaintenance=off\n' "$release_id" "$ledger" "$columns" "$rollback_root"
