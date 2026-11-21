#!/usr/bin/env bash
set -euo pipefail
umask 022

readonly release_id=20261106T155446Z
readonly release_root=/home/azmigran/backups/google-play-release-staging/stripe-release-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly business_root=/home/azmigran/business.azmigrantat.com
readonly backup_root=/home/azmigran/backups/google-play-release/$release_id
readonly rollback_root=/home/azmigran/backups/google-play-release-staging/stripe-rollback-$release_id

[[ $(id -un) == azmigran ]] || exit 77
[[ -f $auth_root/.api-maintenance && ! -L $auth_root/.api-maintenance ]] || { echo 'maintenance required' >&2; exit 65; }
[[ $(cat "$backup_root/STATE") == complete ]] || { echo 'complete backup required' >&2; exit 65; }
[[ -d $release_root && ! -L $release_root && $(realpath "$release_root") == "$release_root" ]] || exit 78
(
  cd "$release_root"
  sha256sum -c SHA256SUMS >/dev/null
  [[ $(find auth business -type f | wc -l) -eq 29 ]]
)

[[ ! -e $rollback_root ]] || { echo 'rollback staging already exists' >&2; exit 73; }
install -d -m 0700 "$rollback_root/auth/app/Services" "$rollback_root/auth/app/Controllers/Api" "$rollback_root/auth/routes" "$rollback_root/business/app/Config" "$rollback_root/business/routes"
cp -p "$auth_root/app/Services/SubscriptionService.php" "$rollback_root/auth/app/Services/SubscriptionService.php"
cp -p "$auth_root/app/Controllers/Api/SubscriptionController.php" "$rollback_root/auth/app/Controllers/Api/SubscriptionController.php"
cp -p "$auth_root/routes/web.php" "$rollback_root/auth/routes/web.php"
cp -p "$business_root/app/Config/constants.php" "$rollback_root/business/app/Config/constants.php"
cp -p "$business_root/routes/core.php" "$rollback_root/business/routes/core.php"
cp -p "$business_root/routes/web.php" "$rollback_root/business/routes/web.php"
(
  cd "$rollback_root"
  find auth business -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  chmod 0600 SHA256SUMS
)

activate_file() {
  local source=$1 destination=$2
  local parent temporary expected actual
  parent=$(dirname "$destination")
  temporary=$destination.stripe-$release_id.tmp
  [[ -f $source && ! -L $source && ! -e $temporary ]] || exit 73
  install -d -m 0755 "$parent"
  chown azmigran:azmigran "$parent"
  install -m 0644 "$source" "$temporary"
  chown azmigran:azmigran "$temporary"
  php -l "$temporary" >/dev/null
  expected=$(sha256sum "$source" | awk '{print $1}')
  actual=$(sha256sum "$temporary" | awk '{print $1}')
  [[ $actual == "$expected" ]] || exit 74
  mv "$temporary" "$destination"
  [[ $(stat -c %U:%G:%a "$destination") == azmigran:azmigran:644 ]] || exit 78
}

readonly -a auth_code=(
  app/Services/PaidPlanPricePolicy.php
  app/Services/PaidPlanService.php
  app/Services/StripeCatalogue.php
  app/Services/StripeCatalogueClient.php
  app/Services/StripeCheckoutClient.php
  app/Services/StripeSandboxFeature.php
  app/Services/SubscriptionCheckoutHandoffService.php
  app/Services/BillingAdminRequestVerifier.php
  app/Services/BillingCheckoutRequestVerifier.php
  app/Models/PaidPlan.php
  app/Models/PaidPlanPriceChange.php
  app/Models/SubscriptionCheckoutHandoff.php
  app/Controllers/Api/AdminSubscriptionPlanController.php
  app/Controllers/Api/InternalSubscriptionCheckoutController.php
)
for relative in "${auth_code[@]}"; do
  activate_file "$release_root/auth/$relative" "$auth_root/$relative"
done

readonly -a business_code=(
  app/Services/BillingAdminClient.php
  app/Services/SubscriptionCheckoutClient.php
  app/Controllers/SubscriptionPlanAdminController.php
  app/Controllers/SubscriptionCheckoutController.php
  app/Views/admin/subscription-plan/index.php
  app/Views/subscriptions/checkout-result.php
  app/Views/subscriptions/simple-result.php
)
for relative in "${business_code[@]}"; do
  activate_file "$release_root/business/$relative" "$business_root/$relative"
done

activate_file "$release_root/auth/database/migrations/20261106153000_create_paid_plan_configuration.php" "$auth_root/database/migrations/20261106153000_create_paid_plan_configuration.php"
activate_file "$release_root/auth/database/migrations/20261106154500_create_subscription_checkout_handoffs.php" "$auth_root/database/migrations/20261106154500_create_subscription_checkout_handoffs.php"

php "$auth_root/vendor/bin/phinx" migrate -c "$auth_root/phinx.php" -e production -t 20261106154500

activate_file "$release_root/auth/app/Services/SubscriptionService.php" "$auth_root/app/Services/SubscriptionService.php"
activate_file "$release_root/auth/app/Controllers/Api/SubscriptionController.php" "$auth_root/app/Controllers/Api/SubscriptionController.php"
activate_file "$release_root/business/app/Config/constants.php" "$business_root/app/Config/constants.php"
activate_file "$release_root/auth/routes/web.php" "$auth_root/routes/web.php"
activate_file "$release_root/business/routes/core.php" "$business_root/routes/core.php"
activate_file "$release_root/business/routes/web.php" "$business_root/routes/web.php"

printf 'release_files=29\nmigrations=20261106153000,20261106154500\nactivation=complete\n'
