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
$assert(is_file(ROOT . '/.api-maintenance'), 'Maintenance guard is not active during the probe.');
$assert(substr_count((string) file_get_contents(ROOT . '/routes/web.php'), '/api/mobile/subscription/cancel') === 1, 'Cancel route mismatch.');

$pdo = Illuminate\Database\Capsule\Manager::connection()->getPdo();
$ledger = (string) $pdo->query('SELECT version FROM phinxlog ORDER BY version DESC LIMIT 1')->fetchColumn();
$assert($ledger === '20261106231500', 'Migration ledger mismatch.');
$statement = $pdo->prepare('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? ORDER BY ORDINAL_POSITION');
$statement->execute(['subscription_cancellation_requests']);
$columns = $statement->fetchAll(PDO::FETCH_COLUMN);
$assert($columns === [
    'id',
    'request_id',
    'user_id',
    'subscription_id',
    'stripe_subscription_id',
    'status',
    'error_code',
    'created_at',
    'updated_at',
], 'Cancellation request schema mismatch.');
$cancellationRows = (int) $pdo->query('SELECT COUNT(*) FROM subscription_cancellation_requests')->fetchColumn();
$assert($cancellationRows === 0, 'Cancellation request table changed before activation.');

$plan = App\Models\PaidPlan::query()->where('plan_key', 'paid')->first();
$assert($plan !== null && (bool) $plan->is_active, 'Paid plan is not active.');
$assert((int) $plan->amount_cents === 1000 && $plan->currency === 'eur', 'Paid plan amount mismatch.');
$assert($plan->interval_unit === 'day' && (int) $plan->interval_count === 30, 'Paid plan interval mismatch.');

printf(
    "immediate_downgrade_probe=pass\nledger=%s\ncolumns=%d\ncancellation_requests=%d\nsubscriptions=%d\nbilling_events=%d\nreal_payments=false\nsandbox=true\n",
    $ledger,
    count($columns),
    $cancellationRows,
    (int) $pdo->query('SELECT COUNT(*) FROM subscriptions')->fetchColumn(),
    (int) $pdo->query('SELECT COUNT(*) FROM billing_events')->fetchColumn(),
);
