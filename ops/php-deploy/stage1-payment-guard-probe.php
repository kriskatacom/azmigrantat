<?php

declare(strict_types=1);

const ROOT = '/home/azmigran/users.azmigrantat.com';

if ($argc !== 2 || !in_array($argv[1], ['services', 'card-controller', 'checkout-controller', 'webhook-controller'], true)) {
    fwrite(STDERR, "usage error\n");
    exit(64);
}

require ROOT . '/vendor/autoload.php';
define('BASE_PATH', ROOT);
App\Core\App::bootstrap();

$user = App\Models\User::query()->where('is_active', true)->orderBy('id')->first();
if (!$user) {
    fwrite(STDERR, "no active user available for read-only probe\n");
    exit(65);
}
$GLOBALS['_etome_bearer_user'] = $user;

if (App\Services\PaymentsFeature::isEnabled()) {
    fwrite(STDERR, "payment feature unexpectedly enabled\n");
    exit(1);
}

if ($argv[1] === 'services') {
    $checks = [
        static fn () => (new App\Services\PaymentMethodService())->save($user, '', 1, 2030, null),
        static fn () => (new App\Services\SubscriptionService())->createCheckout($user, 'creator'),
        static fn () => (new App\Services\SubscriptionService())->handleWebhook('', ''),
    ];
    foreach ($checks as $check) {
        try {
            $check();
            fwrite(STDERR, "guard did not reject a service call\n");
            exit(1);
        } catch (RuntimeException $exception) {
            if ($exception->getMessage() !== 'Плащанията не са достъпни в тази версия.') {
                fwrite(STDERR, "unexpected service rejection\n");
                exit(1);
            }
        }
    }
    echo "service_guards=ok\n";
    exit(0);
}

$_SERVER['REQUEST_METHOD'] = 'POST';
register_shutdown_function(static function (): void {
    fwrite(STDERR, 'http_status=' . http_response_code() . "\n");
});

if ($argv[1] === 'card-controller') {
    (new App\Controllers\Api\PaymentMethodController())->store();
}
if ($argv[1] === 'checkout-controller') {
    (new App\Controllers\Api\SubscriptionController())->checkout();
}
(new App\Controllers\Api\SubscriptionController())->webhook();
