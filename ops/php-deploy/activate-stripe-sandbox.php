<?php

declare(strict_types=1);

const ROOT = '/home/azmigran/users.azmigrantat.com';
const ENV_FILE = ROOT . '/.env';
const MAINTENANCE_FILE = ROOT . '/.api-maintenance';
const KEY_FILE = '/home/azmigran/backups/google-play-release-staging/azmigrantat-stripe-rk-test.secret';
const WEBHOOK_FILE = '/home/azmigran/backups/google-play-release-staging/azmigrantat-stripe-webhook-test.secret';
const BACKUP_FILE = '/home/azmigran/backups/google-play-release-staging/auth-env-before-stripe-sandbox-20261106T202835Z';

if (!is_file(MAINTENANCE_FILE) || is_link(MAINTENANCE_FILE)) {
    throw new RuntimeException('Maintenance mode is required.');
}
if (!is_file(KEY_FILE) || !is_file(WEBHOOK_FILE) || is_link(KEY_FILE) || is_link(WEBHOOK_FILE)) {
    throw new RuntimeException('Secret staging files are unavailable.');
}
if (file_exists(BACKUP_FILE)) {
    throw new RuntimeException('Environment backup already exists.');
}

$key = trim((string) file_get_contents(KEY_FILE));
$webhook = trim((string) file_get_contents(WEBHOOK_FILE));
if (!preg_match('/^rk_test_[A-Za-z0-9]+$/', $key)) {
    throw new RuntimeException('Restricted test key format mismatch.');
}
if (!preg_match('/^whsec_\S{20,}$/', $webhook)) {
    throw new RuntimeException('Webhook signing secret format mismatch.');
}

$before = file_get_contents(ENV_FILE);
if (!is_string($before) || str_contains($before, "\0") || is_link(ENV_FILE)) {
    throw new RuntimeException('Environment file unavailable.');
}

$expected = [
    'PAYMENTS_ENABLED' => 'false',
    'STRIPE_TEST_SECRET_KEY' => '',
    'STRIPE_TEST_WEBHOOK_SECRET' => '',
    'STRIPE_SANDBOX_ENABLED' => 'false',
    'STRIPE_SANDBOX_ALLOWED_EMAILS' => '',
];
$next = $before;
foreach ($expected as $name => $value) {
    if (preg_match_all('/^' . preg_quote($name, '/') . '=(.*)$/m', $next, $matches) !== 1
        || trim((string) $matches[1][0]) !== $value) {
        throw new RuntimeException("Environment guard mismatch: {$name}");
    }
}

$values = [
    'STRIPE_TEST_SECRET_KEY' => $key,
    'STRIPE_TEST_WEBHOOK_SECRET' => $webhook,
    'STRIPE_SANDBOX_ENABLED' => 'true',
    'STRIPE_SANDBOX_ALLOWED_EMAILS' => 'techsolutionbg@gmail.com',
];
foreach ($values as $name => $value) {
    $count = 0;
    $next = preg_replace(
        '/^' . preg_quote($name, '/') . '=.*$/m',
        $name . '=' . $value,
        $next,
        1,
        $count
    );
    if (!is_string($next) || $count !== 1) {
        throw new RuntimeException("Environment update failed: {$name}");
    }
}

if (!copy(ENV_FILE, BACKUP_FILE)) {
    throw new RuntimeException('Environment backup failed.');
}
chmod(BACKUP_FILE, 0600);

$temporary = ENV_FILE . '.stripe-sandbox.tmp';
if (file_exists($temporary)) {
    throw new RuntimeException('Environment temporary file already exists.');
}
if (file_put_contents($temporary, $next, LOCK_EX) === false) {
    throw new RuntimeException('Environment temporary write failed.');
}
chmod($temporary, 0600);
chown($temporary, fileowner(ENV_FILE));
chgrp($temporary, filegroup(ENV_FILE));

$prepared = (string) file_get_contents($temporary);
foreach ($values as $name => $value) {
    if (preg_match_all('/^' . preg_quote($name, '/') . '=' . preg_quote($value, '/') . '$/m', $prepared) !== 1) {
        throw new RuntimeException("Prepared environment verification failed: {$name}");
    }
}
if (!preg_match('/^PAYMENTS_ENABLED=false$/m', $prepared)) {
    throw new RuntimeException('Real-payment guard changed.');
}
if (!rename($temporary, ENV_FILE)) {
    throw new RuntimeException('Atomic environment activation failed.');
}
chmod(ENV_FILE, 0600);

$key = str_repeat('0', strlen($key));
$webhook = str_repeat('0', strlen($webhook));
echo "sandbox_credentials=installed\nsandbox_enabled=true\nreal_payments=false\nallowlist=techsolutionbg@gmail.com\n";
