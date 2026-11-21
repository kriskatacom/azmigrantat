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
$assert(($_ENV['STRIPE_SANDBOX_ENABLED'] ?? '') === 'true', 'Stripe Sandbox is not enabled.');

$subscription = App\Models\Subscription::query()
    ->where('plan', App\Services\PaidPlanService::PLAN_KEY)
    ->latest('id')
    ->first();
$assert($subscription !== null, 'No paid Sandbox subscription is available for the read probe.');

$provider = (new App\Services\StripeSubscriptionClient())->retrieve(
    (string) $subscription->stripe_subscription_id
);
$assert(($provider['livemode'] ?? true) === false, 'Provider returned live mode.');
$assert(($provider['id'] ?? '') === $subscription->stripe_subscription_id, 'Subscription identity mismatch.');

printf(
    "subscription_read_probe=pass\nprovider_status=%s\ncancel_at_period_end=%s\n",
    (string) ($provider['status'] ?? 'unknown'),
    ($provider['cancel_at_period_end'] ?? false) ? 'true' : 'false'
);
