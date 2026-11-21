<?php

declare(strict_types=1);

const ROOT = '/home/azmigran/users.azmigrantat.com';
require ROOT . '/vendor/autoload.php';
define('BASE_PATH', ROOT);
App\Core\App::bootstrap();

if (($_ENV['PAYMENTS_ENABLED'] ?? '') !== 'false'
    || ($_ENV['STRIPE_SANDBOX_ENABLED'] ?? '') !== 'true') {
    throw new RuntimeException('Sandbox activation guard mismatch.');
}

$admin = App\Models\User::query()
    ->where('role', App\Models\User::ROLE_ADMIN)
    ->where('is_active', true)
    ->orderBy('id')
    ->first();
if (!$admin) {
    throw new RuntimeException('No active administrator is available for the audit record.');
}

$service = App\Services\PaidPlanService::make();
$current = $service->configured();
if (!$current) {
    $current = $service->changePrice(
        $admin,
        1000,
        'stripe-sandbox-30day-20261106',
        0
    );
}
if ((int) $current->amount_cents !== 1000
    || $current->currency !== 'eur'
    || $current->interval_unit !== 'day'
    || (int) $current->interval_count !== 30
    || $current->stripe_mode !== 'test') {
    throw new RuntimeException('Paid plan configuration mismatch.');
}
if (!(bool) $current->is_active) {
    $current = $service->setActive($admin, true, (int) $current->version);
}

$public = $service->publicData($current);
if (($public['configured'] ?? false) !== true || ($public['is_active'] ?? false) !== true) {
    throw new RuntimeException('Paid plan did not become available.');
}

printf(
    "plan=paid\namount_cents=%d\ncurrency=%s\ninterval=%s\ninterval_count=%d\nactive=true\nconfigured=true\nstripe_product=%s\nstripe_price=%s\n",
    (int) $current->amount_cents,
    $current->currency,
    $current->interval_unit,
    (int) $current->interval_count,
    $current->stripe_product_id,
    $current->stripe_price_id
);
