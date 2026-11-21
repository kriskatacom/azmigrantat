<?php

declare(strict_types=1);

const ROOT = '/home/azmigran/users.azmigrantat.com';
require ROOT . '/vendor/autoload.php';
define('BASE_PATH', ROOT);
App\Core\App::bootstrap();

$assert = static function (bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
};

$assert(($_ENV['PAYMENTS_ENABLED'] ?? '') === 'false', 'Real payments are not disabled.');
$assert(($_ENV['STRIPE_SANDBOX_ENABLED'] ?? '') === 'true', 'Sandbox is not enabled.');
$assert(str_starts_with((string) ($_ENV['STRIPE_TEST_SECRET_KEY'] ?? ''), 'rk_test_'), 'Restricted key mismatch.');
$assert(str_starts_with((string) ($_ENV['STRIPE_TEST_WEBHOOK_SECRET'] ?? ''), 'whsec_'), 'Webhook secret mismatch.');
$assert(($_ENV['STRIPE_SANDBOX_ALLOWED_EMAILS'] ?? '') === 'techsolutionbg@gmail.com', 'Allowlist mismatch.');

$plan = App\Models\PaidPlan::query()->where('plan_key', 'paid')->first();
$assert($plan !== null, 'Paid plan is missing.');
$assert((bool) $plan->is_active, 'Paid plan is inactive.');
$assert((int) $plan->amount_cents === 1000, 'Paid plan amount mismatch.');
$assert($plan->currency === 'eur', 'Paid plan currency mismatch.');
$assert($plan->interval_unit === 'day' && (int) $plan->interval_count === 30, 'Paid plan interval mismatch.');
$assert($plan->stripe_mode === 'test', 'Paid plan mode mismatch.');
$assert(str_starts_with((string) $plan->stripe_product_id, 'prod_'), 'Stripe product mismatch.');
$assert(str_starts_with((string) $plan->stripe_price_id, 'price_'), 'Stripe price mismatch.');

$providerAccount = (new App\Services\StripeCatalogueClient())->account();
$assert(($providerAccount['livemode'] ?? true) === false, 'Provider returned live mode.');
$assert(($providerAccount['account_id'] ?? '') === $plan->stripe_account_id, 'Stripe account mismatch.');

$plans = (new App\Services\SubscriptionService())->plans();
$assert(($plans['paid']['configured'] ?? false) === true, 'Public paid plan is not configured.');
$assert(($plans['paid']['active'] ?? false) === true, 'Public paid plan is not active.');

echo "sandbox_probe=pass\nreal_payments=false\nplan=paid\nprice_eur=10.00\nperiod_days=30\nactive=true\nallowlist=techsolutionbg@gmail.com\n";
