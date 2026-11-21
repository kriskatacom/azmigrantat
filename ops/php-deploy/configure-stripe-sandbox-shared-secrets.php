<?php

declare(strict_types=1);

$authEnv = '/home/azmigran/users.azmigrantat.com/.env';
$businessEnv = '/home/azmigran/business.azmigrantat.com/.env';
$maintenance = '/home/azmigran/users.azmigrantat.com/.api-maintenance';
if (get_current_user() === '' || !is_file($maintenance)) {
    fwrite(STDERR, "maintenance required\n");
    exit(65);
}

function readEnv(string $path): string
{
    if (!is_file($path) || is_link($path) || realpath(dirname($path)) !== dirname($path)) {
        throw new RuntimeException('Environment path mismatch.');
    }
    $contents = file_get_contents($path);
    if ($contents === false || str_contains($contents, "\0")) {
        throw new RuntimeException('Environment file unavailable.');
    }
    return $contents;
}

function countKey(string $contents, string $key): int
{
    return preg_match_all('/^' . preg_quote($key, '/') . '=/m', $contents);
}

function prepareEnv(string $path, string $contents, array $values): string
{
    foreach ($values as $key => $_) {
        if (!preg_match('/^[A-Z0-9_]+$/', $key) || countKey($contents, $key) !== 0) {
            throw new RuntimeException("Environment key already exists or is invalid: {$key}");
        }
    }
    $suffix = str_ends_with($contents, "\n") ? '' : "\n";
    $suffix .= "\n# Stripe Sandbox subscription module (test-only)\n";
    foreach ($values as $key => $value) {
        $suffix .= $key . '=' . $value . "\n";
    }

    $temporary = $path . '.stripe-config.tmp';
    if (file_exists($temporary)) {
        throw new RuntimeException('Temporary environment file already exists.');
    }
    if (file_put_contents($temporary, $contents . $suffix, LOCK_EX) === false) {
        throw new RuntimeException('Environment temporary write failed.');
    }
    chmod($temporary, 0600);
    chown($temporary, fileowner($path));
    chgrp($temporary, filegroup($path));
    return $temporary;
}

function verifyPrepared(string $path, array $values): void
{
    $contents = readEnv($path);
    foreach ($values as $key => $value) {
        if (countKey($contents, $key) !== 1
            || !preg_match('/^' . preg_quote($key, '/') . '=' . preg_quote($value, '/') . '$/m', $contents)) {
            throw new RuntimeException("Prepared environment verification failed: {$key}");
        }
    }
}

$authBefore = readEnv($authEnv);
$businessBefore = readEnv($businessEnv);
if (countKey($authBefore, 'PAYMENTS_ENABLED') !== 1
    || !preg_match('/^PAYMENTS_ENABLED=false$/m', $authBefore)) {
    throw new RuntimeException('Real-payment guard is not exactly false.');
}
$businessConfig = parse_ini_string($businessBefore, false, INI_SCANNER_RAW);
if (!is_array($businessConfig)
    || rtrim((string) ($businessConfig['AUTH_SERVER_URL'] ?? ''), '/') !== 'https://users.azmigrantat.com') {
    throw new RuntimeException('Business auth server identity mismatch.');
}

$adminSecret = bin2hex(random_bytes(32));
$checkoutSecret = bin2hex(random_bytes(32));
$authValues = [
    'STRIPE_TEST_SECRET_KEY' => '',
    'STRIPE_TEST_WEBHOOK_SECRET' => '',
    'STRIPE_SANDBOX_ENABLED' => 'false',
    'STRIPE_SANDBOX_ALLOWED_EMAILS' => '',
    'BILLING_ADMIN_SHARED_SECRET' => $adminSecret,
    'BILLING_CHECKOUT_SHARED_SECRET' => $checkoutSecret,
    'BUSINESS_PUBLIC_URL' => 'https://business.azmigrantat.com',
];
$businessValues = [
    'BILLING_ADMIN_SHARED_SECRET' => $adminSecret,
    'BILLING_CHECKOUT_SHARED_SECRET' => $checkoutSecret,
];

$authTemporary = prepareEnv($authEnv, $authBefore, $authValues);
$businessTemporary = prepareEnv($businessEnv, $businessBefore, $businessValues);
verifyPrepared($authTemporary, $authValues);
verifyPrepared($businessTemporary, $businessValues);
if (!rename($authTemporary, $authEnv) || !rename($businessTemporary, $businessEnv)) {
    throw new RuntimeException('Atomic environment activation failed.');
}
chmod($authEnv, 0600);
chmod($businessEnv, 0600);
verifyPrepared($authEnv, $authValues);
verifyPrepared($businessEnv, $businessValues);

$adminSecret = str_repeat("0", strlen($adminSecret));
$checkoutSecret = str_repeat("0", strlen($checkoutSecret));
echo "shared_secrets=installed\nstripe_test_credentials=empty\nsandbox_enabled=false\npayments_enabled=false\n";
