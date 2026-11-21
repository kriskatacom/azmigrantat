<?php

declare(strict_types=1);

$authRoot = '/home/azmigran/users.azmigrantat.com';
$businessRoot = '/home/azmigran/business.azmigrantat.com';
$authRaw = file_get_contents($authRoot . '/.env');
$businessRaw = file_get_contents($businessRoot . '/.env');
if (!is_string($authRaw) || !is_string($businessRaw)) {
    throw new RuntimeException('Environment unavailable.');
}
$envValue = static function (string $contents, string $key): ?string {
    if (preg_match_all('/^' . preg_quote($key, '/') . '=(.*)$/m', $contents, $matches) !== 1) {
        return null;
    }
    $value = trim((string) $matches[1][0]);
    if (strlen($value) >= 2
        && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))) {
        $value = substr($value, 1, -1);
    }
    return $value;
};
$auth = static fn (string $key): ?string => $envValue($authRaw, $key);
$business = static fn (string $key): ?string => $envValue($businessRaw, $key);
$assert = static function (bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
};

$assert($auth('PAYMENTS_ENABLED') === 'false', 'Real payments are not disabled.');
$assert($auth('STRIPE_SANDBOX_ENABLED') === 'false', 'Sandbox must remain disabled before provider configuration.');
$assert($auth('STRIPE_TEST_SECRET_KEY') === '', 'Stripe test key must still be empty.');
$assert($auth('STRIPE_TEST_WEBHOOK_SECRET') === '', 'Stripe webhook secret must still be empty.');
foreach (['BILLING_ADMIN_SHARED_SECRET', 'BILLING_CHECKOUT_SHARED_SECRET'] as $key) {
    $authValue = (string) $auth($key);
    $businessValue = (string) $business($key);
    $assert((bool) preg_match('/^[a-f0-9]{64}$/', $authValue), "Invalid {$key}.");
    $assert(hash_equals($authValue, $businessValue), "Mismatched {$key}.");
}
$assert((fileperms($authRoot . '/.env') & 0777) === 0600, 'Auth env mode mismatch.');
$assert((fileperms($businessRoot . '/.env') & 0777) === 0600, 'Business env mode mismatch.');

$authRoutes = file_get_contents($authRoot . '/routes/web.php');
$businessRoutes = file_get_contents($businessRoot . '/routes/web.php');
$businessCore = file_get_contents($businessRoot . '/routes/core.php');
$assert(substr_count((string) $authRoutes, '/api/internal/subscription-checkout/start') === 1, 'Auth checkout route mismatch.');
$assert(substr_count((string) $authRoutes, '/api/admin/paid-plan') === 2, 'Auth admin route mismatch.');
$assert(substr_count((string) $businessRoutes, '/subscriptions/start') === 1, 'Business start route mismatch.');
$assert(substr_count((string) $businessRoutes, '/subscriptions/status') === 1, 'Business status route mismatch.');
$assert(substr_count((string) $businessCore, '/admin/subscription-plan') === 2, 'Business admin route mismatch.');

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $auth('DB_HOST'), $auth('DB_PORT') ?: '3306', $auth('DB_NAME')),
    (string) $auth('DB_USER'),
    (string) $auth('DB_PASS'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
foreach (['paid_plans', 'paid_plan_price_changes', 'subscription_checkout_handoffs', 'subscription_renewal_changes'] as $table) {
    $statement = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $statement->execute([$table]);
    $assert((int) $statement->fetchColumn() === 1, "Missing {$table}.");
}
$ledger = (string) $pdo->query('SELECT version FROM phinxlog ORDER BY version DESC LIMIT 1')->fetchColumn();
$assert($ledger === '20261106213000', 'Migration ledger mismatch.');
$statement = $pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');
foreach ([
    ['paid_plans', 'interval_count'],
    ['subscriptions', 'last_stripe_event_created_at'],
    ['subscriptions', 'last_stripe_event_id'],
] as [$table, $column]) {
    $statement->execute([$table, $column]);
    $assert((int) $statement->fetchColumn() === 1, "Missing {$table}.{$column}.");
}
$assert((int) $pdo->query('SELECT COUNT(*) FROM payment_methods')->fetchColumn() === 2, 'Payment method count changed.');
$assert((int) $pdo->query('SELECT COUNT(*) FROM subscriptions')->fetchColumn() === 0, 'Unexpected subscription row.');
$assert((int) $pdo->query('SELECT COUNT(*) FROM billing_events')->fetchColumn() === 0, 'Unexpected billing event.');
$assert((int) $pdo->query('SELECT COUNT(*) FROM paid_plans')->fetchColumn() === 0, 'Unexpected paid plan configuration.');
$assert((int) $pdo->query('SELECT COUNT(*) FROM subscription_checkout_handoffs')->fetchColumn() === 0, 'Unexpected checkout handoff.');
$assert((int) $pdo->query('SELECT COUNT(*) FROM subscription_renewal_changes')->fetchColumn() === 0, 'Unexpected renewal change.');

echo "production_probe=pass\nreal_payments=false\nsandbox=false\nshared_secrets=matched\nledger=20261106213000\npayment_methods=2\nsubscriptions=0\nbilling_events=0\nrenewal_changes=0\n";
