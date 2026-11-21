#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly release_id=20261106T194559Z
readonly release_root=/home/azmigran/backups/google-play-release-staging/stripe-30day-release-$release_id
readonly rollback_root=/home/azmigran/backups/google-play-release-staging/stripe-30day-rollback-$release_id
readonly auth_root=/home/azmigran/users.azmigrantat.com
readonly business_root=/home/azmigran/business.azmigrantat.com

[[ $(id -un) == azmigran ]] || exit 77
[[ -f $auth_root/.api-maintenance && ! -L $auth_root/.api-maintenance ]] || { echo 'maintenance required' >&2; exit 65; }
[[ -d $release_root && ! -L $release_root && $(realpath "$release_root") == "$release_root" ]] || exit 78
[[ ! -e $rollback_root ]] || { echo 'rollback target already exists' >&2; exit 73; }
grep -qx 'PAYMENTS_ENABLED=false' "$auth_root/.env" || { echo 'real-payment guard mismatch' >&2; exit 65; }
grep -qx 'STRIPE_SANDBOX_ENABLED=false' "$auth_root/.env" || { echo 'sandbox must be dormant during code deployment' >&2; exit 65; }
(
  cd "$release_root"
  sha256sum -c SHA256SUMS >/dev/null
)

readonly -a auth_files=(
  app/Services/PaidPlanPricePolicy.php
  app/Services/PaidPlanService.php
  app/Services/StripeCatalogue.php
  app/Services/StripeCatalogueClient.php
  app/Services/StripeCheckoutClient.php
  app/Services/StripeSubscriptionClient.php
  app/Services/SubscriptionCheckoutHandoffService.php
  app/Services/SubscriptionRenewalService.php
  app/Services/SubscriptionService.php
  app/Services/PaymentMethodService.php
  app/Models/PaidPlan.php
  app/Models/Subscription.php
  app/Models/SubscriptionRenewalChange.php
  app/Controllers/Api/SubscriptionController.php
  app/Controllers/Api/AdminSubscriptionPlanController.php
  app/Controllers/Api/PaymentMethodController.php
  app/Controllers/SubscriptionWebController.php
  app/Views/subscriptions/index.php
  routes/web.php
  database/migrations/20261106213000_add_subscription_billing_safety.php
)
readonly -a business_files=(
  app/Controllers/SubscriptionPlanAdminController.php
  app/Views/admin/subscription-plan/index.php
)

install -d -m 0700 "$rollback_root/auth" "$rollback_root/business"
: > "$rollback_root/missing.txt"
backup_file() {
  local root=$1 relative=$2 label=$3 source destination
  source=$root/$relative
  destination=$rollback_root/$label/$relative
  if [[ -e $source ]]; then
    [[ -f $source && ! -L $source ]] || exit 78
    install -d -m 0700 "$(dirname "$destination")"
    cp -p "$source" "$destination"
  else
    printf '%s/%s\n' "$label" "$relative" >> "$rollback_root/missing.txt"
  fi
}
for relative in "${auth_files[@]}"; do backup_file "$auth_root" "$relative" auth; done
for relative in "${business_files[@]}"; do backup_file "$business_root" "$relative" business; done
(
  cd "$rollback_root"
  find auth business -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  sha256sum missing.txt >> SHA256SUMS
)
chmod 0600 "$rollback_root/SHA256SUMS" "$rollback_root/missing.txt"

for relative in "${auth_files[@]}"; do php -l "$release_root/auth/$relative" >/dev/null; done
for relative in "${business_files[@]}"; do php -l "$release_root/business/$relative" >/dev/null; done

activate_file() {
  local source=$1 destination=$2 parent temporary expected actual
  parent=$(dirname "$destination")
  temporary=$destination.stripe-$release_id.tmp
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

# Install the additive migration and new classes while old routes/code remain under maintenance.
activate_file "$release_root/auth/database/migrations/20261106213000_add_subscription_billing_safety.php" "$auth_root/database/migrations/20261106213000_add_subscription_billing_safety.php"
for relative in app/Services/StripeSubscriptionClient.php app/Services/SubscriptionRenewalService.php app/Models/SubscriptionRenewalChange.php; do
  activate_file "$release_root/auth/$relative" "$auth_root/$relative"
done
php "$auth_root/vendor/bin/phinx" migrate -c "$auth_root/phinx.php" -e production -t 20261106213000

for relative in "${auth_files[@]}"; do
  case $relative in
    database/migrations/20261106213000_add_subscription_billing_safety.php|app/Services/StripeSubscriptionClient.php|app/Services/SubscriptionRenewalService.php|app/Models/SubscriptionRenewalChange.php) continue ;;
  esac
  activate_file "$release_root/auth/$relative" "$auth_root/$relative"
done
for relative in "${business_files[@]}"; do
  activate_file "$release_root/business/$relative" "$business_root/$relative"
done

ledger=$(php "$auth_root/vendor/bin/phinx" status -c "$auth_root/phinx.php" -e production | awk '$1=="up"{v=$2} END{print v}')
[[ $ledger == 20261106213000 ]] || { echo 'migration ledger mismatch' >&2; exit 65; }
printf 'release=%s\nledger=%s\nrollback=%s\nmaintenance=on\n' "$release_id" "$ledger" "$rollback_root"
